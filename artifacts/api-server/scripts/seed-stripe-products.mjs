#!/usr/bin/env node
/**
 * Seed Stripe products and prices for PaintPro.
 * Run once after setting STRIPE_SECRET_KEY.
 *
 *   node scripts/seed-stripe-products.mjs
 *
 * Outputs the price IDs to set as env vars:
 *   STRIPE_PRO_PRICE_ID
 *   STRIPE_BUSINESS_PRICE_ID
 */

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("❌  STRIPE_SECRET_KEY is not set. Export it and re-run.");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2025-03-31.basil" });

async function createPlan(name, amount, description) {
  const product = await stripe.products.create({ name, description });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount * 100,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: name,
  });
  return { product, price };
}

async function main() {
  console.log("🎨  Seeding Stripe products for PaintPro...\n");

  const pro = await createPlan("PaintPro Pro", 29, "For growing painting businesses — up to 15 projects & employees");
  console.log(`✅  Pro plan created`);
  console.log(`   Product: ${pro.product.id}`);
  console.log(`   Price:   ${pro.price.id}`);

  const biz = await createPlan("PaintPro Business", 79, "For large-scale operations — unlimited projects & employees");
  console.log(`✅  Business plan created`);
  console.log(`   Product: ${biz.product.id}`);
  console.log(`   Price:   ${biz.price.id}`);

  console.log("\n─────────────────────────────────────────────");
  console.log("Add these to Replit Secrets or environment vars:\n");
  console.log(`STRIPE_PRO_PRICE_ID=${pro.price.id}`);
  console.log(`STRIPE_BUSINESS_PRICE_ID=${biz.price.id}`);
  console.log("─────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
