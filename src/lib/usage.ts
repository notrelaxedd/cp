import { SupabaseClient } from "@supabase/supabase-js";
import { getPlan } from "./plans";

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

/**
 * Check if user can grade more papers this month
 */
export async function checkPaperLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageResult> {
  // Get user plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = getPlan(profile?.plan);
  const limit = plan.limits.papersPerMonth;

  // Unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1, plan: plan.id };
  }

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
      plan: plan.id,
      message: `You've reached your monthly limit of ${limit} papers on the ${plan.name} plan. Upgrade to grade more.`,
    };
  }

  return { allowed: true, current, limit, plan: plan.id };
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = getPlan(profile?.plan);
  const limit = plan.limits.assignmentsPerMonth;

  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1, plan: plan.id };
  }

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
      plan: plan.id,
      message: `You've reached your monthly limit of ${limit} assignments on the ${plan.name} plan.`,
    };
  }

  return { allowed: true, current, limit, plan: plan.id };
}

/**
 * Check if a feature is available on the user's plan
 */
export async function checkFeature(
  supabase: SupabaseClient,
  userId: string,
  feature: "exportCsv" | "exportPdf" | "batchGrading"
): Promise<{ allowed: boolean; plan: string }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = getPlan(profile?.plan);
  return { allowed: plan.limits[feature], plan: plan.id };
}
