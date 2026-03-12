/**
 * Stripe webhook handler.
 *
 * Flow: Stripe → this webhook → Core API (POST /internal/subscriptions)
 * Core owns the subscription record and tier resolution.
 * ProveChain just forwards the relevant Stripe events to Core.
 *
 * Handled events:
 *   - checkout.session.completed  → new subscription
 *   - customer.subscription.updated → upgrade/downgrade
 *   - customer.subscription.deleted → cancellation
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { applyTierChange } from "@/lib/tier-effects";

const CORE_API_URL = process.env.CORE_API_URL!;
const SERVICE_API_KEY = process.env.SERVICE_API_KEY!;

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-10-29.clover",
  });
}

/** Map a Stripe price ID to a ProveChain tier name. */
function priceTier(priceId: string): string | null {
  const map: Record<string, string> = {};

  // Build map from env vars (only add entries that exist)
  const envMap: [string, string][] = [
    ["NEXT_PUBLIC_STRIPE_PRICE_ID_FOUNDING_MEMBER", "founding_member"],
    ["NEXT_PUBLIC_STRIPE_PRICE_ID_PRO", "professional"],
    ["NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID", "team"],
    ["NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID", "business"],
  ];

  for (const [envVar, tier] of envMap) {
    const id = process.env[envVar];
    if (id) map[id] = tier;
  }

  return map[priceId] || null;
}

/** Forward subscription state to Core API. */
async function upsertSubscription(payload: {
  user_id: string;
  product: string;
  tier: string;
  status: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
}) {
  const res = await fetch(`${CORE_API_URL}/internal/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": SERVICE_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Core upsert failed (${res.status}): ${text}`);
  }

  return res.json();
}

/** Cancel subscription in Core. */
async function cancelSubscription(userId: string) {
  const res = await fetch(
    `${CORE_API_URL}/internal/subscriptions/${userId}/provechain`,
    {
      method: "DELETE",
      headers: {
        "X-Service-Key": SERVICE_API_KEY,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Core cancel failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId || !session.subscription) break;

        // Fetch the full subscription to get the price ID
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0]?.price.id;
        const tier = priceId ? priceTier(priceId) : null;

        if (!tier) {
          console.error(`[stripe-webhook] Unknown price ID: ${priceId}`);
          break;
        }

        const result = await upsertSubscription({
          user_id: userId,
          product: "provechain",
          tier,
          status: "active",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
        });

        if (result.tier_changed) {
          await applyTierChange(userId, result.previous_tier || "free", tier);
        }

        console.log(
          `[stripe-webhook] checkout.session.completed: ${userId} → ${tier}`
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = priceId ? priceTier(priceId) : null;

        if (!tier) {
          console.log(
            `[stripe-webhook] subscription.updated: unknown price ${priceId}, skipping`
          );
          break;
        }

        // Find user_id from subscription metadata or customer
        const userId = subscription.metadata?.user_id;
        if (!userId) {
          console.log(
            `[stripe-webhook] subscription.updated: no user_id in metadata, skipping`
          );
          break;
        }

        const status = subscription.cancel_at_period_end
          ? "canceling"
          : subscription.status === "active"
            ? "active"
            : subscription.status;

        const updateResult = await upsertSubscription({
          user_id: userId,
          product: "provechain",
          tier,
          status,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
        });

        if (updateResult.tier_changed) {
          await applyTierChange(userId, updateResult.previous_tier || "free", tier);
        }

        console.log(
          `[stripe-webhook] subscription.updated: ${userId} → ${tier} (${status})`
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          console.log(
            `[stripe-webhook] subscription.deleted: no user_id in metadata, skipping`
          );
          break;
        }

        const cancelResult = await cancelSubscription(userId);
        const previousTier = cancelResult.previous_tier || "free";
        await applyTierChange(userId, previousTier, "free");

        console.log(
          `[stripe-webhook] subscription.deleted: ${userId} → cancelled (was ${previousTier})`
        );
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
    }
  } catch (error: any) {
    console.error(`[stripe-webhook] Error processing ${event.type}:`, error);
    // Return 200 anyway so Stripe doesn't retry — we logged the error
    return NextResponse.json({ received: true, error: error.message });
  }

  return NextResponse.json({ received: true });
}
