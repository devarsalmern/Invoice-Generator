import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { payslipsTable, payslipItemsTable, employeesTable, companiesTable, auditLogsTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";
import { requireAuth } from "./auth";

const router = Router();

const fmtItem = (item: any) => ({
  id: item.id,
  payslipId: item.payslipId,
  date: item.date,
  description: item.description,
  quantity: parseFloat(item.quantity || "0"),
  unitPrice: parseFloat(item.unitPrice || "0"),
  taxRate: parseFloat(item.taxRate || "10"),
  amount: parseFloat(item.amount || "0"),
});

const fmt = (p: any, employee?: any, items?: any[]) => ({
  id: p.id,
  companyId: p.companyId,
  employeeId: p.employeeId,
  employee: employee ? {
    id: employee.id, companyId: employee.companyId, employeeNumber: employee.employeeNumber,
    firstName: employee.firstName, lastName: employee.lastName, email: employee.email,
    phone: employee.phone, designation: employee.designation, department: employee.department,
    joiningDate: employee.joiningDate,
    address: employee.address,
    abn: employee.abn,
    bankAccount: employee.bankAccount,
    bsb: employee.bsb,
    salary: employee.salary ? parseFloat(employee.salary) : null,
    hourlyRate: employee.hourlyRate ? parseFloat(employee.hourlyRate) : null,
    createdAt: employee.createdAt?.toISOString?.() ?? employee.createdAt,
    updatedAt: employee.updatedAt?.toISOString?.() ?? employee.updatedAt,
  } : undefined,
  month: p.month,
  year: p.year,
  issueDate: p.issueDate,
  dueDate: p.dueDate,
  referenceNumber: p.referenceNumber,
  basicSalary: parseFloat(p.basicSalary || "0"),
  housingAllowance: parseFloat(p.housingAllowance || "0"),
  transportAllowance: parseFloat(p.transportAllowance || "0"),
  bonus: parseFloat(p.bonus || "0"),
  overtime: parseFloat(p.overtime || "0"),
  tax: parseFloat(p.tax || "0"),
  insurance: parseFloat(p.insurance || "0"),
  otherDeductions: parseFloat(p.otherDeductions || "0"),
  subtotal: p.subtotal ? parseFloat(p.subtotal) : null,
  gstAmount: p.gstAmount ? parseFloat(p.gstAmount) : null,
  totalAmount: p.totalAmount ? parseFloat(p.totalAmount) : null,
  grossSalary: parseFloat(p.grossSalary || "0"),
  netSalary: parseFloat(p.netSalary || "0"),
  status: p.status,
  pdfUrl: p.pdfUrl,
  verificationToken: p.verificationToken,
  items: items ? items.map(fmtItem) : [],
  createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
  updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
});

// GET /payslips
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { companyId, employeeId, month, year, status } = req.query;
    const conditions: SQL[] = [];
    if (companyId) conditions.push(eq(payslipsTable.companyId, parseInt(companyId as string)));
    if (employeeId) conditions.push(eq(payslipsTable.employeeId, parseInt(employeeId as string)));
    if (month) conditions.push(eq(payslipsTable.month, parseInt(month as string)));
    if (year) conditions.push(eq(payslipsTable.year, parseInt(year as string)));
    if (status) conditions.push(eq(payslipsTable.status, status as string));

    const payslips = conditions.length > 0
      ? await db.select().from(payslipsTable).where(and(...conditions))
      : await db.select().from(payslipsTable);

    const employeeIds = [...new Set(payslips.map(p => p.employeeId))];
    const employees = employeeIds.length > 0
      ? await db.select().from(employeesTable)
      : [];
    const empMap = new Map(employees.map(e => [e.id, e]));

    res.json(payslips.map(p => fmt(p, empMap.get(p.employeeId))));
  } catch (err) {
    logger.error({ err }, "List payslips error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /payslips
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      companyId, employeeId, month, year,
      issueDate, dueDate, referenceNumber,
      basicSalary, housingAllowance, transportAllowance, bonus, overtime,
      tax, insurance, otherDeductions, grossSalary, netSalary,
      subtotal, gstAmount, totalAmount,
      items,
    } = req.body;

    if (!companyId || !employeeId || !month || !year) {
      res.status(400).json({ error: "companyId, employeeId, month, year are required" });
      return;
    }
    const verificationToken = uuidv4();
    const [payslip] = await db.insert(payslipsTable).values({
      companyId, employeeId, month, year,
      issueDate: issueDate || null,
      dueDate: dueDate || null,
      referenceNumber: referenceNumber || null,
      basicSalary: String(basicSalary || 0),
      housingAllowance: String(housingAllowance || 0),
      transportAllowance: String(transportAllowance || 0),
      bonus: String(bonus || 0),
      overtime: String(overtime || 0),
      tax: String(tax || 0),
      insurance: String(insurance || 0),
      otherDeductions: String(otherDeductions || 0),
      subtotal: subtotal !== undefined ? String(subtotal) : null,
      gstAmount: gstAmount !== undefined ? String(gstAmount) : null,
      totalAmount: totalAmount !== undefined ? String(totalAmount) : null,
      grossSalary: String(grossSalary || subtotal || 0),
      netSalary: String(netSalary || totalAmount || 0),
      verificationToken,
    }).returning();

    // Insert line items if provided
    if (Array.isArray(items) && items.length > 0) {
      await db.insert(payslipItemsTable).values(
        items.map((item: any) => ({
          payslipId: payslip.id,
          date: item.date || null,
          description: item.description || "Daily subcontract painting services",
          quantity: String(item.quantity || 0),
          unitPrice: String(item.unitPrice || 0),
          taxRate: String(item.taxRate ?? 10),
          amount: String(item.amount || 0),
        }))
      );
    }

    await db.insert(auditLogsTable).values({ userId: user.id, action: "Created Payslip", entity: "payslip", entityId: payslip.id, description: `Payslip for employee ${employeeId} month ${month}/${year}` });
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, payslip.employeeId));
    const savedItems = await db.select().from(payslipItemsTable).where(eq(payslipItemsTable.payslipId, payslip.id));
    res.status(201).json(fmt(payslip, employee, savedItems));
  } catch (err) {
    logger.error({ err }, "Create payslip error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /payslips/:id
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [payslip] = await db.select().from(payslipsTable).where(eq(payslipsTable.id, id));
    if (!payslip) { res.status(404).json({ error: "Not found" }); return; }
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, payslip.employeeId));
    const items = await db.select().from(payslipItemsTable).where(eq(payslipItemsTable.payslipId, id));
    res.json(fmt(payslip, employee, items));
  } catch (err) {
    logger.error({ err }, "Get payslip error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /payslips/:id
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { basicSalary, housingAllowance, transportAllowance, bonus, overtime, tax, insurance, otherDeductions, grossSalary, netSalary, subtotal, gstAmount, totalAmount, issueDate, dueDate, referenceNumber, status } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (basicSalary !== undefined) updates.basicSalary = String(basicSalary);
    if (housingAllowance !== undefined) updates.housingAllowance = String(housingAllowance);
    if (transportAllowance !== undefined) updates.transportAllowance = String(transportAllowance);
    if (bonus !== undefined) updates.bonus = String(bonus);
    if (overtime !== undefined) updates.overtime = String(overtime);
    if (tax !== undefined) updates.tax = String(tax);
    if (insurance !== undefined) updates.insurance = String(insurance);
    if (otherDeductions !== undefined) updates.otherDeductions = String(otherDeductions);
    if (grossSalary !== undefined) updates.grossSalary = String(grossSalary);
    if (netSalary !== undefined) updates.netSalary = String(netSalary);
    if (subtotal !== undefined) updates.subtotal = String(subtotal);
    if (gstAmount !== undefined) updates.gstAmount = String(gstAmount);
    if (totalAmount !== undefined) updates.totalAmount = String(totalAmount);
    if (issueDate !== undefined) updates.issueDate = issueDate;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (referenceNumber !== undefined) updates.referenceNumber = referenceNumber;
    if (status !== undefined) updates.status = status;
    const [payslip] = await db.update(payslipsTable).set(updates).where(eq(payslipsTable.id, id)).returning();
    if (!payslip) { res.status(404).json({ error: "Not found" }); return; }
    await db.insert(auditLogsTable).values({ userId: user.id, action: "Updated Payslip", entity: "payslip", entityId: payslip.id });
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, payslip.employeeId));
    const items = await db.select().from(payslipItemsTable).where(eq(payslipItemsTable.payslipId, id));
    res.json(fmt(payslip, employee, items));
  } catch (err) {
    logger.error({ err }, "Update payslip error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /payslips/:id
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    await db.delete(payslipItemsTable).where(eq(payslipItemsTable.payslipId, id));
    await db.delete(payslipsTable).where(eq(payslipsTable.id, id));
    await db.insert(auditLogsTable).values({ userId: user.id, action: "Deleted Payslip", entity: "payslip", entityId: id });
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Delete payslip error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /payslips/:id/generate-pdf
router.post("/:id/generate-pdf", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const [payslip] = await db.select().from(payslipsTable).where(eq(payslipsTable.id, id));
    if (!payslip) { res.status(404).json({ error: "Not found" }); return; }
    const token = payslip.verificationToken || uuidv4();
    const pdfUrl = `/payslips/${id}/print`;
    const [updated] = await db.update(payslipsTable)
      .set({ status: "generated", pdfUrl, verificationToken: token, updatedAt: new Date() })
      .where(eq(payslipsTable.id, id))
      .returning();
    await db.insert(auditLogsTable).values({ userId: user.id, action: "Generated PDF", entity: "payslip", entityId: id });
    res.json({ pdfUrl: updated.pdfUrl!, verificationToken: updated.verificationToken! });
  } catch (err) {
    logger.error({ err }, "Generate payslip pdf error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /payslips/:id/send-email
router.post("/:id/send-email", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const [payslip] = await db.select().from(payslipsTable).where(eq(payslipsTable.id, id));
    if (!payslip) { res.status(404).json({ error: "Not found" }); return; }
    await db.update(payslipsTable).set({ status: "sent", updatedAt: new Date() }).where(eq(payslipsTable.id, id));
    await db.insert(auditLogsTable).values({ userId: user.id, action: "Sent Payslip Email", entity: "payslip", entityId: id });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Send payslip email error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
