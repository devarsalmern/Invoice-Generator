import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const payslipsTable = pgTable("payslips", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  issueDate: text("issue_date"),
  dueDate: text("due_date"),
  referenceNumber: text("reference_number"),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  housingAllowance: numeric("housing_allowance", { precision: 12, scale: 2 }).notNull().default("0"),
  transportAllowance: numeric("transport_allowance", { precision: 12, scale: 2 }).notNull().default("0"),
  bonus: numeric("bonus", { precision: 12, scale: 2 }).notNull().default("0"),
  overtime: numeric("overtime", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  insurance: numeric("insurance", { precision: 12, scale: 2 }).notNull().default("0"),
  otherDeductions: numeric("other_deductions", { precision: 12, scale: 2 }).notNull().default("0"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
  gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
  grossSalary: numeric("gross_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  netSalary: numeric("net_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("draft"),
  pdfUrl: text("pdf_url"),
  verificationToken: text("verification_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payslipItemsTable = pgTable("payslip_items", {
  id: serial("id").primaryKey(),
  payslipId: integer("payslip_id").notNull(),
  date: text("date"),
  description: text("description").notNull().default("Daily subcontract painting services"),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("0"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("10"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const insertPayslipSchema = createInsertSchema(payslipsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayslip = z.infer<typeof insertPayslipSchema>;
export type Payslip = typeof payslipsTable.$inferSelect;
export type PayslipItem = typeof payslipItemsTable.$inferSelect;
