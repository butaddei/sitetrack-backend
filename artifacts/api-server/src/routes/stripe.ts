import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, companies } from "@workspace/db";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";
import { stripe, requireStripe, STRIPE_ENABLED, PLAN_PRICES } from "../lib/stripeClient.js";

const router = Router();

// GET /api/stripe/plan — get current plan info for authenticated company
router.get("/plan", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [company] = await db
      .select({
        plan: companies.plan,
        planStatus: companies.planStatus,
        stripeCustomerId: companies.stripeCustomerId,
        stripeSubscriptionId: companies.stripeSubscriptionId,
      })
      .from(companies)
      .where(eq(companies.id, req.user!.companyId))
      .limit(1);

    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    res.json({
      plan: company.plan,
      planStatus: company.planStatus,
      stripeEnabled: STRIPE_ENABLED,
      hasSubscription: !!company.stripeSubscriptionId,
    });
  } catch (err) {
    console.error("Get plan error:", err);
    res.status(500).json({ error: "Failed to fetch plan" });
  }
});

// POST /api/stripe/checkout — create Stripe checkout session (admin only)
router.post("/checkout", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const client = requireStripe();
    const { plan } = req.body as { plan: "pro" | "business" };

    if (!plan || !PLAN_PRICES[plan]) {
      res.status(400).json({ error: "Invalid plan" });
      return;
    }

    const priceId = PLAN_PRICES[plan]?.monthly;
    if (!priceId) {
      res.status(400).json({ error: `Price ID for plan '${plan}' is not configured. Set STRIPE_${plan.toUpperCase()}_PRICE_ID.` });
      return;
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, req.user!.companyId))
      .limit(1);

    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    let customerId = company.stripeCustomerId;
    if (!customerId) {
      const customer = await client.customers.create({
        email: req.user!.email,
        name: company.name,
        metadata: { companyId: company.id },
      });
      customerId = customer.id;
      await db
        .update(companies)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(companies.id, company.id));
    }

    const baseUrl = process.env["APP_URL"] ?? "https://paintpro.app";

    const session = await client.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/billing?success=1`,
      cancel_url: `${baseUrl}/billing?canceled=1`,
      metadata: { companyId: company.id, plan },
    });

    res.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    console.error("Checkout error:", err);
    res.status(500).json({ error: message });
  }
});

// POST /api/stripe/portal — open customer billing portal (admin only)
router.post("/portal", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const client = requireStripe();

    const [company] = await db
      .select({ stripeCustomerId: companies.stripeCustomerId })
      .from(companies)
      .where(eq(companies.id, req.user!.companyId))
      .limit(1);

    if (!company?.stripeCustomerId) {
      res.status(400).json({ error: "No Stripe customer found. Please subscribe first." });
      return;
    }

    const baseUrl = process.env["APP_URL"] ?? "https://paintpro.app";

    const session = await client.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${baseUrl}/billing`,
    });

    res.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create portal session";
    console.error("Portal error:", err);
    res.status(500).json({ error: message });
  }
});

// POST /api/stripe/webhook — receive Stripe webhook events (raw body required)
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];

  if (!STRIPE_ENABLED || !stripe) {
    res.status(200).json({ received: true });
    return;
  }

  let event;
  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } else {
      event = req.body;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("Webhook sig error:", message);
    res.status(400).json({ error: message });
    return;
  }

  try {
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

async function handleWebhookEvent(event: { type: string; data: { object: Record<string, unknown> } }) {
  const obj = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = obj as { metadata?: { companyId?: string; plan?: string }; customer?: string; subscription?: string };
      const companyId = session.metadata?.companyId;
      const plan = session.metadata?.plan as "pro" | "business" | undefined;
      if (companyId && plan) {
        await db.update(companies).set({
          plan,
          planStatus: "active",
          stripeCustomerId: session.customer as string ?? undefined,
          stripeSubscriptionId: session.subscription as string ?? undefined,
          updatedAt: new Date(),
        }).where(eq(companies.id, companyId));
        console.log(`[stripe] Company ${companyId} upgraded to ${plan}`);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = obj as { id: string; status: string; items?: { data?: Array<{ price?: { id: string } }> }; metadata?: { companyId?: string } };
      const subId = sub.id;
      const status = sub.status as "active" | "inactive" | "trialing" | "past_due" | "canceled";

      const [company] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.stripeSubscriptionId, subId))
        .limit(1);

      if (company) {
        await db.update(companies).set({
          planStatus: status,
          updatedAt: new Date(),
        }).where(eq(companies.id, company.id));
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = obj as { id: string };
      const [company] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.stripeSubscriptionId, sub.id))
        .limit(1);

      if (company) {
        await db.update(companies).set({
          plan: "free",
          planStatus: "active",
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        }).where(eq(companies.id, company.id));
        console.log(`[stripe] Company ${company.id} downgraded to free`);
      }
      break;
    }

    default:
      break;
  }
}

export default router;
