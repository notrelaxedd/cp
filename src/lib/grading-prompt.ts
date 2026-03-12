import type { CriterionDef } from "@/types";

interface GradingPromptParams {
  rubricName: string;
  criteria: CriterionDef[];
  maxScore: number;
  gradeLevel: string | null;
  subject: string | null;
  assignmentTitle: string;
  assignmentDescription: string | null;
  studentName: string;
  paperText: string;
}

export function buildGradingPrompt(params: GradingPromptParams): string {
  const {
    rubricName,
    criteria,
    maxScore,
    gradeLevel,
    subject,
    assignmentTitle,
    assignmentDescription,
    studentName,
    paperText,
  } = params;

  const criteriaBlock = criteria
    .map(
      (c, i) =>
        `  ${i + 1}. "${c.name}" (max ${c.max_score} pts): ${c.description}`
    )
    .join("\n");

  const contextLines: string[] = [];
  if (gradeLevel) contextLines.push(`Grade level: ${gradeLevel}`);
  if (subject) contextLines.push(`Subject: ${subject}`);
  const contextBlock =
    contextLines.length > 0 ? contextLines.join("\n") + "\n" : "";

  return `You are an expert teacher grading a student's paper. Grade fairly and constructively.

${contextBlock}Assignment: "${assignmentTitle}"${assignmentDescription ? `\nDescription: ${assignmentDescription}` : ""}
Student: ${studentName}
Rubric: "${rubricName}" (total ${maxScore} points)

Grading criteria:
${criteriaBlock}

IMPORTANT RULES:
- Score each criterion from 0 up to its max points. NEVER exceed the max for any criterion.
- The total score must equal the sum of all criteria scores.
- The total score must not exceed ${maxScore}.
- Provide specific, constructive feedback for each criterion referencing the student's work.
- Assign a letter grade: A (90-100%), B (80-89%), C (70-79%), D (60-69%), F (below 60%).
- Provide overall feedback summarizing strengths and areas for improvement.
- Adjust expectations to the grade level — be age-appropriate in feedback.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "score": <total numeric score>,
  "max_score": ${maxScore},
  "letter_grade": "<A/B/C/D/F>",
  "feedback": "<overall feedback paragraph>",
  "criteria_scores": [
    {
      "name": "<criterion name — must match exactly>",
      "score": <numeric score>,
      "max_score": <criterion max>,
      "feedback": "<specific feedback for this criterion>"
    }
  ]
}

Here is the student's paper:

---
${paperText}
---`;
}
