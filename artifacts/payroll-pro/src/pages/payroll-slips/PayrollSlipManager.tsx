import { useEffect, useMemo, useState } from "react";
import { getListEmployeesQueryKey, useListCompanies, useListEmployees } from "@workspace/api-client-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FilePlus2, Printer, QrCode, Save, Trash2, WalletCards } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { payrollSlipFetch } from "./api";

type PayrollSlip = {
  id: number | null;
  verificationToken?: string;
  companyId: string;
  employeeId: string;
  companyName: string;
  companyAbn: string;
  employeeName: string;
  employeeNumber: string;
  employeeAddress: string;
  periodStart: string;
  periodEnd: string;
  datePaid: string;
  payRate: string;
  hours: string;
  earningsName: string;
  earningsNote: string;
  ytdEarnings: string;
  taxName: string;
  payg: string;
  ytdPayg: string;
  superFund: string;
  superName: string;
  superType: string;
  superMemberNumber: string;
  superAmount: string;
  ytdSuper: string;
  paymentMethod: string;
  bankAccount: string;
};

const money = (value: string | number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(value) || 0);
const number = (value: string) => Number(value) || 0;
const date = () => new Date().toISOString().slice(0, 10);
const blank = (): PayrollSlip => ({
  id: null, companyId: "", employeeId: "", companyName: "", companyAbn: "", employeeName: "",
  employeeNumber: "", employeeAddress: "", periodStart: date(), periodEnd: date(), datePaid: date(), payRate: "0",
  hours: "0", earningsName: "Permanent Ordinary Hours", earningsNote: "", ytdEarnings: "0", taxName: "PAYG", payg: "0", ytdPayg: "0",
  superFund: "AustralianSuper", superName: "SG", superType: "Super Guarantee", superMemberNumber: "", superAmount: "0", ytdSuper: "0",
  paymentMethod: "Manual deposit", bankAccount: "",
});

