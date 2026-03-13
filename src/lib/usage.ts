import { SupabaseClient } from "@supabase/supabase-js";
import { PLANS } from "./plans";

interface UsageResult {
  allowed: boolean;
  current: number;
  limit: number;
  plan: string;
  message?: string;
}

/**
 * Get start of current billing month (1st of current month UTC)
 */
function monthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

// TODO: Re-integrate Stripe here. Once payments are enabled, look up the
// user's plan from the `profiles` table (populated by Stripe webhooks) instead
// of hardcoding the free plan for every user.
const FREE_PLAN = PLANS.free;

/**
 * Check if user can grade more papers this month
 */
export async function checkPaperLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageResult> {
  const limit = FREE_PLAN.limits.papersPerMonth;

  // Count papers graded this month
  const { count } = await supabase
    .from("grades")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart());

  const current = count ?? 0;

  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      plan: FREE_PLAN.id,
      message: `You've reached your monthly limit of ${limit} papers. Paid plans coming soon!`,
    };
  }

  return { allowed: true, current, limit, plan: FREE_PLAN.id };
}

/**
 * Check how many more papers user can grade this month
 */
export async function getRemainingPapers(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const result = await checkPaperLimit(supabase, userId);
  if (result.limit === -1) return Infinity;
  return Math.max(0, result.limit - result.current);
}

/**
 * Check if user can create more assignments this month
 */
export async function checkAssignmentLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageResult> {
  const limit = FREE_PLAN.limits.assignmentsPerMonth;

  const { count } = await supabase
    .from("assignments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart());

  const current = count ?? 0;

  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      plan: FREE_PLAN.id,
      message: `You've reached your monthly limit of ${limit} assignments. Paid plans coming soon!`,
    };
  }

  return { allowed: true, current, limit, plan: FREE_PLAN.id };
}

/**
 * Check if a feature is available on the user's plan.
 * All features are unlocked for now — gate behind Stripe later.
 */
export async function checkFeature(
  _supabase: SupabaseClient,
  _userId: string,
  feature: "exportCsv" | "exportPdf" | "batchGrading"
): Promise<{ allowed: boolean; plan: string }> {
  // TODO: Once Stripe is re-integrated, look up the user's actual plan
  // and check feature access against it.
  return { allowed: FREE_PLAN.limits[feature], plan: FREE_PLAN.id };
}
