import { Router, Request, Response } from "express";
import { db, employeePaySlipsTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "./auth";
import { logger } from "../lib/logger";

const router = Router();
const serialise = (row: any) => ({ id: row.id, ...(row.data as object), verificationToken: row.verificationToken, createdAt: row.createdAt, updatedAt: row.updatedAt });
const summary = (row: any) => {
  const data: any = row.data || {};
  const gross = (Number(data.payRate) || 0) * (Number(data.hours) || 0);
  return { id: row.id, datePaid: data.datePaid, periodEnd: data.periodEnd, employeeName: data.employeeName, companyName: data.companyName, gross, net: gross - (Number(data.payg) || 0) };
};

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  try { res.json((await db.select().from(employeePaySlipsTable).orderBy(desc(employeePaySlipsTable.createdAt))).map(serialise)); }
  catch (err) { logger.error({ err }, "List employee payslips error"); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const [created] = await db.insert(employeePaySlipsTable).values({ data: req.body, verificationToken: uuidv4() }).returning();
    res.status(201).json(serialise(created));
  } catch (err) { logger.error({ err }, "Create employee payslip error"); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const [updated] = await db.update(employeePaySlipsTable).set({ data: req.body, updatedAt: new Date() }).where(eq(employeePaySlipsTable.id, Number(req.params.id))).returning();
    if (!updated) return void res.status(404).json({ error: "Not found" });
    res.json(serialise(updated));
  } catch (err) { logger.error({ err }, "Update employee payslip error"); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try { await db.delete(employeePaySlipsTable).where(eq(employeePaySlipsTable.id, Number(req.params.id))); res.status(204).end(); }
  catch (err) { logger.error({ err }, "Delete employee payslip error"); res.status(500).json({ error: "Internal server error" }); }
});

// Public verification endpoint used by QR codes.
router.get("/verify/:token", async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const [slip] = await db.select().from(employeePaySlipsTable).where(eq(employeePaySlipsTable.verificationToken, token));
    if (!slip) return void res.status(404).json({ valid: false });
    const employeeId = String((slip.data as any)?.employeeId || "");
    const employeeSlips = employeeId
      ? await db.select().from(employeePaySlipsTable).where(sql`${employeePaySlipsTable.data}->>'employeeId' = ${employeeId}`).orderBy(desc(employeePaySlipsTable.createdAt))
      : [];
    res.json({ valid: true, documentType: "employee-pay-slip", slip: serialise(slip), history: employeeSlips.filter((row) => row.id !== slip.id).map(summary) });
  } catch (err) { logger.error({ err }, "Verify employee payslip error"); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
