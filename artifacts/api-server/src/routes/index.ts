import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import companyRouter from "./company.js";
import usersRouter from "./users.js";
import projectsRouter from "./projects.js";
import timelogsRouter from "./timelogs.js";
import expensesRouter from "./expenses.js";
import notesRouter from "./notes.js";
import stripeRouter from "./stripe.js";
import invoicesRouter from "./invoices.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/company", companyRouter);
router.use("/users", usersRouter);
router.use("/projects", projectsRouter);
router.use("/timelogs", timelogsRouter);
router.use("/expenses", expensesRouter);
router.use("/notes", notesRouter);
router.use("/stripe", stripeRouter);
router.use("/invoices", invoicesRouter);

export default router;
