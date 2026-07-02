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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  companyId: z.string().min(1, "Company is required"),
  employeeId: z.string().min(1, "Employee is required"),
  month: z.string().min(1),
  year: z.string().min(1),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  includeTax: z.boolean(),
  items: z.array(itemSchema).min(1, "At least one line item is required"),
});

type PayslipFormValues = z.infer<typeof payslipSchema>;

const parseNum = (v: string | undefined) => { const n = parseFloat(v || "0"); return isNaN(n) ? 0 : n; };
const fmt2 = (n: number) => n.toFixed(2);

const months = [
  { value: "1", label: "January" }, { value: "2", label: "February" },
  { value: "3", label: "March" }, { value: "4", label: "April" },
  { value: "5", label: "May" }, { value: "6", label: "June" },
  { value: "7", label: "July" }, { value: "8", label: "August" },
  { value: "9", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

export default function PayslipForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [defaultHourlyRate, setDefaultHourlyRate] = useState<string>("0");

  const createPayslip = useCreatePayslip();
  const { data: companies } = useListCompanies({ query: { queryKey: getListCompaniesQueryKey() } });
  const { data: employees } = useListEmployees(
    { companyId: selectedCompanyId ? parseInt(selectedCompanyId, 10) : undefined },
    { query: { enabled: !!selectedCompanyId, queryKey: getListEmployeesQueryKey({ companyId: selectedCompanyId ? parseInt(selectedCompanyId, 10) : undefined }) } }
  );

  const today = new Date().toISOString().split("T")[0];
  const currentDate = new Date();
  const years: string[] = [];
  for (let y = currentDate.getFullYear() - 2; y <= currentDate.getFullYear() + 1; y++) years.push(String(y));

  const form = useForm<PayslipFormValues>({
    resolver: zodResolver(payslipSchema),
    defaultValues: {
      companyId: "", employeeId: "",
      month: String(currentDate.getMonth() + 1),
      year: String(currentDate.getFullYear()),
      issueDate: today, dueDate: "", referenceNumber: "",
      includeTax: false,
      items: [{ date: today, description: "Daily subcontract painting services", quantity: "1", unitPrice: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

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
      const emp = employees.find(e => e.id.toString() === watchEmployeeId);
      const rate = (emp as any)?.hourlyRate ? String((emp as any).hourlyRate) : "0";
      setDefaultHourlyRate(rate);
      form.getValues("items").forEach((_, idx) => form.setValue(`items.${idx}.unitPrice`, rate));
    }
  }, [watchEmployeeId, employees, form]);

  const watchedItems = form.watch("items");
  const includeTax = form.watch("includeTax");
  const itemAmounts = watchedItems.map(item => parseNum(item.quantity) * parseNum(item.unitPrice));
  const subtotal = itemAmounts.reduce((s, a) => s + a, 0);
  const gstAmount = includeTax ? subtotal * 0.1 : 0;
  const totalAmount = subtotal + gstAmount;

  const onSubmit = (data: PayslipFormValues) => {
    const taxRate = data.includeTax ? 10 : 0;
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
      issueDate: data.issueDate || undefined,
      dueDate: data.dueDate || undefined,
      referenceNumber: data.referenceNumber || undefined,
      subtotal, gstAmount, totalAmount,
      grossSalary: subtotal, netSalary: totalAmount,
      items,
    };
    createPayslip.mutate({ data: payload as any }, {
      onSuccess: (newPayslip) => {
        queryClient.invalidateQueries({ queryKey: getListPayslipsQueryKey() });
        toast({ title: "Invoice created successfully" });
        setLocation(`/payslips/${newPayslip.id}`);
      },
      onError: (err) => toast({ variant: "destructive", title: "Failed to create invoice", description: err.message }),
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/payslips")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Tax Invoice</h1>
          <p className="text-muted-foreground mt-1">Generate a tax invoice for contractor payment.</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <Select onValueChange={(v) => form.setValue("companyId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>{companies?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {form.formState.errors.companyId && <p className="text-sm text-destructive">{form.formState.errors.companyId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Contractor / Employee *</Label>
                  <Select onValueChange={(v) => form.setValue("employeeId", v)} disabled={!selectedCompanyId} value={form.watch("employeeId")}>
                    <SelectTrigger><SelectValue placeholder={selectedCompanyId ? "Select person" : "Select company first"} /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.firstName} {e.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.employeeId && <p className="text-sm text-destructive">{form.formState.errors.employeeId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select onValueChange={(v) => form.setValue("month", v)} defaultValue={form.getValues("month")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select onValueChange={(v) => form.setValue("year", v)} defaultValue={form.getValues("year")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Issue Date</Label>
                  <Input type="date" {...form.register("issueDate")} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" {...form.register("dueDate")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Reference (e.g. Painting Work)</Label>
                  <Input placeholder="e.g. Painting Work, Labour Services" {...form.register("referenceNumber")} />
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
                  type="button" variant="outline" size="sm"
                  onClick={() => append({ date: today, description: "Daily subcontract painting services", quantity: "1", unitPrice: defaultHourlyRate })}
                >
                  <Plus className="h-4 w-4 mr-2" />Add Entry
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
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-2">
                      <Input type="date" {...form.register(`items.${idx}.date`)} />
                    </div>
                    <div className="col-span-4">
                      <Input {...form.register(`items.${idx}.description`)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" step="0.5" min="0" placeholder="0" {...form.register(`items.${idx}.quantity`)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...form.register(`items.${idx}.unitPrice`)} />
                    </div>
                    <div className="col-span-1 flex items-center justify-end pt-2 text-sm font-medium">
                      ${fmt2(amount)}
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(idx)}>
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
              <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3 text-sm">
              {/* GST Toggle */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <div className="font-medium text-sm">Include GST (10%)</div>
                  <div className="text-xs text-muted-foreground">Australian Goods & Services Tax</div>
                </div>
                <Switch
                  checked={includeTax}
                  onCheckedChange={(v) => form.setValue("includeTax", v)}
                />
              </div>

              <div className="space-y-2">
                {watchedItems.map((item, idx) => {
                  const amount = parseNum(item.quantity) * parseNum(item.unitPrice);
                  if (amount === 0) return null;
                  return (
                    <div key={idx} className="flex justify-between text-muted-foreground">
                      <span className="truncate pr-2">{item.date || `Entry ${idx + 1}`}</span>
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
                  <span>GST (10%)</span>
                  <span>${fmt2(gstAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span>
                <span className="text-primary">${fmt2(totalAmount)}</span>
              </div>
            </CardContent>
            <CardFooter className="border-t p-4 flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={createPayslip.isPending}>
                {createPayslip.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Invoice
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setLocation("/payslips")}>Cancel</Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
