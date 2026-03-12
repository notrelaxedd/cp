"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/ui/file-upload";
import type { Rubric } from "@/types";

type Status = "idle" | "uploading" | "success" | "error";

export default function NewRubricPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setError(null);
    setStatus("idle");
  }, []);

  const handleSubmit = async () => {
    if (!file) return;

    setStatus("uploading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-rubric", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      const rubric = data.rubric as Rubric;
      setStatus("success");
      router.push(`/dashboard/rubrics/${rubric.id}`);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Upload Rubric</h2>
        <p className="mt-1 text-sm text-gray-600">
          Upload a PDF or DOCX rubric and we&apos;ll parse it into structured
          grading criteria using AI.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <FileUpload
          onFileSelect={handleFileSelect}
          disabled={status === "uploading"}
          label="Rubric file"
        />

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || status === "uploading"}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "uploading" ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Parsing rubric...
            </span>
          ) : (
            "Upload & Parse Rubric"
          )}
        </button>
      </div>
    </div>
  );
}
