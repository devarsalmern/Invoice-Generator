import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useRoute } from "wouter";
import {
  useGetPayslip,
  getGetPayslipQueryKey,
  getListPayslipsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft, Plus, Trash2, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

const itemSchema = z.object({
  date: z.string().min(1, "Date required"),
  description: z.string().min(1, "Description required"),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
});

const payslipSchema = z.object({
  month: z.string().min(1),
  year: z.string().min(1),
  referenceNumber: z.string().optional(),
  includeTax: z.boolean(),
  showTfn: z.boolean(),
  taxName: z.string().optional(),
  taxPercentage: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  datePaid: z.string().optional(),
  payRate: z.string().optional(), hours: z.string().optional(), earningsName: z.string().optional(), earningsNote: z.string().optional(), ytdEarnings: z.string().optional(),
  payg: z.string().optional(), ytdPayg: z.string().optional(), superFund: z.string().optional(), superName: z.string().optional(), superType: z.string().optional(), superMemberNumber: z.string().optional(), superAmount: z.string().optional(), ytdSuper: z.string().optional(), paymentMethod: z.string().optional(), bankAccount: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one line item is required"),
});

type PayslipFormValues = z.infer<typeof payslipSchema>;

const parseNum = (v: string | number | undefined | null) => {
  const n = parseFloat(String(v || "0"));
  return isNaN(n) ? 0 : n;
};
const fmt2 = (n: number) => n.toFixed(2);

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "";

export default function PayslipEditForm() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/payslips/:id/edit");
  const id = parseInt(params?.id as string, 10);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const { data: payslip, isLoading } = useGetPayslip(id, {
    query: { enabled: !!id, queryKey: getGetPayslipQueryKey(id) },
  });

  const currentDate = new Date();
  const years: string[] = [];
  for (
    let y = currentDate.getFullYear() - 2;
    y <= currentDate.getFullYear() + 1;
    y++
  )
    years.push(String(y));

  const form = useForm<PayslipFormValues>({
    resolver: zodResolver(payslipSchema),
    defaultValues: {
      month: String(currentDate.getMonth() + 1),
      year: String(currentDate.getFullYear()),
      referenceNumber: "",
      includeTax: false,
      showTfn: false,
      taxName: "Super Tax",
      taxPercentage: "10",
      periodStart: "", periodEnd: "", datePaid: "", payRate: "0", hours: "0", earningsName: "Permanent Ordinary Hours", earningsNote: "", ytdEarnings: "0", payg: "0", ytdPayg: "0", superFund: "AustralianSuper", superName: "Superannuation Breakdown", superType: "Super Guarantee", superMemberNumber: "", superAmount: "0", ytdSuper: "0", paymentMethod: "Manual deposit", bankAccount: "",
      items: [
        {
          date: "",
          description: "Daily subcontract painting services",
          quantity: "1",
          unitPrice: "0",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Pre-populate form when payslip loads
  useEffect(() => {
    if (!payslip || ready) return;
    const hasTax = (payslip.items || []).some(
      (i: any) => parseNum(i.taxRate) > 0,
    );
    form.reset({
      month: String(payslip.month),
      year: String(payslip.year),
      referenceNumber: payslip.referenceNumber || "",
      includeTax: hasTax,
      showTfn: Boolean((payslip as any).showTfn),
      taxName: payslip.taxName || "Super Tax",
      taxPercentage: String(payslip.taxPercentage ?? (hasTax ? 10 : 0)),
      periodStart: (payslip as any).periodStart || "",
      periodEnd: (payslip as any).periodEnd || "",
      datePaid: (payslip as any).datePaid || "",
      payRate: String((payslip as any).payRate ?? 0), hours: String((payslip as any).hours ?? 0), earningsName: (payslip as any).earningsName || "Permanent Ordinary Hours", earningsNote: (payslip as any).earningsNote || "", ytdEarnings: String((payslip as any).ytdEarnings ?? 0), payg: String((payslip as any).payg ?? 0), ytdPayg: String((payslip as any).ytdPayg ?? 0), superFund: (payslip as any).superFund || "AustralianSuper", superName: (payslip as any).superName === "SG" ? "Superannuation Breakdown" : ((payslip as any).superName || "Superannuation Breakdown"), superType: (payslip as any).superType || "Super Guarantee", superMemberNumber: (payslip as any).superMemberNumber || "", superAmount: String((payslip as any).superAmount ?? 0), ytdSuper: String((payslip as any).ytdSuper ?? 0), paymentMethod: (payslip as any).paymentMethod || "Manual deposit", bankAccount: (payslip as any).bankAccount || (payslip.employee as any)?.bankAccount || "",
      items:
        payslip.items && payslip.items.length > 0
          ? payslip.items.map((i: any) => ({
              date: i.date || "",
              description:
                i.description || "Daily subcontract painting services",
              quantity: String(i.quantity || "1"),
              unitPrice: String(i.unitPrice || "0"),
            }))
          : [
              {
                date: "",
                description: "Daily subcontract painting services",
                quantity: "1",
                unitPrice: "0",
              },
            ],
    });
    setReady(true);
  }, [payslip, form, ready]);

  const watchedItems = form.watch("items");
  const includeTax = form.watch("includeTax");
  const showTfn = form.watch("showTfn");
  const taxName = form.watch("taxName") || "GST";
  const taxPercentage = Math.max(0, parseNum(form.watch("taxPercentage")));
  const itemAmounts = watchedItems.map(
    (item) => parseNum(item.quantity) * parseNum(item.unitPrice),
  );
  const subtotal = itemAmounts.reduce((s, a) => s + a, 0);
  const taxAmount = includeTax ? subtotal * (taxPercentage / 100) : 0;
  const totalAmount = Math.max(0, subtotal - taxAmount);
  const gross = parseNum(form.watch("payRate")) * parseNum(form.watch("hours"));
  const netPayment = Math.max(0, gross - parseNum(form.watch("payg")));

  useEffect(() => {
    if (includeTax) {
      form.setValue("superAmount", fmt2(gross * (taxPercentage / 100)), {
        shouldDirty: true,
      });
    }
  }, [form, gross, includeTax, taxPercentage]);

  const today = new Date().toISOString().split("T")[0];

  const onSubmit = async (data: PayslipFormValues) => {
    setSaving(true);
    const taxRate = data.includeTax
      ? Math.max(0, parseNum(data.taxPercentage))
      : 0;
    const items = data.items.map((item, idx) => ({
      date: item.date,
      description: item.description,
      quantity: parseNum(item.quantity),
      unitPrice: parseNum(item.unitPrice),
      taxRate,
      amount: itemAmounts[idx] || 0,
    }));
    const payload = {
      month: parseInt(data.month, 10),
      year: parseInt(data.year, 10),
      referenceNumber: data.referenceNumber || null,
      showTfn: data.showTfn,
      taxName: data.taxName || undefined,
      taxPercentage: data.includeTax ? taxRate : 0,
      subtotal,
      gstAmount: taxAmount,
      totalAmount,
      grossSalary: gross || subtotal,
      netSalary: netPayment || totalAmount,
      periodStart: data.periodStart || null, periodEnd: data.periodEnd || null, datePaid: data.datePaid || null,
      payRate: data.payRate || "0", hours: data.hours || "0", earningsName: data.earningsName || "Earnings", earningsNote: data.earningsNote || "", ytdEarnings: data.ytdEarnings || "0", payg: data.payg || "0", ytdPayg: data.ytdPayg || "0", superFund: data.superFund || "", superName: data.superName || "", superType: data.superType || "", superMemberNumber: data.superMemberNumber || "", superAmount: data.superAmount || "0", ytdSuper: data.ytdSuper || "0", paymentMethod: data.paymentMethod || "", bankAccount: data.bankAccount || "",
      items,
    };
    try {
      const token = localStorage.getItem("payrollpro_token");
      const res = await fetch(`${API_BASE_URL}/api/payslips/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: getGetPayslipQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListPayslipsQueryKey() });
      toast({ title: "Invoice updated successfully" });
      setLocation(`/payslips/${id}`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to update",
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setLocation(`/payslips/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Invoice</h1>
          <p className="text-muted-foreground mt-1">
            PAY-{String(id).padStart(4, "0")} — {payslip?.employee?.firstName}{" "}
            {payslip?.employee?.lastName}
          </p>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select
                    onValueChange={(v) => form.setValue("month", v)}
                    value={form.watch("month")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select
                    onValueChange={(v) => form.setValue("year", v)}
                    value={form.watch("year")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Reference</Label>
                  <Input
                    placeholder="e.g. Painting Work, Labour Services"
                    {...form.register("referenceNumber")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payroll details</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Period start</Label><Input type="date" {...form.register("periodStart")} /></div>
                <div className="space-y-2"><Label>Period end</Label><Input type="date" {...form.register("periodEnd")} /></div>
                <div className="space-y-2"><Label>Date paid</Label><Input type="date" {...form.register("datePaid")} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Hourly rate</Label><Input type="number" {...form.register("payRate")} /></div>
                <div className="space-y-2"><Label>Hours paid</Label><Input type="number" {...form.register("hours")} /></div>
                <div className="space-y-2"><Label>Earnings label</Label><Input {...form.register("earningsName")} /></div>
                <div className="space-y-2"><Label>YTD earnings</Label><Input type="number" {...form.register("ytdEarnings")} /></div>
              </div>
              <p className="text-sm font-medium">This pay: ${fmt2(gross)}</p>
              <div className="space-y-2"><Label>Notes</Label><Input {...form.register("earningsNote")} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Tax this pay</Label><Input type="number" {...form.register("payg")} /></div>
                <div className="space-y-2"><Label>YTD tax</Label><Input type="number" {...form.register("ytdPayg")} /></div>
                <div className="space-y-2"><Label>Super fund</Label><Input {...form.register("superFund")} /></div>
                <div className="space-y-2"><Label>Super label</Label><Input {...form.register("superName")} /></div>
                <div className="space-y-2"><Label>Member number</Label><Input {...form.register("superMemberNumber")} /></div>
                <div className="space-y-2"><Label>Contribution type</Label><Input {...form.register("superType")} /></div>
                <div className="space-y-2"><Label>Super this pay</Label><Input type="number" step="0.01" {...form.register("superAmount")} /></div>
                <div className="space-y-2"><Label>YTD super</Label><Input type="number" {...form.register("ytdSuper")} /></div>
                <div className="space-y-2"><Label>Payment method</Label><Input {...form.register("paymentMethod")} /></div>
                <div className="space-y-2"><Label>Account number</Label><Input {...form.register("bankAccount")} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Work Entries */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Work Entries</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      date: today,
                      description: "Daily subcontract painting services",
                      quantity: "1",
                      unitPrice: "0",
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                <div className="col-span-2">Date</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2 text-right">Hours</div>
                <div className="col-span-2 text-right">Rate ($/hr)</div>
                <div className="col-span-1 text-right">Amount</div>
                <div className="col-span-1" />
              </div>

              {fields.map((field, idx) => {
                const qty = parseNum(watchedItems[idx]?.quantity);
                const rate = parseNum(watchedItems[idx]?.unitPrice);
                const amount = qty * rate;
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-12 gap-2 items-start"
                  >
                    <div className="col-span-2">
                      <Input
                        type="date"
                        {...form.register(`items.${idx}.date`)}
                      />
                    </div>
                    <div className="col-span-4">
                      <Input {...form.register(`items.${idx}.description`)} />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="0"
                        {...form.register(`items.${idx}.quantity`)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...form.register(`items.${idx}.unitPrice`)}
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-end pt-2 text-sm font-medium">
                      ${fmt2(amount)}
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => remove(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Totals sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3 text-sm">
              {/* Display options */}
              <div className="space-y-4 pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Display TFN</div>
                    <div className="text-xs text-muted-foreground">
                      Show employee TFN below ABN on this invoice
                    </div>
                  </div>
                  <Switch
                    checked={showTfn}
                    onCheckedChange={(v) => form.setValue("showTfn", v)}
                  />
                </div>
              </div>

              {/* Tax options */}
              <div className="space-y-4 pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Enable tax</div>
                    <div className="text-xs text-muted-foreground">
                      Toggle tax calculation on this invoice
                    </div>
                  </div>
                  <Switch
                    checked={includeTax}
                    onCheckedChange={(v) => form.setValue("includeTax", v)}
                  />
                </div>
                {includeTax && (
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="taxName">Tax name</Label>
                      <Input id="taxName" {...form.register("taxName")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxPercentage">Tax percentage</Label>
                      <Input
                        id="taxPercentage"
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register("taxPercentage")}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {watchedItems.map((item, idx) => {
                  const amount =
                    parseNum(item.quantity) * parseNum(item.unitPrice);
                  if (amount === 0) return null;
                  return (
                    <div
                      key={idx}
                      className="flex justify-between text-muted-foreground"
                    >
                      <span className="truncate pr-2">
                        {item.date || `Entry ${idx + 1}`}
                      </span>
                      <span>${fmt2(amount)}</span>
                    </div>
                  );
                })}
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${fmt2(subtotal)}</span>
              </div>
              {includeTax && (
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {taxName || "Tax"} ({taxPercentage}%)
                  </span>
                  <span>{`-$${fmt2(taxAmount)}`}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span>
                <span className="text-primary">${fmt2(totalAmount)}</span>
              </div>
            </CardContent>
            <CardFooter className="border-t p-4 flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setLocation(`/payslips/${id}`)}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
