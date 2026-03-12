import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Rubric } from "@/types";

export default async function RubricsListPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("rubrics")
    .select("*")
    .order("created_at", { ascending: false });

  const rubrics = (data ?? []) as Rubric[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rubrics</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage your grading rubrics
          </p>
        </div>
        <Link
          href="/dashboard/rubrics/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Upload Rubric
        </Link>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load rubrics: {error.message}
        </div>
      )}

      {rubrics.length === 0 && !error ? (
        <div className="mt-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-3 text-sm font-medium text-gray-900">
            No rubrics yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload a PDF or DOCX rubric to get started.
          </p>
          <Link
            href="/dashboard/rubrics/new"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Upload Rubric
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rubrics.map((rubric) => (
            <Link
              key={rubric.id}
              href={`/dashboard/rubrics/${rubric.id}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
                {rubric.name}
              </h3>
              {rubric.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                  {rubric.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                <span>{rubric.criteria.length} criteria</span>
                <span>&middot;</span>
                <span>{rubric.max_score} pts</span>
                <span>&middot;</span>
                <span>
                  {new Date(rubric.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
