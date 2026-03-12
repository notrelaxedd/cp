"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  gradeId: string;
  currentScore: number;
  maxScore: number;
  currentLetterGrade: string;
  currentNotes: string;
  isReviewed: boolean;
  assignmentId: string;
}

const LETTER_GRADES = ["A", "B", "C", "D", "F"];

export default function TeacherOverrideForm({
  gradeId,
  currentScore,
  maxScore,
  currentLetterGrade,
  currentNotes,
  isReviewed,
  assignmentId,
}: Props) {
  const router = useRouter();
  const [score, setScore] = useState(currentScore.toString());
  const [letterGrade, setLetterGrade] = useState(currentLetterGrade);
  const [notes, setNotes] = useState(currentNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > maxScore) {
      setError(`Score must be between 0 and ${maxScore}`);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/override-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade_id: gradeId,
          score: numScore,
          letter_grade: letterGrade,
          teacher_notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">
        {isReviewed ? "Update Review" : "Teacher Review"}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Adjust the score, change the letter grade, or add notes.
        {!isReviewed && " Approving marks this paper as reviewed."}
      </p>

      <div className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="override-score"
              className="block text-sm font-medium text-gray-700"
            >
              Score (max {maxScore})
            </label>
            <input
              id="override-score"
              type="number"
              min={0}
              max={maxScore}
              step="0.5"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="override-grade"
              className="block text-sm font-medium text-gray-700"
            >
              Letter Grade
            </label>
            <select
              id="override-grade"
              value={letterGrade}
              onChange={(e) => setLetterGrade(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {LETTER_GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="teacher-notes"
            className="block text-sm font-medium text-gray-700"
          >
            Teacher Notes
          </label>
          <textarea
            id="teacher-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional comments or justification for score changes..."
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-600">
            Review saved successfully.
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? "Saving..." : isReviewed ? "Update Review" : "Approve & Save"}
          </button>
          <a
            href={`/dashboard/assignments/${assignmentId}`}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Back to Assignment
          </a>
        </div>
      </div>
    </div>
  );
}
