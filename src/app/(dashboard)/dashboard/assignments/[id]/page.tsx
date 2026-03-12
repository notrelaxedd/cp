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
    .order("created_at", { ascending: true });

  const { data: grades } = await supabase
    .from("grades")
    .select("*")
    .eq("assignment_id", params.id);

  const typedPapers = (papers ?? []) as Paper[];
  const typedGrades = (grades ?? []) as Grade[];
  const gradeMap = new Map(typedGrades.map((g) => [g.paper_id, g]));

  const graded = typedPapers.filter((p) => p.status === "graded").length;
  const pending = typedPapers.filter((p) => p.status === "pending").length;
  const processing = typedPapers.filter((p) => p.status === "processing").length;
  const errors = typedPapers.filter((p) => p.status === "error").length;

  const statusColor = (s: string) => {
    switch (s) {
      case "graded":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "processing":
        return "bg-blue-100 text-blue-700";
      case "error":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
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

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {(assignment as Assignment).title}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            {assignment.rubrics && (
              <span>Rubric: {assignment.rubrics.name}</span>
            )}
            {(assignment as Assignment).grade_level && (
              <>
                <span>&middot;</span>
                <span>{(assignment as Assignment).grade_level}</span>
              </>
            )}
            {(assignment as Assignment).subject && (
              <>
                <span>&middot;</span>
                <span>{(assignment as Assignment).subject}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Total Papers</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {typedPapers.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-green-600">Graded</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{graded}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-yellow-600">Pending</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {pending + processing}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-red-600">Errors</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{errors}</p>
        </div>
      </div>

      {/* Papers list */}
      <div className="mt-8">
        <h3 className="text-base font-semibold text-gray-900">Papers</h3>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {typedPapers.map((paper) => {
                const grade = gradeMap.get(paper.id);
                return (
                  <tr key={paper.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {paper.student_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(paper.status)}`}
                      >
                        {paper.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {grade
                        ? `${grade.score}/${grade.max_score}`
                        : "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {grade?.letter_grade ?? "\u2014"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
