import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { 
  useCreatePayslip,
  getListPayslipsQueryKey,
  useListCompanies,
  getListCompaniesQueryKey,
  useListEmployees,
  getListEmployeesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { format } from "date-fns";

const payslipSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  employeeId: z.string().min(1, "Employee is required"),
  month: z.string().min(1, "Month is required"),
  year: z.string().min(1, "Year is required"),
  basicSalary: z.string().min(1, "Basic salary is required"),
  housingAllowance: z.string().optional(),
  transportAllowance: z.string().optional(),
  bonus: z.string().optional(),
  overtime: z.string().optional(),
  tax: z.string().optional(),
  insurance: z.string().optional(),
  otherDeductions: z.string().optional(),
});

type PayslipFormValues = z.infer<typeof payslipSchema>;

export default function PayslipForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  
  const createPayslip = useCreatePayslip();
  
  const { data: companies } = useListCompanies({
    query: { queryKey: getListCompaniesQueryKey() }
  });

  const { data: employees } = useListEmployees(
    { companyId: selectedCompanyId ? parseInt(selectedCompanyId, 10) : undefined },
    { 
      query: { 
        enabled: !!selectedCompanyId,
        queryKey: getListEmployeesQueryKey({ companyId: selectedCompanyId ? parseInt(selectedCompanyId, 10) : undefined }) 
      }
    }
  );

  const currentDate = new Date();
  const currentMonth = (currentDate.getMonth() + 1).toString();
  const currentYear = currentDate.getFullYear().toString();

  const form = useForm<PayslipFormValues>({
    resolver: zodResolver(payslipSchema),
    defaultValues: {
      companyId: "",
      employeeId: "",
      month: currentMonth,
      year: currentYear,
      basicSalary: "0",
      housingAllowance: "0",
      transportAllowance: "0",
      bonus: "0",
      overtime: "0",
      tax: "0",
      insurance: "0",
      otherDeductions: "0",
    },
  });

  // Watch company selection to load employees
  const watchCompanyId = form.watch("companyId");
  useEffect(() => {
    if (watchCompanyId && watchCompanyId !== selectedCompanyId) {
      setSelectedCompanyId(watchCompanyId);
      form.setValue("employeeId", ""); // Reset employee when company changes
    }
  }, [watchCompanyId, selectedCompanyId, form]);

  // Watch employee selection to prefill salary
  const watchEmployeeId = form.watch("employeeId");
  useEffect(() => {
    if (watchEmployeeId && employees) {
      const emp = employees.find(e => e.id.toString() === watchEmployeeId);
      if (emp && emp.salary) {
        form.setValue("basicSalary", emp.salary.toString());
      }
    }
  }, [watchEmployeeId, employees, form]);

  // Calculate totals
  const formValues = form.watch();
  
  const parseNum = (val: string | undefined) => {
    const num = parseFloat(val || "0");
    return isNaN(num) ? 0 : num;
  };

  const basic = parseNum(formValues.basicSalary);
  const housing = parseNum(formValues.housingAllowance);
  const transport = parseNum(formValues.transportAllowance);
  const bonus = parseNum(formValues.bonus);
  const overtime = parseNum(formValues.overtime);
  
  const grossSalary = basic + housing + transport + bonus + overtime;
  
  const tax = parseNum(formValues.tax);
  const insurance = parseNum(formValues.insurance);
  const other = parseNum(formValues.otherDeductions);
  
  const totalDeductions = tax + insurance + other;
  const netSalary = grossSalary - totalDeductions;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const onSubmit = (data: PayslipFormValues) => {
    const payload = {
      companyId: parseInt(data.companyId, 10),
      employeeId: parseInt(data.employeeId, 10),
      month: parseInt(data.month, 10),
      year: parseInt(data.year, 10),
      basicSalary: parseNum(data.basicSalary),
      housingAllowance: parseNum(data.housingAllowance),
      transportAllowance: parseNum(data.transportAllowance),
      bonus: parseNum(data.bonus),
      overtime: parseNum(data.overtime),
      tax: parseNum(data.tax),
      insurance: parseNum(data.insurance),
      otherDeductions: parseNum(data.otherDeductions),
      grossSalary,
      netSalary,
    };

    createPayslip.mutate({ data: payload }, {
      onSuccess: (newPayslip) => {
        queryClient.invalidateQueries({ queryKey: getListPayslipsQueryKey() });
        toast({ title: "Payslip created successfully" });
        setLocation(`/payslips/${newPayslip.id}`);
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Failed to create payslip",
          description: err.message,
        });
      }
    });
  };

  // Generate year options
  const years = [];
  for (let i = currentDate.getFullYear() - 2; i <= currentDate.getFullYear() + 1; i++) {
    years.push(i.toString());
  }

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/payslips")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Payslip</h1>
          <p className="text-muted-foreground mt-1">Generate a new payslip record for an employee.</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyId">Company *</Label>
                  <Select onValueChange={(v) => form.setValue("companyId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.companyId && (
                    <p className="text-sm text-destructive">{form.formState.errors.companyId.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee *</Label>
                  <Select 
                    onValueChange={(v) => form.setValue("employeeId", v)}
                    disabled={!selectedCompanyId}
                    value={form.watch("employeeId")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCompanyId ? "Select employee" : "Select company first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => (
                        <SelectItem key={e.id} value={e.id.toString()}>
                          {e.firstName} {e.lastName} {e.employeeNumber ? `(${e.employeeNumber})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.employeeId && (
                    <p className="text-sm text-destructive">{form.formState.errors.employeeId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="month">Month *</Label>
                  <Select onValueChange={(v) => form.setValue("month", v)} defaultValue={form.getValues("month")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Select onValueChange={(v) => form.setValue("year", v)} defaultValue={form.getValues("year")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Earnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="basicSalary">Basic Salary *</Label>
                  <Input id="basicSalary" type="number" step="0.01" {...form.register("basicSalary")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="housingAllowance">Housing Allowance</Label>
                  <Input id="housingAllowance" type="number" step="0.01" {...form.register("housingAllowance")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transportAllowance">Transport Allowance</Label>
                  <Input id="transportAllowance" type="number" step="0.01" {...form.register("transportAllowance")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonus">Bonus / Commission</Label>
                  <Input id="bonus" type="number" step="0.01" {...form.register("bonus")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overtime">Overtime</Label>
                  <Input id="overtime" type="number" step="0.01" {...form.register("overtime")} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deductions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tax">Tax</Label>
                  <Input id="tax" type="number" step="0.01" {...form.register("tax")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance">Insurance / Health</Label>
                  <Input id="insurance" type="number" step="0.01" {...form.register("insurance")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherDeductions">Other Deductions</Label>
                  <Input id="otherDeductions" type="number" step="0.01" {...form.register("otherDeductions")} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Basic</span>
                  <span>{formatCurrency(basic)}</span>
                </div>
                {(housing > 0 || transport > 0 || bonus > 0 || overtime > 0) && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Allowances & Bonus</span>
                    <span>{formatCurrency(housing + transport + bonus + overtime)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Gross Salary</span>
                  <span>{formatCurrency(grossSalary)}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm pt-4">
                {tax > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Tax</span>
                    <span>-{formatCurrency(tax)}</span>
                  </div>
                )}
                {(insurance > 0 || other > 0) && (
                  <div className="flex justify-between text-destructive">
                    <span>Other Deductions</span>
                    <span>-{formatCurrency(insurance + other)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-medium text-destructive">
                  <span>Total Deductions</span>
                  <span>-{formatCurrency(totalDeductions)}</span>
                </div>
              </div>

              <div className="pt-6 pb-2">
                <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
                  <span className="font-bold">Net Salary</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(netSalary)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t p-4 flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={createPayslip.isPending}>
                {createPayslip.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Draft Payslip
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setLocation("/payslips")}>
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
