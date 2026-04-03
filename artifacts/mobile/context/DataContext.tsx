import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ProjectStatus = "pending" | "in_progress" | "completed" | "on_hold";

export interface Project {
  id: string;
  name: string;
  address: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  totalValue: number;
  startDate: string;
  expectedEndDate: string;
  status: ProjectStatus;
  paintColors: string[];
  notes: string;
  photos: string[];
  documents: string[];
  assignedEmployeeIds: string[];
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "employee";
  hourlyRate: number;
  position: string;
  startDate: string;
  isActive: boolean;
}

export interface TimeLog {
  id: string;
  employeeId: string;
  projectId: string;
  clockIn: string;
  clockOut?: string;
  totalMinutes?: number;
  notes: string;
  date: string;
}

export interface Expense {
  id: string;
  projectId: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  createdBy: string;
}

interface DataContextType {
  projects: Project[];
  employees: Employee[];
  timeLogs: TimeLog[];
  expenses: Expense[];
  isLoading: boolean;
  addProject: (p: Omit<Project, "id" | "createdAt">) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addEmployee: (e: Omit<Employee, "id">) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  clockIn: (employeeId: string, projectId: string) => Promise<{ success: boolean; error?: string; log?: TimeLog }>;
  clockOut: (logId: string, notes?: string) => Promise<void>;
  getActiveTimeLog: (employeeId: string) => TimeLog | undefined;
  addExpense: (e: Omit<Expense, "id">) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getProjectLaborCost: (projectId: string) => number;
  getProjectExpenses: (projectId: string) => number;
  getEmployeeTotalHours: (employeeId: string, projectId?: string) => number;
  getEmployeeDailyHours: (employeeId: string, dateStr?: string) => number;
  getEmployeeWeeklyHours: (employeeId: string) => number;
  getEmployeeDailyLaborCost: (employeeId: string, dateStr?: string) => number;
  getEmployeeWeeklyLaborCost: (employeeId: string) => number;
  getEmployeeDailyLogs: (employeeId: string, dateStr?: string) => TimeLog[];
  getSessionLaborCost: (log: TimeLog) => number;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

const KEYS = {
  projects: "paintpro_projects",
  employees: "paintpro_employees",
  timeLogs: "paintpro_time_logs",
  expenses: "paintpro_expenses",
};

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function weekStartStr() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

const SEED_EMPLOYEES: (Employee & { password: string })[] = [
  {
    id: "emp1",
    name: "Maria Rodriguez",
    email: "admin@paintpro.com",
    phone: "555-0100",
    role: "admin",
    hourlyRate: 0,
    position: "Project Manager",
    startDate: "2022-01-15",
    isActive: true,
    password: "admin123",
  },
  {
    id: "emp2",
    name: "Carlos Mendez",
    email: "carlos@paintpro.com",
    phone: "555-0101",
    role: "employee",
    hourlyRate: 28,
    position: "Lead Painter",
    startDate: "2022-03-01",
    isActive: true,
    password: "carlos123",
  },
  {
    id: "emp3",
    name: "James Wilson",
    email: "james@paintpro.com",
    phone: "555-0102",
    role: "employee",
    hourlyRate: 24,
    position: "Painter",
    startDate: "2023-06-15",
    isActive: true,
    password: "james123",
  },
  {
    id: "emp4",
    name: "Sofia Chen",
    email: "sofia@paintpro.com",
    phone: "555-0103",
    role: "employee",
    hourlyRate: 26,
    position: "Senior Painter",
    startDate: "2022-08-20",
    isActive: true,
    password: "sofia123",
  },
];

const SEED_PROJECTS: Project[] = [
  {
    id: "proj1",
    name: "Harbor View Residence",
    address: "142 Ocean Blvd, Miami, FL 33139",
    clientName: "Robert & Linda Hayes",
    clientPhone: "305-555-0201",
    clientEmail: "hayes@email.com",
    totalValue: 18500,
    startDate: "2024-03-01",
    expectedEndDate: "2024-03-28",
    status: "completed",
    paintColors: ["Benjamin Moore White Dove OC-17", "Sherwin-Williams Naval SW 6244"],
    notes: "3-story home, exterior + interior. Client prefers low-VOC paints.",
    photos: [],
    documents: [],
    assignedEmployeeIds: ["emp2", "emp3"],
    createdAt: "2024-02-20",
  },
  {
    id: "proj2",
    name: "Sunrise Office Complex",
    address: "880 Brickell Ave, Miami, FL 33131",
    clientName: "Sunrise Properties LLC",
    clientPhone: "305-555-0301",
    clientEmail: "contact@sunriseprop.com",
    totalValue: 42000,
    startDate: "2024-04-10",
    expectedEndDate: "2024-05-25",
    status: "in_progress",
    paintColors: ["Behr Ultra Pure White", "PPG Pittsburgh Paints Steel Blue"],
    notes: "Commercial office, 8 floors. Work on weekends only.",
    photos: [],
    documents: [],
    assignedEmployeeIds: ["emp2", "emp3", "emp4"],
    createdAt: "2024-03-25",
  },
  {
    id: "proj3",
    name: "Palm Gardens Condo",
    address: "555 Collins Ave, Miami Beach, FL 33140",
    clientName: "Palm Gardens HOA",
    clientPhone: "305-555-0401",
    clientEmail: "hoa@palmgardens.com",
    totalValue: 28000,
    startDate: "2024-05-01",
    expectedEndDate: "2024-06-15",
    status: "pending",
    paintColors: ["Farrow & Ball Elephant Breath", "Farrow & Ball Off-Black"],
    notes: "12-unit condo building exterior. Coordination required with residents.",
    photos: [],
    documents: [],
    assignedEmployeeIds: ["emp3", "emp4"],
    createdAt: "2024-04-15",
  },
];

const _today = new Date();
const fmtDate = (d: Date) => d.toISOString().split("T")[0];
const hoursAgo = (h: number) => new Date(_today.getTime() - h * 3600000).toISOString();

const SEED_TIME_LOGS: TimeLog[] = [
  {
    id: "log1",
    employeeId: "emp2",
    projectId: "proj1",
    clockIn: hoursAgo(200),
    clockOut: hoursAgo(192),
    totalMinutes: 480,
    notes: "Completed exterior north wall",
    date: fmtDate(new Date(_today.getTime() - 200 * 3600000)),
  },
  {
    id: "log2",
    employeeId: "emp3",
    projectId: "proj1",
    clockIn: hoursAgo(200),
    clockOut: hoursAgo(194),
    totalMinutes: 360,
    notes: "Primed interior walls",
    date: fmtDate(new Date(_today.getTime() - 200 * 3600000)),
  },
  {
    id: "log3",
    employeeId: "emp2",
    projectId: "proj2",
    clockIn: hoursAgo(48),
    clockOut: hoursAgo(40),
    totalMinutes: 480,
    notes: "Started floors 3-4",
    date: fmtDate(new Date(_today.getTime() - 48 * 3600000)),
  },
  {
    id: "log4",
    employeeId: "emp3",
    projectId: "proj2",
    clockIn: hoursAgo(48),
    clockOut: hoursAgo(42),
    totalMinutes: 360,
    notes: "Floor 2 complete",
    date: fmtDate(new Date(_today.getTime() - 48 * 3600000)),
  },
  {
    id: "log5",
    employeeId: "emp4",
    projectId: "proj2",
    clockIn: hoursAgo(24),
    clockOut: hoursAgo(16),
    totalMinutes: 480,
    notes: "Floor 5 in progress",
    date: fmtDate(new Date(_today.getTime() - 24 * 3600000)),
  },
];

const SEED_EXPENSES: Expense[] = [
  {
    id: "exp1",
    projectId: "proj1",
    category: "Materials",
    description: "Paint & primer - 40 gallons",
    amount: 1200,
    date: "2024-03-01",
    createdBy: "emp1",
  },
  {
    id: "exp2",
    projectId: "proj1",
    category: "Equipment",
    description: "Scaffolding rental",
    amount: 850,
    date: "2024-03-02",
    createdBy: "emp1",
  },
  {
    id: "exp3",
    projectId: "proj2",
    category: "Materials",
    description: "Commercial grade paint - 120 gallons",
    amount: 3600,
    date: "2024-04-10",
    createdBy: "emp1",
  },
  {
    id: "exp4",
    projectId: "proj2",
    category: "Transport",
    description: "Equipment delivery",
    amount: 450,
    date: "2024-04-11",
    createdBy: "emp1",
  },
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [pRaw, eRaw, tRaw, xRaw, usersRaw] = await Promise.all([
        AsyncStorage.getItem(KEYS.projects),
        AsyncStorage.getItem(KEYS.employees),
        AsyncStorage.getItem(KEYS.timeLogs),
        AsyncStorage.getItem(KEYS.expenses),
        AsyncStorage.getItem("paintpro_users"),
      ]);

      if (!usersRaw) {
        await AsyncStorage.setItem("paintpro_users", JSON.stringify(SEED_EMPLOYEES));
      }
      if (!pRaw) {
        await AsyncStorage.setItem(KEYS.projects, JSON.stringify(SEED_PROJECTS));
        setProjects(SEED_PROJECTS);
      } else {
        setProjects(JSON.parse(pRaw));
      }
      if (!eRaw) {
        const empOnly = SEED_EMPLOYEES.map(({ password: _, ...e }) => e);
        await AsyncStorage.setItem(KEYS.employees, JSON.stringify(empOnly));
        setEmployees(empOnly);
      } else {
        setEmployees(JSON.parse(eRaw));
      }
      if (!tRaw) {
        await AsyncStorage.setItem(KEYS.timeLogs, JSON.stringify(SEED_TIME_LOGS));
        setTimeLogs(SEED_TIME_LOGS);
      } else {
        setTimeLogs(JSON.parse(tRaw));
      }
      if (!xRaw) {
        await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(SEED_EXPENSES));
        setExpenses(SEED_EXPENSES);
      } else {
        setExpenses(JSON.parse(xRaw));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveProjects = async (data: Project[]) => {
    setProjects(data);
    await AsyncStorage.setItem(KEYS.projects, JSON.stringify(data));
  };
  const saveEmployees = async (data: Employee[]) => {
    setEmployees(data);
    await AsyncStorage.setItem(KEYS.employees, JSON.stringify(data));
  };
  const saveTimeLogs = async (data: TimeLog[]) => {
    setTimeLogs(data);
    await AsyncStorage.setItem(KEYS.timeLogs, JSON.stringify(data));
  };
  const saveExpenses = async (data: Expense[]) => {
    setExpenses(data);
    await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(data));
  };

