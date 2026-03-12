export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "teacher" | "admin";
  created_at: string;
  updated_at: string;
}

export interface Rubric {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  criteria: CriterionDef[];
  max_score: number;
  created_at: string;
  updated_at: string;
}

export interface CriterionDef {
  name: string;
  description: string;
  max_score: number;
}

export interface Assignment {
  id: string;
  user_id: string;
  rubric_id: string | null;
  title: string;
  description: string | null;
  subject: string | null;
  grade_level: string | null;
  due_date: string | null;
  status: "draft" | "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface Paper {
  id: string;
  assignment_id: string;
  user_id: string;
  student_name: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  extracted_text: string | null;
  status: "pending" | "processing" | "graded" | "error";
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: string;
  paper_id: string;
  assignment_id: string;
  user_id: string;
  score: number;
  max_score: number;
  letter_grade: string | null;
  feedback: string | null;
  criteria_scores: CriterionScore[];
  ai_model: string | null;
  reviewed: boolean;
  teacher_notes: string | null;
  original_score: number | null;
  original_letter_grade: string | null;
  graded_at: string;
  created_at: string;
  updated_at: string;
}

export interface CriterionScore {
  name: string;
  score: number;
  max_score: number;
  feedback: string;
}
