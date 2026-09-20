import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  useCreatePayslip,
  getListPayslipsQueryKey,
  useListCompanies,
  getListCompaniesQueryKey,
  useListEmployees,
  getListEmployeesQueryKey,
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
import { payrollSlipFetch } from "../payroll-slips/api";

const itemSchema = z.object({
  date: z.string().min(1, "Date required"),
  description: z.string().min(1, "Description required"),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
});

const payslipSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  employeeId: z.string().min(1, "Employee is required"),
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
  // payroll-style fields
  payRate: z.string().optional(),
  hours: z.string().optional(),
  earningsName: z.string().optional(),
  ytdEarnings: z.string().optional(),
  earningsNote: z.string().optional(),
  payg: z.string().optional(),
  ytdPayg: z.string().optional(),
  superFund: z.string().optional(),
  superName: z.string().optional(),
  superMemberNumber: z.string().optional(),
  superAmount: z.string().optional(),
  ytdSuper: z.string().optional(),
  superType: z.string().optional(),
  paymentMethod: z.string().optional(),
  bankAccount: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one line item is required"),
});

type PayslipFormValues = z.infer<typeof payslipSchema>;

const parseNum = (v: string | undefined) => {
  const n = parseFloat(v || "0");
  return isNaN(n) ? 0 : n;
};
const fmt2 = (n: number) => n.toFixed(2);
const money = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    n,
  );

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

