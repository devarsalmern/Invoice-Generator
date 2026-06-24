import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth } from "./auth";

const router = Router();

const fmt = (c: any) => ({
  id: c.id,
  name: c.name,
  registrationNumber: c.registrationNumber,
  taxNumber: c.taxNumber,
  phone: c.phone,
  email: c.email,
  address: c.address,
  logoUrl: c.logoUrl,
  createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
  updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt,
});

// GET /companies
router.get("/", requireAuth, async (_req: Request, res: Response) => {
  try {
    const companies = await db.select().from(companiesTable);
    res.json(companies.map(fmt));
  } catch (err) {
    logger.error({ err }, "List companies error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /companies
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, registrationNumber, taxNumber, phone, email, address, logoUrl } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [company] = await db.insert(companiesTable).values({ name, registrationNumber, taxNumber, phone, email, address, logoUrl }).returning();
    res.status(201).json(fmt(company));
  } catch (err) {
    logger.error({ err }, "Create company error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /companies/:id
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id));
    if (!company) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(company));
  } catch (err) {
    logger.error({ err }, "Get company error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /companies/:id
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, registrationNumber, taxNumber, phone, email, address, logoUrl } = req.body;
    const [company] = await db.update(companiesTable)
      .set({ name, registrationNumber, taxNumber, phone, email, address, logoUrl, updatedAt: new Date() })
      .where(eq(companiesTable.id, id))
      .returning();
    if (!company) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(company));
  } catch (err) {
    logger.error({ err }, "Update company error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /companies/:id
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(companiesTable).where(eq(companiesTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Delete company error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
