import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { employeesTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth } from "./auth";

const router = Router();

const fmt = (e: any) => ({
  id: e.id,
  companyId: e.companyId,
  employeeNumber: e.employeeNumber,
  firstName: e.firstName,
  lastName: e.lastName,
  email: e.email,
  phone: e.phone,
  designation: e.designation,
  department: e.department,
  joiningDate: e.joiningDate,
  address: e.address,
  abn: e.abn,
  bankAccount: e.bankAccount,
  bsb: e.bsb,
  salary: e.salary ? parseFloat(e.salary) : null,
  hourlyRate: e.hourlyRate ? parseFloat(e.hourlyRate) : null,
  createdAt: e.createdAt?.toISOString?.() ?? e.createdAt,
  updatedAt: e.updatedAt?.toISOString?.() ?? e.updatedAt,
});

// GET /employees
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { companyId, search, department, designation } = req.query;
    const conditions: SQL[] = [];
    if (companyId) conditions.push(eq(employeesTable.companyId, parseInt(companyId as string)));
    if (department) conditions.push(eq(employeesTable.department, department as string));
    if (designation) conditions.push(eq(employeesTable.designation, designation as string));

    let employees;
    if (conditions.length > 0) {
      employees = await db.select().from(employeesTable).where(and(...conditions));
    } else {
      employees = await db.select().from(employeesTable);
    }

    if (search) {
      const s = (search as string).toLowerCase();
      employees = employees.filter(e =>
        e.firstName.toLowerCase().includes(s) ||
        e.lastName.toLowerCase().includes(s) ||
        e.email.toLowerCase().includes(s) ||
        (e.employeeNumber?.toLowerCase().includes(s))
      );
    }

    res.json(employees.map(fmt));
  } catch (err) {
    logger.error({ err }, "List employees error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /employees
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { companyId, employeeNumber, firstName, lastName, email, phone, designation, department, joiningDate, address, abn, bankAccount, bsb, salary, hourlyRate } = req.body;
    if (!companyId || !firstName || !lastName || !email) {
      res.status(400).json({ error: "companyId, firstName, lastName, email are required" });
      return;
    }
    const [employee] = await db.insert(employeesTable).values({
      companyId, employeeNumber, firstName, lastName, email, phone, designation, department, joiningDate,
      address: address || null,
      abn: abn || null,
      bankAccount: bankAccount || null,
      bsb: bsb || null,
      salary: salary ? String(salary) : null,
      hourlyRate: hourlyRate ? String(hourlyRate) : null,
    }).returning();
    res.status(201).json(fmt(employee));
  } catch (err) {
    logger.error({ err }, "Create employee error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /employees/:id
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
    if (!employee) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(employee));
  } catch (err) {
    logger.error({ err }, "Get employee error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /employees/:id
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { employeeNumber, firstName, lastName, email, phone, designation, department, joiningDate, address, abn, bankAccount, bsb, salary, hourlyRate } = req.body;
    const [employee] = await db.update(employeesTable)
      .set({
        employeeNumber, firstName, lastName, email, phone, designation, department, joiningDate,
        address: address !== undefined ? address : undefined,
        abn: abn !== undefined ? abn : undefined,
        bankAccount: bankAccount !== undefined ? bankAccount : undefined,
        bsb: bsb !== undefined ? bsb : undefined,
        salary: salary !== undefined ? String(salary) : undefined,
        hourlyRate: hourlyRate !== undefined ? String(hourlyRate) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(employeesTable.id, id))
      .returning();
    if (!employee) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(employee));
  } catch (err) {
    logger.error({ err }, "Update employee error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /employees/:id
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(employeesTable).where(eq(employeesTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Delete employee error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
