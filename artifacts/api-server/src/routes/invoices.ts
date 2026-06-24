import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { invoicesTable, invoiceItemsTable, auditLogsTable } from "@workspace/db";
import { eq, and, SQL, gte, lte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";
import { requireAuth } from "./auth";

const router = Router();

const fmtItem = (item: any) => ({
  id: item.id,
  invoiceId: item.invoiceId,
  description: item.description,
  quantity: parseFloat(item.quantity || "0"),
  unitPrice: parseFloat(item.unitPrice || "0"),
  taxRate: parseFloat(item.taxRate || "0"),
  amount: parseFloat(item.amount || "0"),
});

const fmt = (inv: any, items: any[] = []) => ({
  id: inv.id,
  companyId: inv.companyId,
  invoiceNumber: inv.invoiceNumber,
  customerName: inv.customerName,
  customerEmail: inv.customerEmail,
  customerAddress: inv.customerAddress,
  issueDate: inv.issueDate,
  dueDate: inv.dueDate,
  subtotal: parseFloat(inv.subtotal || "0"),
  taxAmount: parseFloat(inv.taxAmount || "0"),
  totalAmount: parseFloat(inv.totalAmount || "0"),
  status: inv.status,
  pdfUrl: inv.pdfUrl,
  verificationToken: inv.verificationToken,
  items: items.map(fmtItem),
  createdAt: inv.createdAt?.toISOString?.() ?? inv.createdAt,
  updatedAt: inv.updatedAt?.toISOString?.() ?? inv.updatedAt,
});

async function getInvoiceWithItems(id: number) {
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!invoice) return null;
  const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
  return fmt(invoice, items);
}

