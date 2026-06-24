import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { employeesTable, payslipsTable, invoicesTable, auditLogsTable, usersTable } from "@workspace/db";
import { eq, and, SQL, count, sum } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth } from "./auth";

const router = Router();

// GET /dashboard/summary
router.get("/summary", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;

    const empCond: SQL[] = companyId ? [eq(employeesTable.companyId, companyId)] : [];
    const payCond: SQL[] = companyId ? [eq(payslipsTable.companyId, companyId)] : [];
    const invCond: SQL[] = companyId ? [eq(invoicesTable.companyId, companyId)] : [];

    const [empCount] = await db.select({ count: count() }).from(employeesTable).where(empCond.length ? and(...empCond) : undefined);
    const [payCount] = await db.select({ count: count() }).from(payslipsTable).where(payCond.length ? and(...payCond) : undefined);

    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();
    const monthlyPayCond = companyId
      ? [eq(payslipsTable.companyId, companyId), eq(payslipsTable.month, thisMonth), eq(payslipsTable.year, thisYear)]
      : [eq(payslipsTable.month, thisMonth), eq(payslipsTable.year, thisYear)];
    const [monthlyPayroll] = await db.select({ total: sum(payslipsTable.netSalary) }).from(payslipsTable).where(and(...monthlyPayCond));

    const invoices = invCond.length
      ? await db.select().from(invoicesTable).where(and(...invCond))
      : await db.select().from(invoicesTable);

    const pending = invoices.filter(i => i.status === "sent" || i.status === "draft").length;
    const paid = invoices.filter(i => i.status === "paid").length;
    const overdue = invoices.filter(i => i.status === "overdue").length;
    const revenueTotal = invoices.filter(i => i.status === "paid").reduce((acc, i) => acc + parseFloat(i.totalAmount), 0);

    res.json({
      totalEmployees: empCount.count,
      totalPayslips: payCount.count,
      totalInvoices: invoices.length,
      monthlyPayroll: parseFloat(monthlyPayroll.total || "0"),
      pendingInvoices: pending,
      paidInvoices: paid,
      overdueInvoices: overdue,
      revenueTotal,
    });
  } catch (err) {
    logger.error({ err }, "Dashboard summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/payroll-trend
router.get("/payroll-trend", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
    const payslips = companyId
      ? await db.select().from(payslipsTable).where(eq(payslipsTable.companyId, companyId))
      : await db.select().from(payslipsTable);

    const now = new Date();
    const trend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const monthSlips = payslips.filter(p => p.month === m && p.year === y);
      const totalPayroll = monthSlips.reduce((acc, p) => acc + parseFloat(p.netSalary), 0);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      trend.push({ month: m, year: y, label: `${monthNames[m - 1]} ${y}`, totalPayroll, payslipCount: monthSlips.length });
    }
    res.json(trend);
  } catch (err) {
    logger.error({ err }, "Payroll trend error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/invoice-trend
router.get("/invoice-trend", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
    const invoices = companyId
      ? await db.select().from(invoicesTable).where(eq(invoicesTable.companyId, companyId))
      : await db.select().from(invoicesTable);

    const now = new Date();
    const trend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const monthInvs = invoices.filter(inv => {
        const date = new Date(inv.issueDate);
        return date.getMonth() + 1 === m && date.getFullYear() === y;
      });
      const totalAmount = monthInvs.reduce((acc, inv) => acc + parseFloat(inv.totalAmount), 0);
      const paidAmount = monthInvs.filter(inv => inv.status === "paid").reduce((acc, inv) => acc + parseFloat(inv.totalAmount), 0);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      trend.push({ month: m, year: y, label: `${monthNames[m - 1]} ${y}`, totalAmount, invoiceCount: monthInvs.length, paidAmount });
    }
    res.json(trend);
  } catch (err) {
    logger.error({ err }, "Invoice trend error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/recent-activity
router.get("/recent-activity", requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
    const limitVal = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const logs = await db.select().from(auditLogsTable).limit(limitVal);
    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean) as number[])];
    const users = userIds.length > 0 ? await db.select().from(usersTable) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    res.json(logs.map(l => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      description: l.description,
      userName: l.userId ? userMap.get(l.userId)?.name || null : null,
      timestamp: l.timestamp?.toISOString?.() ?? l.timestamp,
    })));
  } catch (err) {
    logger.error({ err }, "Recent activity error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
