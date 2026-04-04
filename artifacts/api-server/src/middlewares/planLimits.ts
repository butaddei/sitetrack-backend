import type { Response, NextFunction } from "express";
import { eq, count } from "drizzle-orm";
import { db, companies, projects, users } from "@workspace/db";
import type { AuthRequest } from "./auth.js";
import { PLAN_LIMITS } from "../lib/stripeClient.js";

type LimitResource = "projects" | "employees";

async function getCompanyPlan(companyId: string): Promise<"free" | "pro" | "business"> {
  const [company] = await db
    .select({ plan: companies.plan })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  return (company?.plan ?? "free") as "free" | "pro" | "business";
}

export function checkPlanLimit(resource: LimitResource) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const plan = await getCompanyPlan(companyId);
      const limit = PLAN_LIMITS[plan][resource];

      if (!isFinite(limit)) {
        next();
        return;
      }

      let currentCount = 0;

      if (resource === "projects") {
        const [row] = await db
          .select({ count: count() })
          .from(projects)
          .where(eq(projects.companyId, companyId));
        currentCount = Number(row?.count ?? 0);
      } else if (resource === "employees") {
        const [row] = await db
          .select({ count: count() })
          .from(users)
          .where(eq(users.companyId, companyId));
        currentCount = Number(row?.count ?? 0);
      }

      if (currentCount >= limit) {
        const planNames: Record<string, string> = { free: "Free", pro: "Pro", business: "Business" };
        const nextPlan = plan === "free" ? "Pro" : "Business";
        res.status(403).json({
          error: `Plan limit reached`,
          code: "PLAN_LIMIT",
          detail: `Your ${planNames[plan]} plan allows up to ${limit} ${resource}. Upgrade to ${nextPlan} to add more.`,
          currentPlan: plan,
          limit,
          current: currentCount,
        });
        return;
      }

      next();
    } catch (err) {
      console.error("Plan limit check error:", err);
      next();
    }
  };
}