// GET /invoices
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { companyId, status, search, from, to } = req.query;
    const conditions: SQL[] = [];
    if (companyId) conditions.push(eq(invoicesTable.companyId, parseInt(companyId as string)));
    if (status) conditions.push(eq(invoicesTable.status, status as string));
    if (from) conditions.push(gte(invoicesTable.issueDate, from as string));
    if (to) conditions.push(lte(invoicesTable.issueDate, to as string));

    let invoices = conditions.length > 0
      ? await db.select().from(invoicesTable).where(and(...conditions))
      : await db.select().from(invoicesTable);

    if (search) {
      const s = (search as string).toLowerCase();
      invoices = invoices.filter(i =>
        i.invoiceNumber.toLowerCase().includes(s) ||
        i.customerName.toLowerCase().includes(s)
      );
    }

    const invoiceIds = invoices.map(i => i.id);
    const allItems = invoiceIds.length > 0
      ? await db.select().from(invoiceItemsTable)
      : [];
    const itemsByInvoice = new Map<number, typeof allItems>();
    for (const item of allItems) {
      if (!itemsByInvoice.has(item.invoiceId)) itemsByInvoice.set(item.invoiceId, []);
      itemsByInvoice.get(item.invoiceId)!.push(item);
    }

    res.json(invoices.map(i => fmt(i, itemsByInvoice.get(i.id) || [])));
  } catch (err) {
    logger.error({ err }, "List invoices error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /invoices
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { companyId, invoiceNumber, customerName, customerEmail, customerAddress, issueDate, dueDate, subtotal, taxAmount, totalAmount, items } = req.body;
    if (!companyId || !customerName || !issueDate || !dueDate) {
      res.status(400).json({ error: "companyId, customerName, issueDate, dueDate are required" });
      return;
    }
    const invNum = invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
    const verificationToken = uuidv4();
    const [invoice] = await db.insert(invoicesTable).values({
      companyId, invoiceNumber: invNum, customerName, customerEmail, customerAddress,
      issueDate, dueDate,
      subtotal: String(subtotal || 0),
      taxAmount: String(taxAmount || 0),
      totalAmount: String(totalAmount || 0),
      verificationToken,
    }).returning();

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await db.insert(invoiceItemsTable).values({
          invoiceId: invoice.id,
          description: item.description,
          quantity: String(item.quantity || 1),
          unitPrice: String(item.unitPrice || 0),
          taxRate: String(item.taxRate || 0),
          amount: String(item.amount || 0),
        });
      }
    }

    await db.insert(auditLogsTable).values({ userId: user.id, action: "Generated Invoice", entity: "invoice", entityId: invoice.id, description: `Invoice ${invNum}` });
    const result = await getInvoiceWithItems(invoice.id);
    res.status(201).json(result);
  } catch (err) {
    logger.error({ err }, "Create invoice error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /invoices/:id
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await getInvoiceWithItems(id);
    if (!result) { res.status(404).json({ error: "Not found" }); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Get invoice error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /invoices/:id
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { customerName, customerEmail, customerAddress, issueDate, dueDate, subtotal, taxAmount, totalAmount, status, items } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (customerName !== undefined) updates.customerName = customerName;
    if (customerEmail !== undefined) updates.customerEmail = customerEmail;
    if (customerAddress !== undefined) updates.customerAddress = customerAddress;
    if (issueDate !== undefined) updates.issueDate = issueDate;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (subtotal !== undefined) updates.subtotal = String(subtotal);
    if (taxAmount !== undefined) updates.taxAmount = String(taxAmount);
    if (totalAmount !== undefined) updates.totalAmount = String(totalAmount);
    if (status !== undefined) updates.status = status;
    const [invoice] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, id)).returning();
    if (!invoice) { res.status(404).json({ error: "Not found" }); return; }

    if (items && Array.isArray(items)) {
      await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
      for (const item of items) {
        await db.insert(invoiceItemsTable).values({
          invoiceId: id, description: item.description,
          quantity: String(item.quantity || 1), unitPrice: String(item.unitPrice || 0),
          taxRate: String(item.taxRate || 0), amount: String(item.amount || 0),
        });
      }
    }
    await db.insert(auditLogsTable).values({ userId: user.id, action: "Updated Invoice", entity: "invoice", entityId: id });
    const result = await getInvoiceWithItems(id);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Update invoice error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /invoices/:id
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
    await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
    await db.insert(auditLogsTable).values({ userId: user.id, action: "Deleted Invoice", entity: "invoice", entityId: id });
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Delete invoice error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /invoices/:id/generate-pdf
router.post("/:id/generate-pdf", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
    if (!invoice) { res.status(404).json({ error: "Not found" }); return; }
    const token = invoice.verificationToken || uuidv4();
    const pdfUrl = `/api/invoices/${id}/pdf`;
    const [updated] = await db.update(invoicesTable)
      .set({ pdfUrl, verificationToken: token, updatedAt: new Date() })
      .where(eq(invoicesTable.id, id))
      .returning();
    await db.insert(auditLogsTable).values({ userId: user.id, action: "Generated Invoice PDF", entity: "invoice", entityId: id });
    res.json({ pdfUrl: updated.pdfUrl!, verificationToken: updated.verificationToken! });
  } catch (err) {
    logger.error({ err }, "Generate invoice pdf error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /invoices/:id/send-email
router.post("/:id/send-email", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
    if (!invoice) { res.status(404).json({ error: "Not found" }); return; }
    await db.update(invoicesTable).set({ status: "sent", updatedAt: new Date() }).where(eq(invoicesTable.id, id));
    await db.insert(auditLogsTable).values({ userId: user.id, action: "Sent Invoice Email", entity: "invoice", entityId: id });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Send invoice email error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /invoices/:id/mark-paid
router.post("/:id/mark-paid", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const [invoice] = await db.update(invoicesTable).set({ status: "paid", updatedAt: new Date() }).where(eq(invoicesTable.id, id)).returning();
    if (!invoice) { res.status(404).json({ error: "Not found" }); return; }
    await db.insert(auditLogsTable).values({ userId: user.id, action: "Marked Invoice Paid", entity: "invoice", entityId: id });
    const result = await getInvoiceWithItems(id);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Mark invoice paid error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
