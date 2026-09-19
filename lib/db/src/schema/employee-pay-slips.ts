import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/** A separate, detailed employee payslip format. Kept apart from legacy invoices/payslips. */
export const employeePaySlipsTable = pgTable("employee_pay_slips", {
  id: serial("id").primaryKey(),
  verificationToken: text("verification_token").notNull().unique(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
