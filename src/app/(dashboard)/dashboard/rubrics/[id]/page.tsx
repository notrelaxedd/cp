import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Rubric } from "@/types";

export default async function RubricDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data, error } = await supabase
    .from("rubrics")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    notFound();
  }

  const rubric = data as Rubric;
  const totalCriteriaScore = rubric.criteria.reduce(
    (sum, c) => sum + c.max_score,
    0
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <Link
          href="/dashboard/rubrics"
          className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; All Rubrics
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{rubric.name}</h2>
            {rubric.description && (
              <p className="mt-1 text-sm text-gray-600">
                {rubric.description}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
            {rubric.max_score} pts
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Grading Criteria
          </h3>
          <p className="text-xs text-gray-500">
            {rubric.criteria.length} criteria &middot; {totalCriteriaScore} total
            points
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {rubric.criteria.map((criterion, index) => (
            <div key={index} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      {index + 1}
                    </span>
                    <h4 className="text-sm font-medium text-gray-900">
                      {criterion.name}
                    </h4>
                  </div>
                  <p className="mt-1 pl-8 text-sm text-gray-600">
                    {criterion.description}
                  </p>
                </div>
                <div className="ml-4 shrink-0 rounded-md bg-gray-50 px-2.5 py-1 text-sm font-medium text-gray-700">
                  {criterion.max_score} pts
                </div>
              </div>

              {/* Score distribution bar */}
              <div className="mt-2 pl-8">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${(criterion.max_score / rubric.max_score) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href={`/dashboard/rubrics/new`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Upload Another
        </Link>
      </div>
    </div>
  );
}
