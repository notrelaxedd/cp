"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FileUpload from "@/components/ui/file-upload";
import type { Rubric } from "@/types";

interface PaperEntry {
  id: string;
  file: File;
  studentName: string;
}

type PageStatus =
  | "idle"
  | "creating"
  | "uploading-papers"
  | "grading"
  | "done"
  | "error";

const GRADE_LEVELS = [
  "Elementary (K-2)",
  "Elementary (3-5)",
  "Middle School (6-8)",
  "High School (9-10)",
  "High School (11-12)",
  "College / University",
];

export default function NewAssignmentPage() {
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [rubricId, setRubricId] = useState("");
  const [requireReview, setRequireReview] = useState(false);

  // Data
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [papers, setPapers] = useState<PaperEntry[]>([]);

  // Status
  const [status, setStatus] = useState<PageStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Load rubrics
  useEffect(() => {
    async function loadRubrics() {
      const { data } = await supabase
        .from("rubrics")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setRubrics(data as Rubric[]);
    }
    loadRubrics();
  }, [supabase]);

  const handlePaperFileSelect = useCallback((file: File) => {
    const nameFromFile = file.name
      .replace(/\.(pdf|docx?)$/i, "")
      .replace(/[_-]/g, " ")
      .trim();

    setPapers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        file,
        studentName: nameFromFile,
      },
    ]);
  }, []);

  const updateStudentName = (id: string, name: string) => {
    setPapers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, studentName: name } : p))
    );
  };

  const removePaper = (id: string) => {
    setPapers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async () => {
    if (!title || !rubricId || papers.length === 0) return;

    setError(null);
    setStatus("creating");

    try {
      // 1. Create assignment
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const { data: assignment, error: assignErr } = await supabase
        .from("assignments")
        .insert({
          user_id: user.id,
          rubric_id: rubricId,
          title,
          description: description || null,
          subject: subject || null,
          grade_level: gradeLevel || null,
          status: "active",
        })
        .select()
        .single();

      if (assignErr || !assignment) {
        throw new Error(assignErr?.message || "Failed to create assignment");
      }

      // 2. Upload papers and extract text
      setStatus("uploading-papers");
      setProgress({ current: 0, total: papers.length });

      for (let i = 0; i < papers.length; i++) {
        const entry = papers[i];
        setProgress({ current: i + 1, total: papers.length });

        const fileBuffer = await entry.file.arrayBuffer();
        const fileExt = entry.file.name.split(".").pop();
        const filePath = `${user.id}/${assignment.id}/${crypto.randomUUID()}.${fileExt}`;

        // Upload to storage
        await supabase.storage
          .from("papers")
          .upload(filePath, fileBuffer, {
            contentType: entry.file.type,
          });

        // Parse file server-side
        const parseForm = new FormData();
        parseForm.append("file", entry.file);

        const parseRes = await fetch("/api/parse-paper-text", {
          method: "POST",
          body: parseForm,
        });

        let extractedText: string | null = null;
        if (parseRes.ok) {
          const parseData = await parseRes.json();
          extractedText = parseData.text;
        }

        // Create paper record
        await supabase.from("papers").insert({
          assignment_id: assignment.id,
          user_id: user.id,
          student_name: entry.studentName,
          file_url: filePath,
          file_name: entry.file.name,
          file_type: entry.file.type,
          extracted_text: extractedText,
          status: extractedText ? "pending" : "error",
        });
      }

      // 3. Start grading if not requiring review
      if (!requireReview) {
        setStatus("grading");
        const gradeRes = await fetch("/api/grade-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignment_id: assignment.id }),
        });

        if (!gradeRes.ok) {
          const err = await gradeRes.json();
          throw new Error(err.error || "Grading failed");
        }
      }

      setStatus("done");
      router.push(`/dashboard/assignments/${assignment.id}`);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const isSubmitting = status !== "idle" && status !== "error" && status !== "done";

  const statusLabel = (() => {
    switch (status) {
      case "creating":
        return "Creating assignment...";
      case "uploading-papers":
        return `Uploading papers (${progress.current}/${progress.total})...`;
      case "grading":
        return "AI is grading papers...";
      default:
        return "Create Assignment & Grade";
    }
  })();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back
        </button>
        <h2 className="text-2xl font-bold text-gray-900">New Assignment</h2>
        <p className="mt-1 text-sm text-gray-600">
          Set up an assignment, upload student papers, and start AI grading.
        </p>
      </div>

      <div className="space-y-6">
        {/* Assignment Details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Assignment Details
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Essay on The Great Gatsby"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Assignment instructions or context..."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-700"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., English Literature"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="gradeLevel"
                  className="block text-sm font-medium text-gray-700"
                >
                  Grade Level
                </label>
                <select
                  id="gradeLevel"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select grade level</option>
                  {GRADE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Rubric Selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Rubric <span className="text-red-500">*</span>
          </h3>
          {rubrics.length === 0 ? (
            <p className="text-sm text-gray-500">
              No rubrics found.{" "}
              <a
                href="/dashboard/rubrics/new"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Upload one first
              </a>
              .
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rubrics.map((rubric) => (
                <button
                  key={rubric.id}
                  type="button"
                  onClick={() => setRubricId(rubric.id)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    rubricId === rubric.id
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">
                    {rubric.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {rubric.criteria.length} criteria &middot; {rubric.max_score}{" "}
                    pts
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Paper Upload */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Student Papers <span className="text-red-500">*</span>
          </h3>

          <FileUpload
            onFileSelect={handlePaperFileSelect}
            disabled={isSubmitting}
            label="Add a paper (PDF or DOCX)"
          />

          {papers.length > 0 && (
            <div className="mt-4 space-y-3">
              {papers.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-gray-500">
                      {entry.file.name}
                    </p>
                    <input
                      type="text"
                      value={entry.studentName}
                      onChange={(e) =>
                        updateStudentName(entry.id, e.target.value)
                      }
                      placeholder="Student name"
                      className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePaper(entry.id)}
                    className="shrink-0 text-gray-400 hover:text-red-500"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Options
          </h3>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={requireReview}
              onChange={(e) => setRequireReview(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Require teacher review before grading
              </p>
              <p className="text-xs text-gray-500">
                Papers will be uploaded but not auto-graded. You can review and
                grade them manually.
              </p>
            </div>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!title || !rubricId || papers.length === 0 || isSubmitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
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
              {statusLabel}
            </span>
          ) : (
            statusLabel
          )}
        </button>
      </div>
    </div>
  );
}
