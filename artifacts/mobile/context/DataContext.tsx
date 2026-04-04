import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────
export type ProjectStatus = "pending" | "in_progress" | "completed" | "on_hold";

export interface Project {
  id: string;
  name: string;
  address: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  totalValue?: number;
  startDate: string | null;
  expectedEndDate: string | null;
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
  phone: string | null;
  role: "admin" | "employee";
  hourlyRate: string;
  position: string | null;
  startDate: string | null;
  isActive: boolean;
  avatarUrl?: string | null;
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
  laborCost?: number;
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

export interface EmployeeNote {
  id: string;
  projectId: string;
  employeeId: string;
  text: string;
  createdAt: string;
}

interface DataContextType {
  projects: Project[];
  employees: Employee[];
  timeLogs: TimeLog[];
  expenses: Expense[];
  employeeNotes: EmployeeNote[];
  isLoading: boolean;
  addProject: (p: Omit<Project, "id" | "createdAt">) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addEmployee: (e: Omit<Employee, "id">) => Promise<Employee>;
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
  addEmployeeNote: (projectId: string, employeeId: string, text: string) => Promise<void>;
  deleteEmployeeNote: (noteId: string) => Promise<void>;
  getProjectNotes: (projectId: string, employeeId?: string) => EmployeeNote[];
  addProjectPhoto: (projectId: string, photoUri: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

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

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employeeNotes, setEmployeeNotes] = useState<EmployeeNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setEmployees([]);
      setTimeLogs([]);
      setExpenses([]);
      setEmployeeNotes([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [projectsData, timelogsData] = await Promise.all([
        apiFetch<Project[]>("/projects"),
        apiFetch<TimeLog[]>("/timelogs"),
      ]);
      setProjects(projectsData);
      setTimeLogs(timelogsData);

      if (user.role === "admin") {
        const [employeesData, expensesData] = await Promise.all([
          apiFetch<Employee[]>("/users"),
          apiFetch<Expense[]>("/expenses"),
        ]);
        setEmployees(employeesData);
        setExpenses(expensesData);
      } else {
        // Employees: load notes for all assigned projects
        const notePromises = projectsData.map((p) =>
          apiFetch<EmployeeNote[]>(`/notes?projectId=${p.id}`).catch(() => [] as EmployeeNote[])
        );
        const allNotes = await Promise.all(notePromises);
        setEmployeeNotes(allNotes.flat());
      }
    } catch (err) {
      console.error("DataContext load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Projects ─────────────────────────────────────────────────────────────
  const addProject = async (p: Omit<Project, "id" | "createdAt">) => {
    const newP = await apiFetch<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(p),
    });
    setProjects((prev) => [...prev, newP]);
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const updated = await apiFetch<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const deleteProject = async (id: string) => {
    await apiFetch(`/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  // ── Employees ─────────────────────────────────────────────────────────────
  const addEmployee = async (e: Omit<Employee, "id">): Promise<Employee> => {
    const newE = await apiFetch<Employee>("/users", {
      method: "POST",
      body: JSON.stringify(e),
    });
    setEmployees((prev) => [...prev, newE]);
    return newE;
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    const updated = await apiFetch<Employee>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
  };

  const deleteEmployee = async (id: string) => {
    await apiFetch(`/users/${id}`, { method: "DELETE" });
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  // ── Time logs ─────────────────────────────────────────────────────────────
  const clockIn = async (
    employeeId: string,
    projectId: string
  ): Promise<{ success: boolean; error?: string; log?: TimeLog }> => {
    try {
      const log = await apiFetch<TimeLog>("/timelogs/clock-in", {
        method: "POST",
        body: JSON.stringify({ projectId }),
      });
      setTimeLogs((prev) => [...prev, log]);
      return { success: true, log };
    } catch (err: any) {
      return { success: false, error: err.message ?? "Failed to clock in" };
    }
  };

  const clockOut = async (logId: string, notes?: string) => {
    const updated = await apiFetch<TimeLog>("/timelogs/clock-out", {
      method: "POST",
      body: JSON.stringify({ logId, notes }),
    });
    setTimeLogs((prev) => prev.map((l) => (l.id === logId ? updated : l)));
  };

  const getActiveTimeLog = (employeeId: string) =>
    timeLogs.find((l) => l.employeeId === employeeId && !l.clockOut);

  // ── Expenses ──────────────────────────────────────────────────────────────
  const addExpense = async (e: Omit<Expense, "id">) => {
    const newE = await apiFetch<Expense>("/expenses", {
      method: "POST",
      body: JSON.stringify(e),
    });
    setExpenses((prev) => [...prev, newE]);
  };

  const deleteExpense = async (id: string) => {
    await apiFetch(`/expenses/${id}`, { method: "DELETE" });
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // ── Computed: labor costs ─────────────────────────────────────────────────
  const getProjectLaborCost = (projectId: string) => {
    const logs = timeLogs.filter((l) => l.projectId === projectId && l.totalMinutes);
    return logs.reduce((total, log) => {
      const emp = employees.find((e) => e.id === log.employeeId);
      const hours = (log.totalMinutes ?? 0) / 60;
      return total + hours * (Number(emp?.hourlyRate) ?? 0);
    }, 0);
  };

  const getProjectExpenses = (projectId: string) =>
    expenses.filter((e) => e.projectId === projectId).reduce((s, e) => s + e.amount, 0);

  const getEmployeeDailyLogs = (employeeId: string, dateStr?: string) => {
    const target = dateStr ?? todayStr();
    return timeLogs.filter((l) => l.employeeId === employeeId && l.date === target);
  };

  const getEmployeeTotalHours = (employeeId: string, projectId?: string) => {
    const logs = timeLogs.filter(
      (l) =>
        l.employeeId === employeeId &&
        l.totalMinutes &&
        (projectId ? l.projectId === projectId : true)
    );
    return logs.reduce((s, l) => s + (l.totalMinutes ?? 0) / 60, 0);
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
    return hours * (Number(emp?.hourlyRate) ?? 0);
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

  // ── Notes ─────────────────────────────────────────────────────────────────
  const addEmployeeNote = async (projectId: string, employeeId: string, text: string) => {
    const note = await apiFetch<EmployeeNote>("/notes", {
      method: "POST",
      body: JSON.stringify({ projectId, text }),
    });
    setEmployeeNotes((prev) => [...prev, note]);
  };

  const deleteEmployeeNote = async (noteId: string) => {
    await apiFetch(`/notes/${noteId}`, { method: "DELETE" });
    setEmployeeNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const getProjectNotes = (projectId: string, employeeId?: string) => {
    return employeeNotes
      .filter(
        (n) =>
          n.projectId === projectId && (employeeId ? n.employeeId === employeeId : true)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // ── Photos ────────────────────────────────────────────────────────────────
  const addProjectPhoto = async (projectId: string, photoUri: string) => {
    await apiFetch(`/projects/${projectId}/photos`, {
      method: "POST",
      body: JSON.stringify({ uri: photoUri }),
    });
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, photos: [...p.photos, photoUri] } : p
      )
    );
  };

  return (
    <DataContext.Provider
      value={{
        projects,
        employees,
        timeLogs,
        expenses,
        employeeNotes,
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
        addEmployeeNote,
        deleteEmployeeNote,
        getProjectNotes,
        addProjectPhoto,
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
