import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { CalendarDays, CheckCircle2, ChevronRight, CircleX, FileText, Loader2, ShieldCheck } from "lucide-react";
import { payrollSlipFetch } from "./api";

type SlipSummary = { id: number; datePaid: string; periodEnd: string; employeeName: string; companyName: string; gross: number; net: number };
type Verification = { valid: boolean; slip?: { employeeName: string; companyName: string; datePaid: string; payRate: string; hours: string; verificationToken: string }; history?: SlipSummary[] };
const money = (n: string | number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(n) || 0);

export default function VerifyEmployeePaySlip() {
  const [, params] = useRoute("/employee-pay-slips/verify/:token");
  const [result, setResult] = useState<Verification | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { if (params?.token) payrollSlipFetch<Verification>(`/employee-pay-slips/verify/${params.token}`).then(setResult).catch(() => setFailed(true)); }, [params?.token]);
  if (!result && !failed) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>;
  const slip = result?.valid ? result.slip : undefined;
  const history = result?.history || [];
  return <main className="min-h-screen bg-slate-50 py-8 px-4"><div className="max-w-3xl mx-auto space-y-5"><section className="bg-white rounded-xl border shadow-sm p-7 text-center"><div className={`mx-auto mb-4 grid place-items-center rounded-full w-14 h-14 ${slip ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>{slip ? <CheckCircle2 /> : <CircleX />}</div><h1 className="text-2xl font-bold">{slip ? "Verified employee pay slip" : "Pay slip not found"}</h1>{slip ? <><p className="text-muted-foreground mt-2">This document was issued by {slip.companyName}.</p><dl className="text-left max-w-md mx-auto mt-6 border-t divide-y text-sm"><div className="flex justify-between py-3"><dt>Employee</dt><dd className="font-medium">{slip.employeeName}</dd></div><div className="flex justify-between py-3"><dt>Date paid</dt><dd className="font-medium">{slip.datePaid}</dd></div><div className="flex justify-between py-3"><dt>Gross earnings</dt><dd className="font-medium">{money(Number(slip.payRate) * Number(slip.hours))}</dd></div></dl><div className="text-xs text-muted-foreground flex justify-center gap-1 mt-6"><ShieldCheck className="w-4 h-4" /> Verification token confirmed</div></> : <p className="text-muted-foreground mt-2">The QR code is invalid or this pay slip is no longer available.</p>}</section>{slip && <section className="bg-white rounded-xl border shadow-sm overflow-hidden"><div className="p-5 border-b"><div className="flex items-center gap-2 font-semibold"><FileText className="h-5 w-5 text-muted-foreground" />All Salary Slips — {slip.employeeName}</div><p className="text-sm text-muted-foreground mt-1">Previous verified payroll records</p></div>{history.length ? <div>{history.map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-4 border-b last:border-0"><span className="h-2 w-2 rounded-full bg-slate-300" /><div className="flex-1"><p className="font-medium">{item.companyName}</p><p className="text-sm text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{item.datePaid || item.periodEnd}</p></div><strong>{money(item.net)}</strong><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>)}</div> : <p className="p-5 text-sm text-muted-foreground">No earlier pay slips are available for this employee.</p>}</section>}</div></main>;
}
