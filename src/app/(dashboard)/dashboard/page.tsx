import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      <p className="mt-2 text-gray-600">
        Welcome back, {user?.user_metadata?.full_name || user?.email}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Assignments</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Papers Graded</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Rubrics</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
        </div>
      </div>
    </div>
  );
}
