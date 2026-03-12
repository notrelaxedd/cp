import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Paper, Grade, CriterionScore } from "@/types";
import TeacherOverrideForm from "./teacher-override-form";

export default async function PaperDetailPage({
  params,
}: {
  params: { id: string; paperId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Fetch paper
  const { data: paper } = await supabase
    .from("papers")
    .select("*")
    .eq("id", params.paperId)
    .single();

  if (!paper) notFound();
  const typedPaper = paper as Paper;

  // Fetch assignment
  const { data: assignment } = await supabase
    .from("assignments")
    .select("title, rubrics(name, max_score, criteria)")
    .eq("id", params.id)
    .single();

  if (!assignment) notFound();

  // Fetch grade
  const { data: grade } = await supabase
    .from("grades")
    .select("*")
    .eq("paper_id", params.paperId)
    .single();

  const typedGrade = grade as Grade | null;

  const scorePercent = typedGrade
    ? Math.round((typedGrade.score / typedGrade.max_score) * 100)
    : 0;

  const gradeColor = (pct: number) => {
    if (pct >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (pct >= 80) return "text-blue-600 bg-blue-50 border-blue-200";
    if (pct >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (pct >= 60) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const barColor = (score: number, max: number) => {
    const pct = max > 0 ? (score / max) * 100 : 0;
    if (pct >= 90) return "bg-green-500";
    if (pct >= 70) return "bg-yellow-500";
    if (pct >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-700">
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/assignments/${params.id}`}
          className="hover:text-gray-700"
        >
          {assignment.title}
        </Link>
        <span>/</span>
        <span className="text-gray-900">{typedPaper.student_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {typedPaper.student_name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {typedPaper.file_name ?? "No file"}
          </p>
        </div>
        {typedGrade && (
          <div
            className={`rounded-xl border px-5 py-3 text-center ${gradeColor(scorePercent)}`}
          >
            <p className="text-3xl font-bold">{typedGrade.letter_grade}</p>
            <p className="mt-0.5 text-sm font-medium">
              {typedGrade.score}/{typedGrade.max_score}
            </p>
            {typedGrade.original_score !== null &&
              typedGrade.original_score !== typedGrade.score && (
                <p className="mt-0.5 text-xs opacity-60">
                  AI: {typedGrade.original_score} ({typedGrade.original_letter_grade})
                </p>
              )}
          </div>
        )}
      </div>

      {typedGrade ? (
        <div className="mt-8 space-y-6">
          {/* Criteria Scores */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                Score Breakdown
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {typedGrade.criteria_scores.map(
                (cs: CriterionScore, idx: number) => (
                  <div key={idx} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-medium text-gray-900">
                          {cs.name}
                        </h4>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {cs.score}/{cs.max_score}
                      </span>
                    </div>
                    {/* Score bar */}
                    <div className="mt-2 pl-8">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all ${barColor(cs.score, cs.max_score)}`}
                          style={{
                            width: `${cs.max_score > 0 ? (cs.score / cs.max_score) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    {/* Feedback for this criterion */}
                    {cs.feedback && (
                      <p className="mt-2 pl-8 text-sm text-gray-600">
                        {cs.feedback}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Overall Feedback */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">
              Overall Feedback
            </h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {typedGrade.feedback}
            </p>
          </div>

          {/* Teacher Notes (if reviewed) */}
          {typedGrade.reviewed && typedGrade.teacher_notes && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6">
              <h3 className="text-base font-semibold text-green-800">
                Teacher Notes
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-green-700">
                {typedGrade.teacher_notes}
              </p>
            </div>
          )}

          {/* Teacher Override Form */}
          <TeacherOverrideForm
            gradeId={typedGrade.id}
            currentScore={typedGrade.score}
            maxScore={typedGrade.max_score}
            currentLetterGrade={typedGrade.letter_grade ?? ""}
            currentNotes={typedGrade.teacher_notes ?? ""}
            isReviewed={typedGrade.reviewed}
            assignmentId={params.id}
          />
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            This paper has not been graded yet.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Status: {typedPaper.status}
          </p>
        </div>
      )}
    </div>
  );
}
