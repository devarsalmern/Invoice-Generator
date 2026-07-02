import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { auditLogsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth } from "./auth";

const router = Router();

// GET /audit-logs
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const logs = await db.select().from(auditLogsTable).limit(limit).offset(offset);
    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean) as number[])];
    const users = userIds.length > 0 ? await db.select().from(usersTable) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    res.json(logs.map(l => ({
      id: l.id,
      userId: l.userId,
      userName: l.userId ? userMap.get(l.userId)?.name || null : null,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      timestamp: l.timestamp?.toISOString?.() ?? l.timestamp,
    })));
  } catch (err) {
    logger.error({ err }, "List audit logs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