function SlipPreview({ slip }: { slip: PayrollSlip }) {
  const gross = number(slip.payRate) * number(slip.hours);
  const net = gross - number(slip.payg);
  const row = "grid grid-cols-[minmax(210px,1fr)_100px_100px_110px_120px] gap-2 items-center";
  const verifyUrl = slip.verificationToken ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/employee-pay-slips/verify/${slip.verificationToken}` : "";
  return (
    <article className="payroll-slip bg-white text-slate-900 p-8 md:p-10 text-sm min-h-[297mm]">
      <div className="flex justify-between items-start gap-8 mb-14">
        <div className="pt-36 whitespace-pre-line leading-7">{slip.employeeName || "Employee name"}{"\n"}{slip.employeeAddress || "Employee address"}</div>
        <div className="w-[335px] rounded-md bg-slate-50 p-5 leading-7">
          <div className="font-bold text-base leading-5 mb-3">{slip.companyName || "Company name"}</div>
          <div className="flex justify-between gap-4"><span>ABN:</span><strong>{slip.companyAbn || "—"}</strong></div>
          <div className="flex justify-between gap-4"><span>Period Starting:</span><strong>{formatDate(slip.periodStart)}</strong></div>
          <div className="flex justify-between gap-4"><span>Period Ending:</span><strong>{formatDate(slip.periodEnd)}</strong></div>
          <div className="flex justify-between gap-4"><span>Date Paid:</span><strong>{formatDate(slip.datePaid)}</strong></div>
          <div className="flex justify-between gap-4"><span>Employee Id:</span><strong>{slip.employeeNumber || "—"}</strong></div>
          <div className="border-t border-slate-200 mt-5 pt-4 space-y-1">
            <div className="flex justify-between gap-4"><span>Base Pay Rate:</span><strong>{money(slip.payRate)} Per Hour</strong></div>
            <div className="flex justify-between gap-4"><span>Hours Paid:</span><strong>{number(slip.hours).toFixed(2)}</strong></div>
            <div className="flex justify-between gap-4"><span>Gross Earnings:</span><strong>{money(gross)}</strong></div>
            <div className="flex justify-between gap-4"><span>Net Payment:</span><strong>{money(net)}</strong></div>
            <div className="flex justify-between gap-4"><span>Super Payments:</span><strong>{money(slip.superAmount)}</strong></div>
          </div>
        </div>
      </div>

      <Section title="Pay Slip Components" headers={["Hours/Units", "Rate", "This Pay", "Year To Date"]}>
        <h3 className="font-bold text-base mt-4">Wages and Earnings</h3>
        <div className={`${row} py-2`}><span>{slip.earningsName}</span><span className="text-right">{number(slip.hours).toFixed(2)}</span><span className="text-right">{money(slip.payRate)}</span><span className="text-right">{money(gross)}</span><span className="text-right">{money(slip.ytdEarnings)}</span></div>
        {slip.earningsNote && <p className="pl-8 text-xs pb-2"><b>Notes:</b> {slip.earningsNote}</p>}
        <Total values={[money(gross), money(slip.ytdEarnings)]} />
        <h3 className="font-bold text-base mt-5">Taxes</h3>
        <div className={`${row} py-2`}><span>{slip.taxName}</span><span /><span /><span className="text-right">{money(slip.payg)}</span><span className="text-right">{money(slip.ytdPayg)}</span></div>
        <Total values={[money(slip.payg), money(slip.ytdPayg)]} />
        <h3 className="font-bold text-base mt-5">Superannuation Breakdown</h3>
        <div className={`${row} py-2`}><span>{slip.superName}</span><span /><span /><span className="text-right">{money(slip.superAmount)}</span><span className="text-right">{money(slip.ytdSuper)}</span></div>
        <Total values={[money(slip.superAmount), money(slip.ytdSuper)]} />
      </Section>

      <section className="mt-7"><div className="grid grid-cols-[minmax(210px,1fr)_260px_120px] gap-3 bg-slate-50 border-b px-2 py-1 font-bold text-base"><span>Bank Payments</span><span>Account</span><span className="text-right">This Pay</span></div><div className="grid grid-cols-[minmax(210px,1fr)_260px_120px] gap-3 px-2 py-3"><span>{slip.employeeName || "Employee"}<small className="block text-slate-600">{slip.paymentMethod}</small></span><span>{maskAccount(slip.bankAccount)}</span><span className="text-right">{money(net)}</span></div></section>
      <section className="mt-6"><div className="grid grid-cols-[minmax(210px,1fr)_260px_120px] gap-3 bg-slate-50 border-b px-2 py-1 font-bold text-base"><span>Super Contributions</span><span>Member Number</span><span className="text-right">This Pay</span></div><div className="grid grid-cols-[minmax(210px,1fr)_260px_120px] gap-3 px-2 py-3"><span>{slip.superFund}<small className="block text-slate-600">{slip.superType}</small></span><span>{maskAccount(slip.superMemberNumber)}</span><span className="text-right">{money(slip.superAmount)}</span></div></section>
      <div className="mt-auto pt-40 flex justify-between items-end text-xs text-slate-600"><div>{verifyUrl && <div className="flex items-center gap-3"><QRCodeSVG value={verifyUrl} size={66} /><div><b>Verify this payslip online</b><br />Scan this QR code or visit the verification link.</div></div>}</div><div>Employee Id: <b>{slip.employeeNumber || "—"}</b></div></div>
    </article>
  );
}

function Section({ title, headers, children }: { title: string; headers: string[]; children: React.ReactNode }) {
  return <section><div className="grid grid-cols-[minmax(210px,1fr)_100px_100px_110px_120px] gap-2 bg-slate-50 border-b px-2 py-1 font-bold text-base"><span>{title}</span>{headers.map((h) => <span className="text-right" key={h}>{h}</span>)}</div>{children}</section>;
}
function Total({ values }: { values: string[] }) { return <div className="grid grid-cols-[1fr_110px_120px] bg-slate-50 px-2 py-1 font-bold"><span /><span className="text-right">{values[0]}</span><span className="text-right">{values[1]}</span></div>; }
function formatDate(value: string) { return value ? new Intl.DateTimeFormat("en-AU").format(new Date(`${value}T12:00:00`)) : "—"; }
function maskAccount(value: string) { return value.length > 4 ? `••••${value.slice(-4)}` : value || "—"; }

export default function PayrollSlipManager() {
  const { toast } = useToast();
  const [slips, setSlips] = useState<PayrollSlip[]>([]);
  const [editing, setEditing] = useState<PayrollSlip>(blank);
  const { data: companies } = useListCompanies();
  const employeeParams = editing.companyId ? { companyId: Number(editing.companyId) } : undefined;
  const { data: employees } = useListEmployees(employeeParams, { query: { enabled: !!editing.companyId, queryKey: getListEmployeesQueryKey(employeeParams) } });
  const gross = useMemo(() => number(editing.payRate) * number(editing.hours), [editing.payRate, editing.hours]);
  useEffect(() => { payrollSlipFetch<PayrollSlip[]>("/employee-pay-slips").then(setSlips).catch(() => toast({ variant: "destructive", title: "Could not load saved pay slips" })); }, [toast]);
  const set = (key: keyof PayrollSlip, value: string) => setEditing((old) => ({ ...old, [key]: value }));
  const selectCompany = (companyId: string) => { const c = companies?.find((x) => String(x.id) === companyId); setEditing((old) => ({ ...old, companyId, employeeId: "", companyName: c?.name || "", companyAbn: (c as any)?.taxNumber || "", employeeName: "", employeeNumber: "", employeeAddress: "" })); };
  const selectEmployee = (employeeId: string) => { const e = employees?.find((x) => String(x.id) === employeeId); setEditing((old) => ({ ...old, employeeId, employeeName: e ? `${e.firstName} ${e.lastName}` : "", employeeNumber: e?.employeeNumber || "", employeeAddress: (e as any)?.address || "", payRate: (e as any)?.hourlyRate?.toString() || old.payRate, bankAccount: e?.bankAccount || "" })); };
  const save = async () => { if (!editing.companyId || !editing.employeeId) { toast({ variant: "destructive", title: "Select a company and employee first" }); return; } try { const { id, verificationToken, ...payload } = editing; const saved = await payrollSlipFetch<PayrollSlip>(id ? `/employee-pay-slips/${id}` : "/employee-pay-slips", { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) }); setEditing(saved); setSlips((all) => [saved, ...all.filter((x) => x.id !== saved.id)]); toast({ title: "Employee payslip saved", description: "The QR verification link is ready." }); } catch { toast({ variant: "destructive", title: "Could not save payslip" }); } };
  const print = () => window.print();

  return <div className="space-y-6 max-w-[1500px] mx-auto">
    <div className="flex flex-col md:flex-row justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Employee Pay Slips</h1><p className="text-muted-foreground mt-2">Create the detailed payroll payslips shown in your reference.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setEditing(blank())}><FilePlus2 className="w-4 h-4 mr-2" />New payslip</Button><Button onClick={save}><Save className="w-4 h-4 mr-2" />Save payslip</Button></div></div>
    <div className="grid xl:grid-cols-[440px_minmax(0,1fr)] gap-6 items-start"><Card><CardHeader><CardTitle>Pay slip details</CardTitle><CardDescription>Every field is reflected in the print-ready payslip.</CardDescription></CardHeader><CardContent className="space-y-6"><FieldGroup title="Employee & period"><div className="grid gap-3"><Select value={editing.companyId} onValueChange={selectCompany}><SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger><SelectContent>{companies?.map((c) => <SelectItem value={String(c.id)} key={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><Select value={editing.employeeId} onValueChange={selectEmployee} disabled={!editing.companyId}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{employees?.map((e) => <SelectItem value={String(e.id)} key={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent></Select><div className="grid grid-cols-2 gap-3"><Text label="Company name" value={editing.companyName} set={(v) => set("companyName", v)} /><Text label="Company ABN" value={editing.companyAbn} set={(v) => set("companyAbn", v)} /><Text label="Employee name" value={editing.employeeName} set={(v) => set("employeeName", v)} /><Text label="Employee ID" value={editing.employeeNumber} set={(v) => set("employeeNumber", v)} /></div><Text label="Employee address" value={editing.employeeAddress} set={(v) => set("employeeAddress", v)} /><DateFields slip={editing} set={set} /></div></FieldGroup><FieldGroup title="Earnings"><div className="grid grid-cols-2 gap-3"><Text label="Hourly rate" value={editing.payRate} set={(v) => set("payRate", v)} type="number" /><Text label="Hours paid" value={editing.hours} set={(v) => set("hours", v)} type="number" /><Text label="Earnings label" value={editing.earningsName} set={(v) => set("earningsName", v)} /><Text label="YTD earnings" value={editing.ytdEarnings} set={(v) => set("ytdEarnings", v)} type="number" /></div><p className="text-sm font-medium pt-2">This pay: {money(gross)}</p><Text label="Notes" value={editing.earningsNote} set={(v) => set("earningsNote", v)} /></FieldGroup><FieldGroup title="Tax & super"><div className="grid grid-cols-2 gap-3"><Text label="Tax label" value={editing.taxName} set={(v) => set("taxName", v)} /><Text label="Tax this pay" value={editing.payg} set={(v) => set("payg", v)} type="number" /><Text label="YTD tax" value={editing.ytdPayg} set={(v) => set("ytdPayg", v)} type="number" /><Text label="Super fund" value={editing.superFund} set={(v) => set("superFund", v)} /><Text label="Super label" value={editing.superName} set={(v) => set("superName", v)} /><Text label="Member number" value={editing.superMemberNumber} set={(v) => set("superMemberNumber", v)} /><Text label="Super this pay" value={editing.superAmount} set={(v) => set("superAmount", v)} type="number" /><Text label="YTD super" value={editing.ytdSuper} set={(v) => set("ytdSuper", v)} type="number" /></div><Text label="Contribution type" value={editing.superType} set={(v) => set("superType", v)} /></FieldGroup><FieldGroup title="Bank payment"><div className="grid grid-cols-2 gap-3"><Text label="Payment method" value={editing.paymentMethod} set={(v) => set("paymentMethod", v)} /><Text label="Account number" value={editing.bankAccount} set={(v) => set("bankAccount", v)} /></div></FieldGroup></CardContent></Card>
      <div className="space-y-4"><div className="flex justify-between items-center"><div className="font-semibold">Live print preview</div><Button variant="outline" onClick={print}><Printer className="w-4 h-4 mr-2" />Print / Save PDF</Button></div>{editing.verificationToken && <div className="flex items-center gap-2 text-sm text-emerald-700"><QrCode className="w-4 h-4" />QR verification included in the printed payslip.</div>}<Card className="overflow-hidden shadow-md"><SlipPreview slip={editing} /></Card></div></div>
    {slips.length > 0 && <Card><CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5" />Saved employee pay slips</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{slips.map((slip) => <button className="text-left border rounded-lg p-4 hover:bg-muted/50" key={String(slip.id)} onClick={() => setEditing(slip)}><div className="flex justify-between gap-2"><strong>{slip.employeeName}</strong><Badge variant="secondary">{formatDate(slip.datePaid)}</Badge></div><p className="text-sm text-muted-foreground mt-1">{slip.companyName} · {money(number(slip.payRate) * number(slip.hours))}</p><span onClick={async (e) => { e.stopPropagation(); if (!slip.id) return; await payrollSlipFetch(`/employee-pay-slips/${slip.id}`, { method: "DELETE" }); setSlips((all) => all.filter((x) => x.id !== slip.id)); }} className="inline-flex mt-3 text-xs text-destructive items-center gap-1"><Trash2 className="w-3 h-3" />Delete</span></button>)}</CardContent></Card>}
  </div>;
}
function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="space-y-3"><h3 className="font-semibold border-b pb-2">{title}</h3>{children}</section>; }
function Text({ label, value, set, type = "text" }: { label: string; value: string; set: (v: string) => void; type?: string }) { return <div className="space-y-1"><Label className="text-xs">{label}</Label><Input type={type} value={value} onChange={(e) => set(e.target.value)} min={type === "number" ? "0" : undefined} /></div>; }
function DateFields({ slip, set }: { slip: PayrollSlip; set: (k: keyof PayrollSlip, v: string) => void }) { return <div className="grid grid-cols-3 gap-2"><Text label="Period start" value={slip.periodStart} set={(v) => set("periodStart", v)} type="date" /><Text label="Period end" value={slip.periodEnd} set={(v) => set("periodEnd", v)} type="date" /><Text label="Date paid" value={slip.datePaid} set={(v) => set("datePaid", v)} type="date" /></div>; }
