import Stripe from "stripe";

const key = process.env["STRIPE_SECRET_KEY"];

export const stripe: Stripe | null = key
  ? new Stripe(key, { apiVersion: "2025-03-31.basil" })
  : null;

export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing.");
  }
  return stripe;
}

export const STRIPE_ENABLED = !!key;

export const BILLING_ACTIVE = false;

export const PLAN_PRICES: Record<string, { monthly: string; name: string }> = {
  pro: {
    monthly: process.env["STRIPE_PRO_PRICE_ID"] ?? "",
    name: "Pro",
  },
  business: {
    monthly: process.env["STRIPE_BUSINESS_PRICE_ID"] ?? "",
    name: "Business",
  },
};

export const PLAN_LIMITS = {
  free: { projects: 3, employees: 3 },
  pro: { projects: 15, employees: 15 },
  business: { projects: Infinity, employees: Infinity },
} as const;
