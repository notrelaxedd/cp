import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Assignment, Paper, Grade } from "@/types";

export default async function AssignmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("*, rubrics(name, max_score)")
    .eq("id", params.id)
    .single();

  if (!assignment) notFound();

  const { data: papers } = await supabase
    .from("papers")
    .select("*")
    .eq("assignment_id", params.id)
    .order("student_name", { ascending: true });

  const { data: grades } = await supabase
    .from("grades")
    .select("*")
    .eq("assignment_id", params.id);

  const typedAssignment = assignment as Assignment & {
    rubrics: { name: string; max_score: number } | null;
  };
  const typedPapers = (papers ?? []) as Paper[];
  const typedGrades = (grades ?? []) as Grade[];
  const gradeMap = new Map(typedGrades.map((g) => [g.paper_id, g]));

  const total = typedPapers.length;
  const reviewed = typedGrades.filter((g) => g.reviewed).length;
  const graded = typedPapers.filter((p) => p.status === "graded").length;
  const pending = typedPapers.filter(
    (p) => p.status === "pending" || p.status === "processing"
  ).length;
  const errors = typedPapers.filter((p) => p.status === "error").length;

  const progressPercent = total > 0 ? Math.round((graded / total) * 100) : 0;
  const reviewPercent = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  // Average score
  const gradedScores = typedGrades.filter((g) => g.score != null);
  const avgScore =
    gradedScores.length > 0
      ? gradedScores.reduce((sum, g) => sum + g.score, 0) / gradedScores.length
      : null;

  // Row styling based on review status
  const rowStyle = (paper: Paper) => {
    const grade = gradeMap.get(paper.id);
    if (grade?.reviewed) return "border-l-4 border-l-green-500 bg-green-50/30";
    if (paper.status === "graded") return "border-l-4 border-l-yellow-400 bg-yellow-50/30";
    if (paper.status === "error") return "border-l-4 border-l-red-400 bg-red-50/30";
    return "border-l-4 border-l-gray-200";
  };

  const statusBadge = (paper: Paper) => {
    const grade = gradeMap.get(paper.id);
    if (grade?.reviewed)
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Reviewed
        </span>
      );
    switch (paper.status) {
      case "graded":
        return (
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            Pending Review
          </span>
        );
      case "processing":
        return (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Processing
          </span>
        );
      case "error":
        return (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Error
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            Pending
          </span>
        );
    }
  };

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {typedAssignment.title}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            {typedAssignment.rubrics && (
              <span>Rubric: {typedAssignment.rubrics.name}</span>
            )}
            {typedAssignment.grade_level && (
              <>
                <span>&middot;</span>
                <span>{typedAssignment.grade_level}</span>
              </>
            )}
            {typedAssignment.subject && (
              <>
                <span>&middot;</span>
                <span>{typedAssignment.subject}</span>
              </>
            )}
          </div>
        </div>
        {avgScore !== null && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Class Average</p>
            <p className="text-2xl font-bold text-gray-900">
              {avgScore.toFixed(1)}
              <span className="text-sm font-normal text-gray-400">
                /{typedAssignment.rubrics?.max_score ?? 100}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Progress Bars */}
      <div className="mt-6 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Grading Progress</span>
            <span className="text-gray-500">
              {graded}/{total} papers ({progressPercent}%)
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Review Progress</span>
            <span className="text-gray-500">
              {reviewed}/{total} reviewed ({reviewPercent}%)
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${reviewPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-medium text-green-600">Reviewed</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{reviewed}</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs font-medium text-yellow-600">Awaiting Review</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {graded - reviewed}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">
            Pending / Errors
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {pending}
            {errors > 0 && (
              <span className="text-sm font-normal text-red-500">
                {" "}
                + {errors} err
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
          Reviewed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-yellow-400" />
          Graded / Pending Review
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-gray-200" />
          Not Graded
        </span>
      </div>

      {/* Papers Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Student
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Grade
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {typedPapers.map((paper) => {
              const grade = gradeMap.get(paper.id);
              return (
                <tr key={paper.id} className={rowStyle(paper)}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {paper.student_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {statusBadge(paper)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {grade ? (
                      <span>
                        {grade.score}/{grade.max_score}
                        {grade.original_score !== null &&
                          grade.original_score !== grade.score && (
                            <span className="ml-1 text-xs text-gray-400 line-through">
                              {grade.original_score}
                            </span>
                          )}
                      </span>
                    ) : (
                      "\u2014"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {grade?.letter_grade ?? "\u2014"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {paper.status === "graded" && (
                      <Link
                        href={`/dashboard/assignments/${params.id}/${paper.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        {grade?.reviewed ? "View" : "Review"}
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
