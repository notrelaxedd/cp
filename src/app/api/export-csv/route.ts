import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Papa from "papaparse";
import type { Paper, Grade, CriterionScore } from "@/types";

export async function GET(request: Request) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignment_id");
    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignment_id is required" },
        { status: 400 }
      );
    }

    // Fetch assignment
    const { data: assignment } = await supabase
      .from("assignments")
      .select("title, rubrics(criteria)")
      .eq("id", assignmentId)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Fetch papers + grades
    const { data: papers } = await supabase
      .from("papers")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("student_name", { ascending: true });

    const { data: grades } = await supabase
      .from("grades")
      .select("*")
      .eq("assignment_id", assignmentId);

    const typedPapers = (papers ?? []) as Paper[];
    const typedGrades = (grades ?? []) as Grade[];
    const gradeMap = new Map(typedGrades.map((g) => [g.paper_id, g]));

    // Get criterion names from rubric
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rubricData = assignment.rubrics as any;
    const criteriaList: { name: string }[] =
      (Array.isArray(rubricData) ? rubricData[0]?.criteria : rubricData?.criteria) ?? [];
    const criteriaNames: string[] = criteriaList.map((c) => c.name);

    // Build CSV rows
    const rows = typedPapers.map((paper) => {
      const grade = gradeMap.get(paper.id);
      const row: Record<string, string | number> = {
        "Student Name": paper.student_name,
        Status: paper.status,
        "Overall Score": grade?.score ?? "",
        "Max Score": grade?.max_score ?? "",
        "Letter Grade": grade?.letter_grade ?? "",
        Reviewed: grade?.reviewed ? "Yes" : "No",
      };

      // Add per-criterion scores
      for (const name of criteriaNames) {
        const cs = grade?.criteria_scores?.find(
          (c: CriterionScore) => c.name === name
        );
        row[`${name} (Score)`] = cs?.score ?? "";
        row[`${name} (Max)`] = cs?.max_score ?? "";
      }

      // Feedback snippet (first 200 chars)
      const feedback = grade?.feedback ?? "";
      row["Feedback"] =
        feedback.length > 200 ? feedback.slice(0, 200) + "..." : feedback;

      if (grade?.teacher_notes) {
        row["Teacher Notes"] = grade.teacher_notes;
      }

      return row;
    });

    const csv = Papa.unparse(rows);
    const safeTitle = assignment.title.replace(/[^a-zA-Z0-9]/g, "_");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}_grades.csv"`,
      },
    });
  } catch (err) {
    console.error("export-csv error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
