export type PlanId = "free" | "pro" | "school";

export interface PlanDef {
  id: PlanId;
  name: string;
  price: number; // monthly in dollars, 0 = free
  limits: {
    papersPerMonth: number;
    assignmentsPerMonth: number;
    rubricsTotal: number;
    maxBatchSize: number;
    exportCsv: boolean;
    exportPdf: boolean;
    batchGrading: boolean;
  };
  features: string[];
}

// TODO: Add stripePriceId to PlanDef and wire up Stripe checkout when
// payments are re-enabled. Each paid plan will need a corresponding
// Stripe Price ID from the dashboard.

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    limits: {
      papersPerMonth: 15,
      assignmentsPerMonth: 3,
      rubricsTotal: 3,
      maxBatchSize: 3,
      exportCsv: false,
      exportPdf: false,
      batchGrading: true,
    },
    features: [
      "15 papers/month",
      "3 assignments/month",
      "3 rubrics",
      "AI grading",
      "Batch grading (up to 3 papers)",
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
      maxBatchSize: 35,
      exportCsv: true,
      exportPdf: true,
      batchGrading: true,
    },
    features: [
      "200 papers/month",
      "20 assignments/month",
      "50 rubrics",
      "Batch grading (up to 35 papers)",
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
      maxBatchSize: 150,
      exportCsv: true,
      exportPdf: true,
      batchGrading: true,
    },
    features: [
      "Unlimited papers",
      "Unlimited assignments",
      "Unlimited rubrics",
      "Batch grading (up to 150 papers)",
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