  const addProject = async (p: Omit<Project, "id" | "createdAt">) => {
    const newP = { ...p, id: genId(), createdAt: new Date().toISOString() };
    await saveProjects([...projects, newP]);
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    await saveProjects(projects.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProject = async (id: string) => {
    await saveProjects(projects.filter((p) => p.id !== id));
  };

  const addEmployee = async (e: Omit<Employee, "id">) => {
    const newE = { ...e, id: genId() };
    await saveEmployees([...employees, newE]);
    const usersRaw = await AsyncStorage.getItem("paintpro_users");
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    users.push({ ...newE, password: "employee123" });
    await AsyncStorage.setItem("paintpro_users", JSON.stringify(users));
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    await saveEmployees(employees.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const deleteEmployee = async (id: string) => {
    await saveEmployees(employees.filter((e) => e.id !== id));
  };

  const clockIn = async (
    employeeId: string,
    projectId: string
  ): Promise<{ success: boolean; error?: string; log?: TimeLog }> => {
    const existing = timeLogs.find((l) => l.employeeId === employeeId && !l.clockOut);
    if (existing) {
      return {
        success: false,
        error: "You already have an active session. Please clock out first.",
      };
    }

    const now = new Date();
    const log: TimeLog = {
      id: genId(),
      employeeId,
      projectId,
      clockIn: now.toISOString(),
      notes: "",
      date: fmtDate(now),
    };
    await saveTimeLogs([...timeLogs, log]);
    return { success: true, log };
  };

  const clockOut = async (logId: string, notes?: string) => {
    const now = new Date().toISOString();
    await saveTimeLogs(
      timeLogs.map((l) => {
        if (l.id !== logId) return l;
        const mins = Math.round(
          (new Date(now).getTime() - new Date(l.clockIn).getTime()) / 60000
        );
        return { ...l, clockOut: now, totalMinutes: mins, notes: notes ?? l.notes };
      })
    );
  };

  const getActiveTimeLog = (employeeId: string) =>
    timeLogs.find((l) => l.employeeId === employeeId && !l.clockOut);

  const addExpense = async (e: Omit<Expense, "id">) => {
    await saveExpenses([...expenses, { ...e, id: genId() }]);
  };

  const deleteExpense = async (id: string) => {
    await saveExpenses(expenses.filter((e) => e.id !== id));
  };

  const getProjectLaborCost = (projectId: string) => {
    const logs = timeLogs.filter((l) => l.projectId === projectId && l.totalMinutes);
    return logs.reduce((total, log) => {
      const emp = employees.find((e) => e.id === log.employeeId);
      const hours = (log.totalMinutes ?? 0) / 60;
      return total + hours * (emp?.hourlyRate ?? 0);
    }, 0);
  };

  const getProjectExpenses = (projectId: string) =>
    expenses.filter((e) => e.projectId === projectId).reduce((s, e) => s + e.amount, 0);

  const getEmployeeTotalHours = (employeeId: string, projectId?: string) => {
    const logs = timeLogs.filter(
      (l) =>
        l.employeeId === employeeId &&
        l.totalMinutes &&
        (projectId ? l.projectId === projectId : true)
    );
    return logs.reduce((s, l) => s + (l.totalMinutes ?? 0) / 60, 0);
  };

  const getEmployeeDailyLogs = (employeeId: string, dateStr?: string) => {
    const target = dateStr ?? todayStr();
    return timeLogs.filter((l) => l.employeeId === employeeId && l.date === target);
  };

  const getEmployeeDailyHours = (employeeId: string, dateStr?: string) => {
    const logs = getEmployeeDailyLogs(employeeId, dateStr).filter((l) => l.totalMinutes);
    return logs.reduce((s, l) => s + (l.totalMinutes ?? 0) / 60, 0);
  };

  const getEmployeeWeeklyHours = (employeeId: string) => {
    const weekStart = weekStartStr();
    const logs = timeLogs.filter(
      (l) => l.employeeId === employeeId && l.totalMinutes && l.date >= weekStart
    );
    return logs.reduce((s, l) => s + (l.totalMinutes ?? 0) / 60, 0);
  };

  const getSessionLaborCost = (log: TimeLog) => {
    const emp = employees.find((e) => e.id === log.employeeId);
    const hours = (log.totalMinutes ?? 0) / 60;
    return hours * (emp?.hourlyRate ?? 0);
  };

  const getEmployeeDailyLaborCost = (employeeId: string, dateStr?: string) => {
    const logs = getEmployeeDailyLogs(employeeId, dateStr).filter((l) => l.totalMinutes);
    return logs.reduce((s, l) => s + getSessionLaborCost(l), 0);
  };

  const getEmployeeWeeklyLaborCost = (employeeId: string) => {
    const weekStart = weekStartStr();
    const logs = timeLogs.filter(
      (l) => l.employeeId === employeeId && l.totalMinutes && l.date >= weekStart
    );
    return logs.reduce((s, l) => s + getSessionLaborCost(l), 0);
  };

  return (
    <DataContext.Provider
      value={{
        projects,
        employees,
        timeLogs,
        expenses,
        isLoading,
        addProject,
        updateProject,
        deleteProject,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        clockIn,
        clockOut,
        getActiveTimeLog,
        addExpense,
        deleteExpense,
        getProjectLaborCost,
        getProjectExpenses,
        getEmployeeTotalHours,
        getEmployeeDailyHours,
        getEmployeeWeeklyHours,
        getEmployeeDailyLaborCost,
        getEmployeeWeeklyLaborCost,
        getEmployeeDailyLogs,
        getSessionLaborCost,
        refresh: load,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
