import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { grade_id, score, letter_grade, teacher_notes } =
      await request.json();

    if (!grade_id) {
      return NextResponse.json(
        { error: "grade_id is required" },
        { status: 400 }
      );
    }

    // Fetch current grade to preserve original
    const { data: existing, error: fetchErr } = await supabase
      .from("grades")
      .select("score, letter_grade, original_score")
      .eq("id", grade_id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Grade not found" }, { status: 404 });
    }

    // Save original scores on first override
    const updateData: Record<string, unknown> = {
      reviewed: true,
    };

    if (existing.original_score === null) {
      updateData.original_score = existing.score;
      updateData.original_letter_grade = existing.letter_grade;
    }

    if (score !== undefined) updateData.score = score;
    if (letter_grade !== undefined) updateData.letter_grade = letter_grade;
    if (teacher_notes !== undefined) updateData.teacher_notes = teacher_notes;

    const { data: grade, error: updateErr } = await supabase
      .from("grades")
      .update(updateData)
      .eq("id", grade_id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ grade });
  } catch (err) {
    console.error("override-grade error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
