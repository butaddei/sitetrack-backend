import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  db,
  companies,
  users,
  projects,
  projectAssignments,
  timeLogs,
  expenses,
  employeeNotes,
} from "@workspace/db";

const DEMO_COMPANY_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_ADMIN_ID   = "00000000-0000-0000-0001-000000000001";
const DEMO_EMP1_ID    = "00000000-0000-0000-0001-000000000002";
const DEMO_EMP2_ID    = "00000000-0000-0000-0001-000000000003";
const DEMO_EMP3_ID    = "00000000-0000-0000-0001-000000000004";
const DEMO_PROJ1_ID   = "00000000-0000-0000-0002-000000000001";
const DEMO_PROJ2_ID   = "00000000-0000-0000-0002-000000000002";
const DEMO_PROJ3_ID   = "00000000-0000-0000-0002-000000000003";

export async function ensureDemoData(): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@paintpro.com"))
      .limit(1);

    if (existing.length > 0) return;

    const adminHash    = await bcrypt.hash("admin123", 12);
    const employeeHash = await bcrypt.hash("employee123", 12);

    const today = new Date();
    const fmtDate = (d: Date) => d.toISOString().split("T")[0];
    const hoursAgo = (h: number) => new Date(today.getTime() - h * 3600000);

    await db.insert(companies).values({
      id: DEMO_COMPANY_ID,
      name: "SiteTrack Demo",
      primaryColor: "#f97316",
      secondaryColor: "#0f172a",
    });

    await db.insert(users).values([
      {
        id: DEMO_ADMIN_ID,
        companyId: DEMO_COMPANY_ID,
        name: "Maria Rodriguez",
        email: "admin@paintpro.com",
        passwordHash: adminHash,
        role: "admin",
        position: "Project Manager",
        startDate: "2022-01-15",
        isActive: true,
      },
      {
        id: DEMO_EMP1_ID,
        companyId: DEMO_COMPANY_ID,
        name: "Carlos Mendez",
        email: "carlos@paintpro.com",
        passwordHash: employeeHash,
        role: "employee",
        hourlyRate: "28",
        position: "Lead Painter",
        startDate: "2022-03-01",
        isActive: true,
      },
      {
        id: DEMO_EMP2_ID,
        companyId: DEMO_COMPANY_ID,
        name: "James Wilson",
        email: "james@paintpro.com",
        passwordHash: employeeHash,
        role: "employee",
        hourlyRate: "24",
        position: "Painter",
        startDate: "2023-06-15",
        isActive: true,
      },
      {
        id: DEMO_EMP3_ID,
        companyId: DEMO_COMPANY_ID,
        name: "Sofia Chen",
        email: "sofia@paintpro.com",
        passwordHash: employeeHash,
        role: "employee",
        hourlyRate: "26",
        position: "Senior Painter",
        startDate: "2022-08-20",
        isActive: true,
      },
    ]);

    await db.insert(projects).values([
      {
        id: DEMO_PROJ1_ID,
        companyId: DEMO_COMPANY_ID,
        name: "Harbor View Residence",
        address: "142 Ocean Blvd, Miami, FL 33139",
        clientName: "Robert & Linda Hayes",
        clientPhone: "305-555-0201",
        clientEmail: "hayes@email.com",
        totalValue: "18500",
        startDate: "2024-03-01",
        expectedEndDate: "2024-03-28",
        status: "completed",
        paintColors: ["Benjamin Moore White Dove OC-17", "Sherwin-Williams Naval SW 6244"],
        notes: "3-story home, exterior + interior. Client prefers low-VOC paints.",
      },
      {
        id: DEMO_PROJ2_ID,
        companyId: DEMO_COMPANY_ID,
        name: "Sunrise Office Complex",
        address: "880 Brickell Ave, Miami, FL 33131",
        clientName: "Sunrise Properties LLC",
        clientPhone: "305-555-0301",
        clientEmail: "contact@sunriseprop.com",
        totalValue: "42000",
        startDate: "2024-04-10",
        expectedEndDate: "2024-05-25",
        status: "in_progress",
        paintColors: ["Behr Ultra Pure White", "PPG Pittsburgh Paints Steel Blue"],
        notes: "Commercial office, 8 floors. Work on weekends only.",
      },
      {
        id: DEMO_PROJ3_ID,
        companyId: DEMO_COMPANY_ID,
        name: "Palm Gardens Condo",
        address: "555 Collins Ave, Miami Beach, FL 33140",
        clientName: "Palm Gardens HOA",
        clientPhone: "305-555-0401",
        clientEmail: "hoa@palmgardens.com",
        totalValue: "28000",
        startDate: "2024-05-01",
        expectedEndDate: "2024-06-15",
        status: "pending",
        paintColors: ["Farrow & Ball Elephant Breath", "Farrow & Ball Off-Black"],
        notes: "12-unit condo building exterior. Coordination required with residents.",
      },
    ]);

    await db.insert(projectAssignments).values([
      { projectId: DEMO_PROJ1_ID, userId: DEMO_EMP1_ID },
      { projectId: DEMO_PROJ1_ID, userId: DEMO_EMP2_ID },
      { projectId: DEMO_PROJ2_ID, userId: DEMO_EMP1_ID },
      { projectId: DEMO_PROJ2_ID, userId: DEMO_EMP2_ID },
      { projectId: DEMO_PROJ2_ID, userId: DEMO_EMP3_ID },
      { projectId: DEMO_PROJ3_ID, userId: DEMO_EMP2_ID },
      { projectId: DEMO_PROJ3_ID, userId: DEMO_EMP3_ID },
    ]);

    await db.insert(timeLogs).values([
      {
        companyId: DEMO_COMPANY_ID,
        userId: DEMO_EMP1_ID,
        projectId: DEMO_PROJ1_ID,
        clockIn: hoursAgo(200),
        clockOut: hoursAgo(192),
        totalMinutes: 480,
        notes: "Completed exterior north wall",
        date: fmtDate(hoursAgo(200)),
      },
      {
        companyId: DEMO_COMPANY_ID,
        userId: DEMO_EMP2_ID,
        projectId: DEMO_PROJ1_ID,
        clockIn: hoursAgo(200),
        clockOut: hoursAgo(194),
        totalMinutes: 360,
        notes: "Primed interior walls",
        date: fmtDate(hoursAgo(200)),
      },
      {
        companyId: DEMO_COMPANY_ID,
        userId: DEMO_EMP1_ID,
        projectId: DEMO_PROJ2_ID,
        clockIn: hoursAgo(48),
        clockOut: hoursAgo(40),
        totalMinutes: 480,
        notes: "Started floors 3-4",
        date: fmtDate(hoursAgo(48)),
      },
      {
        companyId: DEMO_COMPANY_ID,
        userId: DEMO_EMP3_ID,
        projectId: DEMO_PROJ2_ID,
        clockIn: hoursAgo(24),
        clockOut: hoursAgo(16),
        totalMinutes: 480,
        notes: "Floor 5 in progress",
        date: fmtDate(hoursAgo(24)),
      },
    ]);

    await db.insert(expenses).values([
      {
        companyId: DEMO_COMPANY_ID,
        projectId: DEMO_PROJ1_ID,
        category: "Materials",
        description: "Paint & primer - 40 gallons",
        amount: "1200",
        date: "2024-03-01",
        createdBy: DEMO_ADMIN_ID,
      },
      {
        companyId: DEMO_COMPANY_ID,
        projectId: DEMO_PROJ1_ID,
        category: "Equipment",
        description: "Scaffolding rental",
        amount: "850",
        date: "2024-03-02",
        createdBy: DEMO_ADMIN_ID,
      },
      {
        companyId: DEMO_COMPANY_ID,
        projectId: DEMO_PROJ2_ID,
        category: "Materials",
        description: "Commercial grade paint - 120 gallons",
        amount: "3600",
        date: "2024-04-10",
        createdBy: DEMO_ADMIN_ID,
      },
    ]);

    await db.insert(employeeNotes).values([
      {
        companyId: DEMO_COMPANY_ID,
        projectId: DEMO_PROJ2_ID,
        userId: DEMO_EMP1_ID,
        text: "Floors 3 and 4 require extra prep — water damage on east wall.",
      },
    ]);

    console.log("[seed] Demo data created successfully");
  } catch (err) {
    console.error("[seed] Failed to seed demo data:", err);
  }
}
