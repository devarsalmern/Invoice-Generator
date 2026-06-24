import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { payslipsTable, invoicesTable, companiesTable, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// GET /verify/:token
router.get("/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Check payslips
    const [payslip] = await db.select().from(payslipsTable).where(eq(payslipsTable.verificationToken, token));
    if (payslip) {
      const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, payslip.companyId));
      const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, payslip.employeeId));
      res.json({
        valid: true,
        documentType: "payslip",
        status: payslip.status,
        issuedBy: company?.name || "Unknown Company",
        documentNumber: `PAY-${String(payslip.id).padStart(4, "0")}`,
        issueDate: `${payslip.month}/${payslip.year}`,
        amount: parseFloat(payslip.netSalary),
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : null,
        month: payslip.month,
        year: payslip.year,
      });
      return;
    }

    // Check invoices
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.verificationToken, token));
    if (invoice) {
      const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, invoice.companyId));
      res.json({
        valid: true,
        documentType: "invoice",
        status: invoice.status,
        issuedBy: company?.name || "Unknown Company",
        documentNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        amount: parseFloat(invoice.totalAmount),
        employeeName: null,
        month: null,
        year: null,
      });
      return;
    }

    res.json({ valid: false, documentType: null, status: null, issuedBy: null, documentNumber: null, issueDate: null, amount: null, employeeName: null, month: null, year: null });
  } catch (err) {
    logger.error({ err }, "Verify document error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
