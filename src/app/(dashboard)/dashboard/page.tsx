import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Assignment, Grade } from "@/types";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all stats in parallel
  const [
    { count: assignmentCount },
    { count: rubricCount },
    { count: paperCount },
    { count: gradedCount },
    { data: recentGrades },
    { data: recentAssignments },
  ] = await Promise.all([
    supabase
      .from("assignments")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("rubrics")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("papers")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("papers")
      .select("*", { count: "exact", head: true })
      .eq("status", "graded"),
    supabase
      .from("grades")
      .select("*, papers(student_name), assignments(title)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("assignments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Calculate average score
  const { data: allGrades } = await supabase
    .from("grades")
    .select("score, max_score");
  const typedAllGrades = (allGrades ?? []) as Pick<Grade, "score" | "max_score">[];
  const avgPercent =
    typedAllGrades.length > 0
      ? typedAllGrades.reduce(
          (sum, g) => sum + (g.max_score > 0 ? (g.score / g.max_score) * 100 : 0),
          0
        ) / typedAllGrades.length
      : null;

  const typedRecentGrades = (recentGrades ?? []) as (Grade & {
    papers: { student_name: string } | null;
    assignments: { title: string } | null;
  })[];
  const typedRecentAssignments = (recentAssignments ?? []) as Assignment[];

  const letterGradeColor = (g: string | null) => {
    switch (g) {
      case "A":
        return "bg-green-100 text-green-700";
      case "B":
        return "bg-blue-100 text-blue-700";
      case "C":
        return "bg-yellow-100 text-yellow-700";
      case "D":
        return "bg-orange-100 text-orange-700";
      case "F":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
        <Link
          href="/dashboard/assignments/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          New Assignment
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Assignments</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {assignmentCount ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Papers Graded</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {gradedCount ?? 0}
            <span className="ml-1 text-sm font-normal text-gray-400">
              / {paperCount ?? 0}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Average Score</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {avgPercent !== null ? `${avgPercent.toFixed(1)}%` : "\u2014"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Rubrics</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {rubricCount ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Recent Assignments */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              Recent Assignments
            </h3>
            <Link
              href="/dashboard/assignments/new"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {typedRecentAssignments.length === 0 ? (
              <p className="rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-gray-500">
                No assignments yet
              </p>
            ) : (
              typedRecentAssignments.map((a) => (
                <Link
                  key={a.id}
                  href={`/dashboard/assignments/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {a.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {a.subject && `${a.subject} · `}
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.status === "active"
                        ? "bg-green-100 text-green-700"
                        : a.status === "draft"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {a.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Grading Activity */}
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Recent Grading Activity
          </h3>
          <div className="mt-3 space-y-2">
            {typedRecentGrades.length === 0 ? (
              <p className="rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-gray-500">
                No grades yet
              </p>
            ) : (
              typedRecentGrades.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {g.papers?.student_name ?? "Unknown"}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {g.assignments?.title ?? "Unknown assignment"} &middot;{" "}
                      {new Date(g.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      {g.score}/{g.max_score}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${letterGradeColor(g.letter_grade)}`}
                    >
                      {g.letter_grade}
                    </span>
                    {g.reviewed && (
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
