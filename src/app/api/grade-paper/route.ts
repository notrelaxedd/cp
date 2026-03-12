import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGradingPrompt } from "@/lib/grading-prompt";
import Anthropic from "@anthropic-ai/sdk";
import type { CriterionDef, CriterionScore } from "@/types";

export const maxDuration = 120;

interface GradeResponse {
  score: number;
  max_score: number;
  letter_grade: string;
  feedback: string;
  criteria_scores: CriterionScore[];
}

function validateGradeResponse(
  response: GradeResponse,
  criteria: CriterionDef[],
  maxScore: number
): string | null {
  if (typeof response.score !== "number" || response.score < 0) {
    return "Invalid total score";
  }
  if (response.score > maxScore) {
    return `Total score ${response.score} exceeds rubric max ${maxScore}`;
  }
  if (!Array.isArray(response.criteria_scores)) {
    return "Missing criteria_scores array";
  }
  for (const cs of response.criteria_scores) {
    const def = criteria.find((c) => c.name === cs.name);
    if (def && cs.score > def.max_score) {
      return `Score ${cs.score} for "${cs.name}" exceeds max ${def.max_score}`;
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paper_id } = await request.json();
    if (!paper_id) {
      return NextResponse.json(
        { error: "paper_id is required" },
        { status: 400 }
      );
    }

    // Fetch paper
    const { data: paper, error: paperErr } = await supabase
      .from("papers")
      .select("*")
      .eq("id", paper_id)
      .single();

    if (paperErr || !paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    if (!paper.extracted_text) {
      return NextResponse.json(
        { error: "Paper has no extracted text" },
        { status: 422 }
      );
    }

    // Fetch assignment + rubric
    const { data: assignment, error: assignErr } = await supabase
      .from("assignments")
      .select("*, rubrics(*)")
      .eq("id", paper.assignment_id)
      .single();

    if (assignErr || !assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    const rubric = assignment.rubrics;
    if (!rubric) {
      return NextResponse.json(
        { error: "Assignment has no rubric" },
        { status: 422 }
      );
    }

    // Mark paper as processing
    await supabase
      .from("papers")
      .update({ status: "processing" })
      .eq("id", paper_id);

    // Build prompt and call Claude
    const prompt = buildGradingPrompt({
      rubricName: rubric.name,
      criteria: rubric.criteria as CriterionDef[],
      maxScore: rubric.max_score,
      gradeLevel: assignment.grade_level,
      subject: assignment.subject,
      assignmentTitle: assignment.title,
      assignmentDescription: assignment.description,
      studentName: paper.student_name,
      paperText: paper.extracted_text,
    });

    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let gradeData: GradeResponse;
    try {
      gradeData = JSON.parse(responseText);
    } catch {
      await supabase
        .from("papers")
        .update({ status: "error" })
        .eq("id", paper_id);
      return NextResponse.json(
        { error: "Failed to parse AI grading response" },
        { status: 502 }
      );
    }

    // Validate scores
    const validationError = validateGradeResponse(
      gradeData,
      rubric.criteria as CriterionDef[],
      rubric.max_score
    );
    if (validationError) {
      await supabase
        .from("papers")
        .update({ status: "error" })
        .eq("id", paper_id);
      return NextResponse.json(
        { error: `Validation failed: ${validationError}` },
        { status: 502 }
      );
    }

    // Save grade
    const { data: grade, error: gradeErr } = await supabase
      .from("grades")
      .insert({
        paper_id: paper.id,
        assignment_id: assignment.id,
        user_id: user.id,
        score: gradeData.score,
        max_score: gradeData.max_score,
        letter_grade: gradeData.letter_grade,
        feedback: gradeData.feedback,
        criteria_scores: gradeData.criteria_scores,
        ai_model: "claude-sonnet-4-20250514",
      })
      .select()
      .single();

    if (gradeErr) {
      await supabase
        .from("papers")
        .update({ status: "error" })
        .eq("id", paper_id);
      return NextResponse.json(
        { error: `Failed to save grade: ${gradeErr.message}` },
        { status: 500 }
      );
    }

    // Mark paper as graded
    await supabase
      .from("papers")
      .update({ status: "graded" })
      .eq("id", paper_id);

    return NextResponse.json({ grade });
  } catch (err) {
    console.error("grade-paper error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
