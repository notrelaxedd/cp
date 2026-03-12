"use client";

import Link from "next/link";

interface PlanGateProps {
  children: React.ReactNode;
  allowed: boolean;
  featureName: string;
  currentPlan: string;
}

export default function PlanGate({
  children,
  allowed,
  featureName,
  currentPlan,
}: PlanGateProps) {
  if (allowed) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-40 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-4 text-center shadow-lg">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">
            {featureName} requires an upgrade
          </p>
          <p className="mt-1 text-xs text-gray-500">
            You&apos;re on the {currentPlan} plan
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
