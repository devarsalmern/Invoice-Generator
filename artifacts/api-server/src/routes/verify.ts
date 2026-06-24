import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { payslipsTable, payslipItemsTable, invoicesTable, companiesTable, employeesTable } from "@workspace/db";
import { eq, desc, ne } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// GET /verify/:token
router.get("/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // --- Payslip lookup ---
    const [payslip] = await db.select().from(payslipsTable).where(eq(payslipsTable.verificationToken, token));
    if (payslip) {
      const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, payslip.companyId));
      const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, payslip.employeeId));
      const items = await db.select().from(payslipItemsTable).where(eq(payslipItemsTable.payslipId, payslip.id));

      // Past payslips for this employee (all except the current one)
      const pastPayslips = await db
        .select()
        .from(payslipsTable)
        .where(eq(payslipsTable.employeeId, payslip.employeeId))
        .orderBy(desc(payslipsTable.issueDate), desc(payslipsTable.id));

      const parseNum = (v: any) => (v !== null && v !== undefined ? parseFloat(v) : 0);

      res.json({
        valid: true,
        documentType: "payslip",
        payslip: {
          id: payslip.id,
          companyId: payslip.companyId,
          employeeId: payslip.employeeId,
          month: payslip.month,
          year: payslip.year,
          issueDate: payslip.issueDate,
          dueDate: payslip.dueDate,
          referenceNumber: payslip.referenceNumber,
          subtotal: parseNum(payslip.subtotal),
          gstAmount: parseNum(payslip.gstAmount),
          totalAmount: parseNum(payslip.totalAmount),
          grossSalary: parseNum(payslip.grossSalary),
          netSalary: parseNum(payslip.netSalary),
          status: payslip.status,
          verificationToken: payslip.verificationToken,
          items: items.map(i => ({
            id: i.id,
            date: i.date,
            description: i.description,
            quantity: parseNum(i.quantity),
            unitPrice: parseNum(i.unitPrice),
            taxRate: parseNum(i.taxRate),
            amount: parseNum(i.amount),
          })),
          employee: employee ? {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            address: (employee as any).address ?? null,
            abn: (employee as any).abn ?? null,
            bsb: (employee as any).bsb ?? null,
            bankAccount: employee.bankAccount ?? null,
          } : null,
        },
        company: company ? {
          id: company.id,
          name: company.name,
          taxNumber: company.taxNumber,
          email: company.email,
          phone: company.phone,
          address: company.address,
          logo: company.logo,
        } : null,
        history: pastPayslips.map(p => ({
          id: p.id,
          month: p.month,
          year: p.year,
          issueDate: p.issueDate,
          referenceNumber: p.referenceNumber,
          totalAmount: parseNum(p.totalAmount) || parseNum(p.netSalary),
          status: p.status,
          verificationToken: p.verificationToken,
          isCurrent: p.id === payslip.id,
        })),
      });
      return;
    }

    // --- Invoice lookup ---
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.verificationToken, token));
    if (invoice) {
      const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, invoice.companyId));
      res.json({
        valid: true,
        documentType: "invoice",
        payslip: null,
        company: company ? {
          id: company.id,
          name: company.name,
          taxNumber: company.taxNumber,
          email: company.email,
          phone: company.phone,
        } : null,
        history: [],
        // Legacy fields for backward compat
        status: invoice.status,
        issuedBy: company?.name || "Unknown Company",
        documentNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        amount: parseFloat(invoice.totalAmount),
      });
      return;
    }

    res.json({ valid: false, documentType: null, payslip: null, company: null, history: [] });
  } catch (err) {
    logger.error({ err }, "Verify document error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
