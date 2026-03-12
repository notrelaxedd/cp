export type PlanId = "free" | "pro" | "school";

export interface PlanDef {
  id: PlanId;
  name: string;
  price: number; // monthly in dollars, 0 = free
  stripePriceId: string | null;
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
    stripePriceId: null,
    limits: {
      papersPerMonth: 20,
      assignmentsPerMonth: 3,
      rubricsTotal: 5,
      exportCsv: false,
      exportPdf: false,
      batchGrading: false,
    },
    features: [
      "20 papers/month",
      "3 assignments/month",
      "5 rubrics",
      "AI grading",
      "Basic feedback",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 9,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
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
    stripePriceId: process.env.STRIPE_SCHOOL_PRICE_ID ?? "",
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
