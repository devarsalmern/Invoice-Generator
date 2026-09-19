import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companiesRouter from "./companies";
import employeesRouter from "./employees";
import payslipsRouter from "./payslips";
import invoicesRouter from "./invoices";
import verifyRouter from "./verify";
import dashboardRouter from "./dashboard";
import auditLogsRouter from "./audit-logs";
import employeePaySlipsRouter from "./employee-pay-slips";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/companies", companiesRouter);
router.use("/employees", employeesRouter);
router.use("/payslips", payslipsRouter);
router.use("/invoices", invoicesRouter);
router.use("/verify", verifyRouter);
router.use("/dashboard", dashboardRouter);
router.use("/audit-logs", auditLogsRouter);
router.use("/employee-pay-slips", employeePaySlipsRouter);

export default router;
