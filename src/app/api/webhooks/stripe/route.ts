import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}


// Use service role client to bypass RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function mapPriceToplan(priceId: string): "pro" | "school" | "free" {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_SCHOOL_PRICE_ID) return "school";
  return "free";
}

async function upsertSubscription(
  subscription: Stripe.Subscription,
  customerId: string
) {
  const supabase = getAdminClient();

  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const plan = mapPriceToplan(priceId);

  // Find user by stripe_customer_id
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!sub) return;

  const status = subscription.status as string;

  await supabase
    .from("subscriptions")
    .update({
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan,
      status:
        status === "active" || status === "trialing"
          ? status
          : status === "past_due"
            ? "past_due"
            : status === "canceled"
              ? "canceled"
              : "inactive",
      current_period_start: new Date(
        (subscription as unknown as { current_period_start: number }).current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        (subscription as unknown as { current_period_end: number }).current_period_end * 1000
      ).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq("stripe_customer_id", customerId);

  // Sync plan to profile
  const activePlan =
    status === "active" || status === "trialing" ? plan : "free";

  await supabase
    .from("profiles")
    .update({ plan: activePlan })
    .eq("id", sub.user_id);
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = headers().get("stripe-signature")!;

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await upsertSubscription(
            subscription,
            session.customer as string
          );
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscription(
          subscription,
          subscription.customer as string
        );
        break;
      }

      case "invoice.payment_failed": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        if (invoice.subscription && invoice.customer) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          await upsertSubscription(
            subscription,
            invoice.customer as string
          );
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
