import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  payslipsTable,
  payslipItemsTable,
  employeesTable,
  companiesTable,
  auditLogsTable,
} from "@workspace/db";
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
  employee: employee
    ? {
        id: employee.id,
        companyId: employee.companyId,
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        designation: employee.designation,
        department: employee.department,
        joiningDate: employee.joiningDate,
        address: employee.address,
        abn: employee.abn,
        tfn: employee.tfn,
        bankAccount: employee.bankAccount,
        bsb: employee.bsb,
        salary: employee.salary ? parseFloat(employee.salary) : null,
        hourlyRate: employee.hourlyRate
          ? parseFloat(employee.hourlyRate)
          : null,
        createdAt: employee.createdAt?.toISOString?.() ?? employee.createdAt,
        updatedAt: employee.updatedAt?.toISOString?.() ?? employee.updatedAt,
      }
    : undefined,
  month: p.month,
  year: p.year,
  issueDate: p.issueDate,
  dueDate: p.dueDate,
  referenceNumber: p.referenceNumber,
  companyName: p.companyName,
  companyAbn: p.companyAbn,
  employeeName: p.employeeName,
  employeeNumber: p.employeeNumber,
  employeeAddress: p.employeeAddress,
  periodStart: p.periodStart,
  periodEnd: p.periodEnd,
  datePaid: p.datePaid,
  payRate: parseFloat(p.payRate || "0"),
  hours: parseFloat(p.hours || "0"),
  earningsName: p.earningsName,
  earningsNote: p.earningsNote,
  ytdEarnings: parseFloat(p.ytdEarnings || "0"),
  payg: parseFloat(p.payg || "0"),
  ytdPayg: parseFloat(p.ytdPayg || "0"),
  superFund: p.superFund,
  superName: p.superName,
  superType: p.superType,
  superMemberNumber: p.superMemberNumber,
  superAmount: parseFloat(p.superAmount || "0"),
  ytdSuper: parseFloat(p.ytdSuper || "0"),
  paymentMethod: p.paymentMethod,
  bankAccount: p.bankAccount,
  status: p.status,
  basicSalary: parseFloat(p.basicSalary || "0"),
  housingAllowance: parseFloat(p.housingAllowance || "0"),
  transportAllowance: parseFloat(p.transportAllowance || "0"),
  bonus: parseFloat(p.bonus || "0"),
  overtime: parseFloat(p.overtime || "0"),
  taxName: p.taxName,
  taxPercentage: p.taxPercentage ? parseFloat(p.taxPercentage) : null,
  showTfn: Boolean(p.showTfn),
  subtotal: parseFloat(p.subtotal || "0"),
  gstAmount: parseFloat(p.gstAmount || "0"),
  totalAmount: parseFloat(p.totalAmount || p.netSalary || "0"),
  grossSalary: parseFloat(p.grossSalary || p.subtotal || "0"),
  netSalary: parseFloat(p.netSalary || p.totalAmount || "0"),
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
    if (companyId)
      conditions.push(
        eq(payslipsTable.companyId, parseInt(companyId as string)),
      );
    if (employeeId)
      conditions.push(
        eq(payslipsTable.employeeId, parseInt(employeeId as string)),
      );
    if (month)
      conditions.push(eq(payslipsTable.month, parseInt(month as string)));
    if (year) conditions.push(eq(payslipsTable.year, parseInt(year as string)));
    if (status) conditions.push(eq(payslipsTable.status, status as string));

    const payslips =
      conditions.length > 0
        ? await db
            .select()
            .from(payslipsTable)
            .where(and(...conditions))
        : await db.select().from(payslipsTable);

    const employeeIds = [...new Set(payslips.map((p) => p.employeeId))];
    const employees =
      employeeIds.length > 0 ? await db.select().from(employeesTable) : [];
    const empMap = new Map(employees.map((e) => [e.id, e]));

    res.json(payslips.map((p) => fmt(p, empMap.get(p.employeeId))));
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
      companyId,
      employeeId,
      month,
      year,
      issueDate,
      dueDate,
      referenceNumber,
      companyName, companyAbn, employeeName, employeeNumber, employeeAddress,
      periodStart, periodEnd, datePaid, payRate, hours, earningsName,
      earningsNote, ytdEarnings, payg, ytdPayg, superFund, superName,
      superType, superMemberNumber, superAmount, ytdSuper, paymentMethod,
      bankAccount,
      taxName,
      taxPercentage,
      showTfn,
      basicSalary,
      housingAllowance,
      transportAllowance,
      bonus,
      overtime,
      tax,
      insurance,
      otherDeductions,
      grossSalary,
      netSalary,
      subtotal,
      gstAmount,
      totalAmount,
      items,
    } = req.body;

    if (!companyId || !employeeId || !month || !year) {
      res
        .status(400)
        .json({ error: "companyId, employeeId, month, year are required" });
      return;
    }
    const verificationToken = uuidv4();
    const [payslip] = await db
      .insert(payslipsTable)
      .values({
        companyId,
        employeeId,
        month,
        year,
        issueDate: issueDate || null,
        dueDate: dueDate || null,
        referenceNumber: referenceNumber || null,
        companyName: companyName || null,
        companyAbn: companyAbn || null,
        employeeName: employeeName || null,
        employeeNumber: employeeNumber || null,
        employeeAddress: employeeAddress || null,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        datePaid: datePaid || null,
        payRate: String(payRate || 0), hours: String(hours || 0),
        earningsName: earningsName || null, earningsNote: earningsNote || null,
        ytdEarnings: String(ytdEarnings || 0), payg: String(payg || 0), ytdPayg: String(ytdPayg || 0),
        superFund: superFund || null, superName: superName || null, superType: superType || null,
        superMemberNumber: superMemberNumber || null, superAmount: String(superAmount || 0),
        ytdSuper: String(ytdSuper || 0), paymentMethod: paymentMethod || null, bankAccount: bankAccount || null,
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
        taxName: taxName || null,
        taxPercentage:
          taxPercentage !== undefined ? String(taxPercentage) : null,
        showTfn: Boolean(showTfn),
        verificationToken,
      })
      .returning();

    // Insert line items if provided
    if (Array.isArray(items) && items.length > 0) {
      await db.insert(payslipItemsTable).values(
        items.map((item: any) => ({
          payslipId: payslip.id,
          date: item.date || null,
          description:
            item.description || "Daily subcontract painting services",
          quantity: String(item.quantity || 0),
          unitPrice: String(item.unitPrice || 0),
          taxRate: String(item.taxRate ?? 10),
          amount: String(item.amount || 0),
        })),
      );
    }

    await db.insert(auditLogsTable).values({
      userId: user.id,
      action: "Created Payslip",
      entity: "payslip",
      entityId: payslip.id,
      description: `Payslip for employee ${employeeId} month ${month}/${year}`,
    });
    const [employee] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, payslip.employeeId));
    const savedItems = await db
      .select()
      .from(payslipItemsTable)
      .where(eq(payslipItemsTable.payslipId, payslip.id));
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
    const [payslip] = await db
      .select()
      .from(payslipsTable)
      .where(eq(payslipsTable.id, id));
    if (!payslip) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const [employee] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, payslip.employeeId));
    const items = await db
      .select()
      .from(payslipItemsTable)
      .where(eq(payslipItemsTable.payslipId, id));
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
    const {
      basicSalary,
      housingAllowance,
      transportAllowance,
      bonus,
      overtime,
      taxName,
      taxPercentage,
      showTfn,
      tax,
      insurance,
      otherDeductions,
      grossSalary,
      netSalary,
      subtotal,
      gstAmount,
      totalAmount,
      issueDate,
      dueDate,
      referenceNumber,
      companyName, companyAbn, employeeName, employeeNumber, employeeAddress,
      periodStart, periodEnd, datePaid, payRate, hours, earningsName,
      earningsNote, ytdEarnings, payg, ytdPayg, superFund, superName,
      superType, superMemberNumber, superAmount, ytdSuper, paymentMethod,
      bankAccount,
      status,
      month,
      year,
      items,
    } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (month !== undefined) updates.month = month;
    if (year !== undefined) updates.year = year;
    if (basicSalary !== undefined) updates.basicSalary = String(basicSalary);
    if (housingAllowance !== undefined)
      updates.housingAllowance = String(housingAllowance);
    if (transportAllowance !== undefined)
      updates.transportAllowance = String(transportAllowance);
    if (bonus !== undefined) updates.bonus = String(bonus);
    if (overtime !== undefined) updates.overtime = String(overtime);
    if (taxName !== undefined) updates.taxName = taxName || null;
    if (taxPercentage !== undefined)
      updates.taxPercentage = String(taxPercentage);
    if (showTfn !== undefined) updates.showTfn = Boolean(showTfn);
    if (tax !== undefined) updates.tax = String(tax);
    if (insurance !== undefined) updates.insurance = String(insurance);
    if (otherDeductions !== undefined)
      updates.otherDeductions = String(otherDeductions);
    if (grossSalary !== undefined) updates.grossSalary = String(grossSalary);
    if (netSalary !== undefined) updates.netSalary = String(netSalary);
    if (subtotal !== undefined) updates.subtotal = String(subtotal);
    if (gstAmount !== undefined) updates.gstAmount = String(gstAmount);
    if (totalAmount !== undefined) updates.totalAmount = String(totalAmount);
    if (issueDate !== undefined) updates.issueDate = issueDate;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (referenceNumber !== undefined)
      updates.referenceNumber = referenceNumber;
    for (const key of ["companyName", "companyAbn", "employeeName", "employeeNumber", "employeeAddress", "periodStart", "periodEnd", "datePaid", "earningsName", "earningsNote", "superFund", "superName", "superType", "superMemberNumber", "paymentMethod", "bankAccount"] as const) {
      if (req.body[key] !== undefined) updates[key] = req.body[key] || null;
    }
    for (const key of ["payRate", "hours", "ytdEarnings", "payg", "ytdPayg", "superAmount", "ytdSuper"] as const) {
      if (req.body[key] !== undefined) updates[key] = String(req.body[key] || 0);
    }
    if (status !== undefined) updates.status = status;

    const [payslip] = await db
      .update(payslipsTable)
      .set(updates)
      .where(eq(payslipsTable.id, id))
      .returning();
    if (!payslip) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    // Replace items if provided
    if (Array.isArray(items)) {
      await db
        .delete(payslipItemsTable)
        .where(eq(payslipItemsTable.payslipId, id));
      if (items.length > 0) {
        await db.insert(payslipItemsTable).values(
          items.map((item: any) => ({
            payslipId: id,
            date: item.date || null,
            description:
              item.description || "Daily subcontract painting services",
            quantity: String(item.quantity || 0),
            unitPrice: String(item.unitPrice || 0),
            taxRate: String(item.taxRate ?? 0),
            amount: String(item.amount || 0),
          })),
        );
      }
    }

    await db.insert(auditLogsTable).values({
      userId: user.id,
      action: "Updated Payslip",
      entity: "payslip",
      entityId: payslip.id,
    });
    const [employee] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, payslip.employeeId));
    const savedItems = await db
      .select()
      .from(payslipItemsTable)
      .where(eq(payslipItemsTable.payslipId, id));
    res.json(fmt(payslip, employee, savedItems));
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
    await db
      .delete(payslipItemsTable)
      .where(eq(payslipItemsTable.payslipId, id));
    await db.delete(payslipsTable).where(eq(payslipsTable.id, id));
    await db.insert(auditLogsTable).values({
      userId: user.id,
      action: "Deleted Payslip",
      entity: "payslip",
      entityId: id,
    });
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Delete payslip error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /payslips/:id/generate-pdf
router.post(
  "/:id/generate-pdf",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id);
      const [payslip] = await db
        .select()
        .from(payslipsTable)
        .where(eq(payslipsTable.id, id));
      if (!payslip) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const token = payslip.verificationToken || uuidv4();
      const pdfUrl = `/payslips/${id}/print`;
      const [updated] = await db
        .update(payslipsTable)
        .set({
          status: "generated",
          pdfUrl,
          verificationToken: token,
          updatedAt: new Date(),
        })
        .where(eq(payslipsTable.id, id))
        .returning();
      await db.insert(auditLogsTable).values({
        userId: user.id,
        action: "Generated PDF",
        entity: "payslip",
        entityId: id,
      });
      res.json({
        pdfUrl: updated.pdfUrl!,
        verificationToken: updated.verificationToken!,
      });
    } catch (err) {
      logger.error({ err }, "Generate payslip pdf error");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /payslips/:id/send-email
router.post(
  "/:id/send-email",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id);
      const [payslip] = await db
        .select()
        .from(payslipsTable)
        .where(eq(payslipsTable.id, id));
      if (!payslip) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      await db
        .update(payslipsTable)
        .set({ status: "sent", updatedAt: new Date() })
        .where(eq(payslipsTable.id, id));
      await db.insert(auditLogsTable).values({
        userId: user.id,
        action: "Sent Payslip Email",
        entity: "payslip",
        entityId: id,
      });
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "Send payslip email error");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
