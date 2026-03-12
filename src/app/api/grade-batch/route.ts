import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGradingPrompt } from "@/lib/grading-prompt";
import Anthropic from "@anthropic-ai/sdk";
import type { CriterionDef, CriterionScore } from "@/types";

export const maxDuration = 300;

interface GradeResponse {
  score: number;
  max_score: number;
  letter_grade: string;
  feedback: string;
  criteria_scores: CriterionScore[];
}

interface PaperResult {
  paper_id: string;
  student_name: string;
  status: "graded" | "error";
  error?: string;
  grade_id?: string;
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

    const { assignment_id } = await request.json();
    if (!assignment_id) {
      return NextResponse.json(
        { error: "assignment_id is required" },
        { status: 400 }
      );
    }

    // Fetch assignment + rubric
    const { data: assignment, error: assignErr } = await supabase
      .from("assignments")
      .select("*, rubrics(*)")
      .eq("id", assignment_id)
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
        { error: "Assignment has no rubric attached" },
        { status: 422 }
      );
    }

    // Fetch all pending papers for this assignment
    const { data: papers, error: papersErr } = await supabase
      .from("papers")
      .select("*")
      .eq("assignment_id", assignment_id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (papersErr) {
      return NextResponse.json(
        { error: `Failed to fetch papers: ${papersErr.message}` },
        { status: 500 }
      );
    }

    if (!papers || papers.length === 0) {
      return NextResponse.json(
        { error: "No pending papers to grade" },
        { status: 422 }
      );
    }

    const anthropic = new Anthropic();
    const results: PaperResult[] = [];

    // Grade papers sequentially
    for (const paper of papers) {
      const result: PaperResult = {
        paper_id: paper.id,
        student_name: paper.student_name,
        status: "error",
      };

      try {
        if (!paper.extracted_text) {
          result.error = "No extracted text";
          results.push(result);
          continue;
        }

        // Mark as processing
        await supabase
          .from("papers")
          .update({ status: "processing" })
          .eq("id", paper.id);

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
          result.error = "Failed to parse AI response";
          await supabase
            .from("papers")
            .update({ status: "error" })
            .eq("id", paper.id);
          results.push(result);
          continue;
        }

        // Validate scores
        if (gradeData.score > rubric.max_score) {
          gradeData.score = rubric.max_score;
        }
        for (const cs of gradeData.criteria_scores) {
          const def = (rubric.criteria as CriterionDef[]).find(
            (c) => c.name === cs.name
          );
          if (def && cs.score > def.max_score) {
            cs.score = def.max_score;
          }
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
          result.error = gradeErr.message;
          await supabase
            .from("papers")
            .update({ status: "error" })
            .eq("id", paper.id);
        } else {
          result.status = "graded";
          result.grade_id = grade.id;
          await supabase
            .from("papers")
            .update({ status: "graded" })
            .eq("id", paper.id);
        }
      } catch (err) {
        result.error =
          err instanceof Error ? err.message : "Unknown error";
        await supabase
          .from("papers")
          .update({ status: "error" })
          .eq("id", paper.id);
      }

      results.push(result);
    }

    const graded = results.filter((r) => r.status === "graded").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      summary: {
        total: results.length,
        graded,
        errors,
      },
      results,
    });
  } catch (err) {
    console.error("grade-batch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
