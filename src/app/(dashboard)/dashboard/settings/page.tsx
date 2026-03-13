"use client";

import { PLANS, type PlanId } from "@/lib/plans";

export default function SettingsPage() {
  const planOrder: PlanId[] = ["free", "pro", "school"];

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900">Settings & Billing</h2>
      <p className="mt-1 text-sm text-gray-600">
        Manage your subscription and plan
      </p>

      {/* Coming Soon Banner */}
      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-6 py-4 text-center">
        <p className="text-sm font-medium text-blue-800">
          Paid plans are coming soon. All features are currently free to use!
        </p>
      </div>

      {/* Plan Cards */}
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {planOrder.map((planId) => {
          const plan = PLANS[planId];
          const isFree = planId === "free";

          return (
            <div
              key={planId}
              className={`relative rounded-xl border p-6 shadow-sm ${
                isFree
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
                {isFree ? (
                  <span className="block w-full rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-center text-sm font-medium text-blue-700">
                    Current Plan
                  </span>
                ) : (
                  <span className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-center text-sm font-medium text-gray-400">
                    Coming Soon
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
