import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  decimal,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "employee"]);
export const projectStatusEnum = pgEnum("project_status", [
  "pending",
  "in_progress",
  "completed",
  "on_hold",
]);

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#f97316"),
  secondaryColor: text("secondary_color").notNull().default("#0f172a"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  role: roleEnum("role").notNull().default("employee"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  position: text("position"),
  startDate: text("start_date"),
  isActive: boolean("is_active").notNull().default(true),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  clientName: text("client_name").notNull().default(""),
  clientPhone: text("client_phone").notNull().default(""),
  clientEmail: text("client_email").notNull().default(""),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).notNull().default("0"),
  startDate: text("start_date"),
  expectedEndDate: text("expected_end_date"),
  status: projectStatusEnum("status").notNull().default("pending"),
  paintColors: text("paint_colors").array().notNull().default([]),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectAssignments = pgTable(
  "project_assignments",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })]
);

export const projectPhotos = pgTable("project_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  uri: text("uri").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const timeLogs = pgTable("time_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  clockIn: timestamp("clock_in").notNull(),
  clockOut: timestamp("clock_out"),
  totalMinutes: integer("total_minutes"),
  notes: text("notes").notNull().default(""),
  date: text("date").notNull(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: text("date").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
});

export const employeeNotes = pgTable("employee_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, { fields: [users.companyId], references: [companies.id] }),
  timeLogs: many(timeLogs),
  employeeNotes: many(employeeNotes),
  assignments: many(projectAssignments),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  company: one(companies, { fields: [projects.companyId], references: [companies.id] }),
  assignments: many(projectAssignments),
  photos: many(projectPhotos),
  timeLogs: many(timeLogs),
  expenses: many(expenses),
  employeeNotes: many(employeeNotes),
}));

export const projectAssignmentsRelations = relations(projectAssignments, ({ one }) => ({
  project: one(projects, { fields: [projectAssignments.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectAssignments.userId], references: [users.id] }),
}));

export type Company = typeof companies.$inferSelect;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type ProjectPhoto = typeof projectPhotos.$inferSelect;
export type TimeLog = typeof timeLogs.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type EmployeeNote = typeof employeeNotes.$inferSelect;
