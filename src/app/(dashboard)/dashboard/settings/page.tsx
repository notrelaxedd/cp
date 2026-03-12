"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PLANS, type PlanId } from "@/lib/plans";

interface SubData {
  plan: PlanId;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [sub, setSub] = useState<SubData | null>(null);
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();

      if (profile?.plan) setCurrentPlan(profile.plan as PlanId);

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan, status, current_period_end, cancel_at_period_end")
        .eq("user_id", user.id)
        .single();

      if (subscription) setSub(subscription as SubData);
    }
    load();
  }, [supabase]);

  const handleCheckout = async (planId: PlanId) => {
    setLoading(planId);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setPortalLoading(false);
    }
  };

  const planOrder: PlanId[] = ["free", "pro", "school"];

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900">Settings & Billing</h2>
      <p className="mt-1 text-sm text-gray-600">
        Manage your subscription and plan
      </p>

      {success && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Subscription activated successfully!
        </div>
      )}
      {canceled && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          Checkout was canceled. No changes were made.
        </div>
      )}

      {/* Current Plan */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Current Plan
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              You&apos;re on the{" "}
              <span className="font-medium text-gray-900">
                {PLANS[currentPlan].name}
              </span>{" "}
              plan
              {sub?.status === "active" && sub.current_period_end && (
                <span>
                  {" "}
                  &middot; Renews{" "}
                  {new Date(sub.current_period_end).toLocaleDateString()}
                </span>
              )}
              {sub?.cancel_at_period_end && (
                <span className="text-yellow-600">
                  {" "}
                  &middot; Cancels at end of period
                </span>
              )}
            </p>
          </div>
          {sub?.stripe_customer_id && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {portalLoading ? "Loading..." : "Manage Billing"}
            </button>
          )}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {planOrder.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = currentPlan === planId;
          const isUpgrade =
            planOrder.indexOf(planId) > planOrder.indexOf(currentPlan);

          return (
            <div
              key={planId}
              className={`relative rounded-xl border p-6 shadow-sm ${
                isCurrent
                  ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500"
                  : "border-gray-200 bg-white"
              }`}
            >
              {planId === "pro" && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-medium text-white">
                  Popular
                </span>
              )}
              <h4 className="text-lg font-semibold text-gray-900">
                {plan.name}
              </h4>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">
                  ${plan.price}
                </span>
                {plan.price > 0 && (
                  <span className="text-sm text-gray-500">/mo</span>
                )}
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <span className="block w-full rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-center text-sm font-medium text-blue-700">
                    Current Plan
                  </span>
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleCheckout(planId)}
                    disabled={loading === planId}
                    className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading === planId ? "Loading..." : `Upgrade to ${plan.name}`}
                  </button>
                ) : (
                  <button
                    onClick={handlePortal}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Downgrade
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
