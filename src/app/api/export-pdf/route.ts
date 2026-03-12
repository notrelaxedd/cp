import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsPDF } from "jspdf";
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

    // Fetch data
    const { data: assignment } = await supabase
      .from("assignments")
      .select("title, subject, grade_level, rubrics(name, max_score, criteria)")
      .eq("id", assignmentId)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rubricRaw = assignment.rubrics as any;
    const rubric = (Array.isArray(rubricRaw) ? rubricRaw[0] : rubricRaw) as {
      name: string;
      max_score: number;
      criteria: { name: string; max_score: number }[];
    } | null;

    // Build PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // ─── Helper functions ───
    let y = 0;

    const checkPage = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = margin;
      }
    };

    const drawLine = () => {
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
    };

    // ─── PAGE 1: Summary ───
    y = margin;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(assignment.title, margin, y);
    y += 10;

    // Metadata
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const meta: string[] = [];
    if (rubric) meta.push(`Rubric: ${rubric.name}`);
    if (assignment.subject) meta.push(`Subject: ${assignment.subject}`);
    if (assignment.grade_level)
      meta.push(`Grade Level: ${assignment.grade_level}`);
    meta.push(`Generated: ${new Date().toLocaleDateString()}`);
    doc.text(meta.join("  |  "), margin, y);
    y += 8;
    doc.setTextColor(0);

    drawLine();
    y += 2;

    // Stats
    const gradedPapers = typedPapers.filter((p) => p.status === "graded");
    const avgScore =
      typedGrades.length > 0
        ? typedGrades.reduce((s, g) => s + g.score, 0) / typedGrades.length
        : 0;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Total Papers: ${typedPapers.length}`, margin, y);
    y += 5;
    doc.text(`Graded: ${gradedPapers.length}`, margin, y);
    y += 5;
    doc.text(
      `Average Score: ${avgScore.toFixed(1)} / ${rubric?.max_score ?? 100}`,
      margin,
      y
    );
    y += 8;

    drawLine();
    y += 2;

    // Summary table header
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Grade Summary", margin, y);
    y += 7;

    // Table header
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 4, contentWidth, 7, "F");
    doc.text("Student", margin + 2, y);
    doc.text("Score", margin + 90, y);
    doc.text("Grade", margin + 120, y);
    doc.text("Status", margin + 145, y);
    y += 6;

    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const paper of typedPapers) {
      checkPage(7);
      const grade = gradeMap.get(paper.id);

      doc.text(
        paper.student_name.length > 40
          ? paper.student_name.slice(0, 40) + "..."
          : paper.student_name,
        margin + 2,
        y
      );
      doc.text(
        grade ? `${grade.score}/${grade.max_score}` : "—",
        margin + 90,
        y
      );
      doc.text(grade?.letter_grade ?? "—", margin + 120, y);
      doc.text(
        grade?.reviewed ? "Reviewed" : paper.status,
        margin + 145,
        y
      );
      y += 5;
    }

    // ─── PER-STUDENT DETAIL PAGES ───
    for (const paper of typedPapers) {
      const grade = gradeMap.get(paper.id);
      if (!grade) continue;

      doc.addPage();
      y = margin;

      // Student header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(paper.student_name, margin, y);
      y += 8;

      // Score pill
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        `${grade.letter_grade}  —  ${grade.score}/${grade.max_score}`,
        margin,
        y
      );
      y += 4;

      if (
        grade.original_score !== null &&
        grade.original_score !== grade.score
      ) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120);
        doc.text(
          `AI original: ${grade.original_score} (${grade.original_letter_grade})`,
          margin,
          y + 4
        );
        doc.setTextColor(0);
        y += 4;
      }
      y += 6;

      drawLine();
      y += 2;

      // Criteria scores
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Score Breakdown", margin, y);
      y += 7;

      for (const cs of grade.criteria_scores as CriterionScore[]) {
        checkPage(20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${cs.name}`, margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(`${cs.score}/${cs.max_score}`, margin + 120, y);
        y += 5;

        if (cs.feedback) {
          doc.setFontSize(9);
          doc.setTextColor(80);
          const lines = doc.splitTextToSize(cs.feedback, contentWidth - 5);
          for (const line of lines) {
            checkPage(5);
            doc.text(line, margin + 3, y);
            y += 4;
          }
          doc.setTextColor(0);
        }
        y += 3;
      }

      // Overall feedback
      if (grade.feedback) {
        checkPage(20);
        drawLine();
        y += 2;

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Overall Feedback", margin, y);
        y += 6;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const fbLines = doc.splitTextToSize(grade.feedback, contentWidth);
        for (const line of fbLines) {
          checkPage(5);
          doc.text(line, margin, y);
          y += 4;
        }
      }

      // Teacher notes
      if (grade.teacher_notes) {
        checkPage(15);
        y += 4;
        drawLine();
        y += 2;

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Teacher Notes", margin, y);
        y += 6;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const noteLines = doc.splitTextToSize(grade.teacher_notes, contentWidth);
        for (const line of noteLines) {
          checkPage(5);
          doc.text(line, margin, y);
          y += 4;
        }
      }
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const safeTitle = assignment.title.replace(/[^a-zA-Z0-9]/g, "_");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}_report.pdf"`,
      },
    });
  } catch (err) {
    console.error("export-pdf error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
