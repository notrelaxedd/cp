export type PlanId = "free" | "pro" | "school";

export interface PlanDef {
  id: PlanId;
  name: string;
  price: number; // monthly in dollars, 0 = free
  limits: {
    papersPerMonth: number;
    assignmentsPerMonth: number;
    rubricsTotal: number;
    exportCsv: boolean;
    exportPdf: boolean;
    batchGrading: boolean;
  };
  features: string[];
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    limits: {
      papersPerMonth: 15,
      assignmentsPerMonth: 3,
      rubricsTotal: 5,
      exportCsv: true,
      exportPdf: true,
      batchGrading: true,
    },
    features: [
      "15 papers/month",
      "3 assignments/month",
      "5 rubrics",
      "AI grading",
      "Batch grading (1-3 papers)",
      "CSV & PDF export",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 9,
    limits: {
      papersPerMonth: 200,
      assignmentsPerMonth: 20,
      rubricsTotal: 50,
      exportCsv: true,
      exportPdf: true,
      batchGrading: true,
    },
    features: [
      "200 papers/month",
      "20 assignments/month",
      "50 rubrics",
      "AI grading + batch mode",
      "CSV & PDF export",
      "Teacher review tools",
    ],
  },
  school: {
    id: "school",
    name: "School",
    price: 29,
    limits: {
      papersPerMonth: -1, // unlimited
      assignmentsPerMonth: -1,
      rubricsTotal: -1,
      exportCsv: true,
      exportPdf: true,
      batchGrading: true,
    },
    features: [
      "Unlimited papers",
      "Unlimited assignments",
      "Unlimited rubrics",
      "AI grading + batch mode",
      "CSV & PDF export",
      "Teacher review tools",
      "Priority support",
    ],
  },
};

export function getPlan(planId: string | null | undefined): PlanDef {
  if (planId && planId in PLANS) return PLANS[planId as PlanId];
  return PLANS.free;
}