export default function PayslipForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [defaultHourlyRate, setDefaultHourlyRate] = useState<string>("0");

  const createPayslip = useCreatePayslip();
  const { data: companies } = useListCompanies({
    query: { queryKey: getListCompaniesQueryKey() },
  });
  const { data: employees } = useListEmployees(
    {
      companyId: selectedCompanyId
        ? parseInt(selectedCompanyId, 10)
        : undefined,
    },
    {
      query: {
        enabled: !!selectedCompanyId,
        queryKey: getListEmployeesQueryKey({
          companyId: selectedCompanyId
            ? parseInt(selectedCompanyId, 10)
            : undefined,
        }),
      },
    },
  );

  const today = new Date().toISOString().split("T")[0];
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
      companyId: "",
      employeeId: "",
      month: String(currentDate.getMonth() + 1),
      year: String(currentDate.getFullYear()),
      referenceNumber: "",
      includeTax: false,
      showTfn: false,
      taxName: "Super Tax",
      taxPercentage: "10",
      periodStart: new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      )
        .toISOString()
        .split("T")[0],
      periodEnd: new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      )
        .toISOString()
        .split("T")[0],
      datePaid: today,
      items: [
        {
          date: today,
          description: "Daily subcontract painting services",
          quantity: "1",
          unitPrice: "0",
        },
      ],
      // payroll defaults
      payRate: "0",
      hours: "0",
      earningsName: "Permanent Ordinary Hours",
      ytdEarnings: "0",
      earningsNote: "",
      payg: "0",
      ytdPayg: "0",
      superFund: "AustralianSuper",
      superName: "Superannuation Breakdown",
      superMemberNumber: "",
      superAmount: "0",
      ytdSuper: "0",
      superType: "Super Guarantee",
      paymentMethod: "Manual deposit",
      bankAccount: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchCompanyId = form.watch("companyId");
  useEffect(() => {
    if (watchCompanyId && watchCompanyId !== selectedCompanyId) {
      setSelectedCompanyId(watchCompanyId);
      form.setValue("employeeId", "");
    }
  }, [watchCompanyId, selectedCompanyId, form]);

  const watchEmployeeId = form.watch("employeeId");
  useEffect(() => {
    if (watchEmployeeId && employees) {
      const emp = employees.find((e) => e.id.toString() === watchEmployeeId);
      const rate = (emp as any)?.hourlyRate
        ? String((emp as any).hourlyRate)
        : "0";
      setDefaultHourlyRate(rate);
      form
        .getValues("items")
        .forEach((_, idx) => form.setValue(`items.${idx}.unitPrice`, rate));
    }
  }, [watchEmployeeId, employees, form]);

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

  // payroll-style watches & calculations
  const payRate = form.watch("payRate") || "0";
  const hours = form.watch("hours") || "0";
  const earningsName = form.watch("earningsName") || "Earnings";
  const earningsNote = form.watch("earningsNote") || "";
  const ytdEarnings = form.watch("ytdEarnings") || "0";
  const payg = form.watch("payg") || "0";
  const ytdPayg = form.watch("ytdPayg") || "0";
  const superAmount = form.watch("superAmount") || "0";
  const ytdSuper = form.watch("ytdSuper") || "0";
  const superFund = form.watch("superFund") || "AustralianSuper";
  const superName = form.watch("superName") || "SG";
  const superMemberNumber = form.watch("superMemberNumber") || "";
  const superType = form.watch("superType") || "Super Guarantee";
  const paymentMethod = form.watch("paymentMethod") || "Manual deposit";
  const bankAccount = form.watch("bankAccount") || "";

  const gross = parseNum(payRate) * parseNum(hours);
  const netPayment = Math.max(0, gross - parseNum(payg));

  useEffect(() => {
    if (includeTax) {
      form.setValue("superAmount", fmt2(gross * (taxPercentage / 100)), {
        shouldDirty: true,
      });
    }
  }, [form, gross, includeTax, taxPercentage]);

  const onSubmit = (data: PayslipFormValues) => {
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
      companyId: parseInt(data.companyId, 10),
      employeeId: parseInt(data.employeeId, 10),
      month: parseInt(data.month, 10),
      year: parseInt(data.year, 10),
      referenceNumber: data.referenceNumber || undefined,
      showTfn: data.showTfn,
      taxName: data.taxName || undefined,
      taxPercentage: data.includeTax ? taxRate : 0,
      subtotal,
      gstAmount: taxAmount,
      totalAmount,
      companyName:
        companies?.find((c) => c.id === parseInt(data.companyId, 10))?.name ||
        "",
      companyAbn:
        (companies?.find((c) => c.id === parseInt(data.companyId, 10)) as any)
          ?.taxNumber || "",
      employeeName: (() => {
        const employee = employees?.find(
          (e) => e.id === parseInt(data.employeeId, 10),
        );
        return employee ? `${employee.firstName} ${employee.lastName}` : "";
      })(),
      employeeNumber:
        (employees?.find((e) => e.id === parseInt(data.employeeId, 10)) as any)
          ?.employeeNumber || "",
      employeeAddress:
        (employees?.find((e) => e.id === parseInt(data.employeeId, 10)) as any)
          ?.address || "",
      periodStart:
        data.periodStart ||
        new Date(parseInt(data.year, 10), parseInt(data.month, 10) - 1, 1)
          .toISOString()
          .split("T")[0],
      periodEnd:
        data.periodEnd ||
        new Date(parseInt(data.year, 10), parseInt(data.month, 10), 0)
          .toISOString()
          .split("T")[0],
      datePaid: data.datePaid || today,
      // payroll-aware fields
      grossSalary: gross || subtotal,
      netSalary: netPayment || totalAmount,
      payRate: data.payRate || "0",
      hours: data.hours || "0",
      earningsName:
        data.earningsName || data.items[0]?.description || "Earnings",
      earningsNote: data.earningsNote || "",
      ytdEarnings: data.ytdEarnings || String(gross || subtotal),
      payg: data.payg || "0",
      ytdPayg: data.ytdPayg || "0",
      superFund: data.superFund || "AustralianSuper",
      superName: data.superName || "Superannuation Breakdown",
      superMemberNumber: data.superMemberNumber || "",
      superAmount: data.superAmount || "0",
      ytdSuper: data.ytdSuper || "0",
      superType: data.superType || "Super Guarantee",
      paymentMethod: data.paymentMethod || "Manual deposit",
      bankAccount: data.bankAccount || "",
      items,
    };
    createPayslip.mutate(
      { data: payload as any },
      {
        onSuccess: async (newPayslip) => {
          queryClient.invalidateQueries({
            queryKey: getListPayslipsQueryKey(),
          });
          toast({ title: "Payslip created successfully" });
          // also create employee pay slip record for QR history
          try {
            const company = companies?.find(
              (c) => c.id === parseInt(data.companyId, 10),
            );
            const emp = employees?.find(
              (e) => e.id === parseInt(data.employeeId, 10),
            );
            const periodStart =
              data.periodStart ||
              new Date(parseInt(data.year, 10), parseInt(data.month, 10) - 1, 1)
                .toISOString()
                .split("T")[0];
            const periodEnd =
              data.periodEnd ||
              new Date(parseInt(data.year, 10), parseInt(data.month, 10), 0)
                .toISOString()
                .split("T")[0];
            const empSlip = {
              companyId: data.companyId,
              employeeId: data.employeeId,
              companyName: company?.name || "",
              companyAbn: (company as any)?.taxNumber || "",
              employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "",
              employeeNumber: (emp as any)?.employeeNumber || "",
              employeeAddress: (emp as any)?.address || "",
              periodStart,
              periodEnd,
              datePaid: data.datePaid || new Date().toISOString().split("T")[0],
              payRate: data.payRate || "0",
              hours:
                data.hours ||
                String(
                  watchedItems.reduce((s, it) => s + parseNum(it.quantity), 0),
                ),
              earningsName:
                data.earningsName || data.items[0]?.description || "Earnings",
              earningsNote: data.earningsNote || "",
              ytdEarnings: data.ytdEarnings || String(gross || subtotal),
              taxName: data.taxName || "PAYG",
              payg: data.payg || "0",
              ytdPayg: data.ytdPayg || "0",
              superFund: data.superFund || "AustralianSuper",
              superName: data.superName || "Superannuation Breakdown",
              superType: data.superType || "Super Guarantee",
              superMemberNumber: data.superMemberNumber || "",
              superAmount: data.superAmount || "0",
              ytdSuper: data.ytdSuper || "0",
              paymentMethod: data.paymentMethod || "Manual deposit",
              bankAccount: data.bankAccount || (emp as any)?.bankAccount || "",
            };
            await payrollSlipFetch("/employee-pay-slips", {
              method: "POST",
              body: JSON.stringify(empSlip),
            });
          } catch (err) {
            console.error(err);
            toast({
              variant: "destructive",
              title: "Failed to create employee payslip record",
            });
          }
          setLocation(`/payslips/${newPayslip.id}`);
        },
        onError: (err) =>
          toast({
            variant: "destructive",
            title: "Failed to create invoice",
            description: err.message,
          }),
      },
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setLocation("/payslips")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create Tax Invoice
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate a tax invoice for contractor payment.
          </p>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2 space-y-6">
          {/* Earnings (payroll-style) */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Hourly rate</Label>
                  <Input type="string" {...form.register("payRate")} />
                </div>
                <div className="space-y-2">
                  <Label>Hours paid</Label>
                  <Input type="string" {...form.register("hours")} />
                </div>
                <div className="space-y-2">
                  <Label>Earnings label</Label>
                  <Input {...form.register("earningsName")} />
                </div>
                <div className="space-y-2">
                  <Label>YTD earnings</Label>
                  <Input type="string" {...form.register("ytdEarnings")} />
                </div>
              </div>
              <p className="text-sm font-medium pt-2">
                This pay: {money(gross)}
              </p>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input {...form.register("earningsNote")} />
              </div>
            </CardContent>
          </Card>

          {/* Tax & super */}
          <Card>
            <CardHeader>
              <CardTitle>Tax &amp; super</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tax label</Label>
                  <Input {...form.register("taxName")} />
                </div>
                <div className="space-y-2">
                  <Label>Tax this pay</Label>
                  <Input type="string" {...form.register("payg")} />
                </div>
                <div className="space-y-2">
                  <Label>YTD tax</Label>
                  <Input type="string" {...form.register("ytdPayg")} />
                </div>
                <div className="space-y-2">
                  <Label>Super fund</Label>
                  <Input {...form.register("superFund")} />
                </div>
                <div className="space-y-2">
                  <Label>Super label</Label>
                  <Input {...form.register("superName")} />
                </div>
                <div className="space-y-2">
                  <Label>Member number</Label>
                  <Input {...form.register("superMemberNumber")} />
                </div>
                <div className="space-y-2">
                  <Label>Super this pay</Label>
                  <Input type="string" {...form.register("superAmount")} />
                </div>
                <div className="space-y-2">
                  <Label>YTD super</Label>
                  <Input type="string" {...form.register("ytdSuper")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contribution type</Label>
                <Input {...form.register("superType")} />
              </div>
            </CardContent>
          </Card>

          {/* Bank payment */}
          <Card>
            <CardHeader>
              <CardTitle>Bank payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Payment method</Label>
                  <Input {...form.register("paymentMethod")} />
                </div>
                <div className="space-y-2">
                  <Label>Account number</Label>
                  <Input {...form.register("bankAccount")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <Select onValueChange={(v) => form.setValue("companyId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.companyId && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.companyId.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Contractor / Employee *</Label>
                  <Select
                    onValueChange={(v) => form.setValue("employeeId", v)}
                    disabled={!selectedCompanyId}
                    value={form.watch("employeeId")}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          selectedCompanyId
                            ? "Select person"
                            : "Select company first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((e) => (
                        <SelectItem key={e.id} value={e.id.toString()}>
                          {e.firstName} {e.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.employeeId && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.employeeId.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select
                    onValueChange={(v) => form.setValue("month", v)}
                    defaultValue={form.getValues("month")}
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
                    defaultValue={form.getValues("year")}
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
                <div className="space-y-2">
                  <Label>Period start</Label>
                  <Input type="date" {...form.register("periodStart")} />
                </div>
                <div className="space-y-2">
                  <Label>Period end</Label>
                  <Input type="date" {...form.register("periodEnd")} />
                </div>
                <div className="space-y-2">
                  <Label>Date paid</Label>
                  <Input type="date" {...form.register("datePaid")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Reference (e.g. Painting Work)</Label>
                  <Input
                    placeholder="e.g. Painting Work, Labour Services"
                    {...form.register("referenceNumber")}
                  />
                </div>
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
                      unitPrice: defaultHourlyRate,
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
              <Button
                type="submit"
                className="w-full"
                disabled={createPayslip.isPending}
              >
                {createPayslip.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Invoice
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setLocation("/payslips")}
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
