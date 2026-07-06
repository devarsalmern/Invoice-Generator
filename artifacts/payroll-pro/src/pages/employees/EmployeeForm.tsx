import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useRoute } from "wouter";
import {
  useCreateEmployee,
  useGetEmployee,
  useUpdateEmployee,
  getGetEmployeeQueryKey,
  getListEmployeesQueryKey,
  useListCompanies,
  getListCompaniesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const employeeSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email"),
  employeeNumber: z.string().optional(),
  phone: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  joiningDate: z.string().optional(),
  address: z.string().optional(),
  abn: z.string().optional(),
  bankAccount: z.string().optional(),
  bsb: z.string().optional(),
  hourlyRate: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function EmployeeForm() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/employees/:id/edit");
  const isEditing = !!match;
  const id = isEditing ? parseInt(params.id as string, 10) : undefined;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const { data: companies } = useListCompanies({
    query: { queryKey: getListCompaniesQueryKey() }
  });

  const { data: employee, isLoading: isLoadingEmployee } = useGetEmployee(id as number, {
    query: {
      enabled: isEditing && !!id,
      queryKey: getGetEmployeeQueryKey(id as number)
    }
  });

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      companyId: "", firstName: "", lastName: "", email: "",
      employeeNumber: "", phone: "", designation: "", department: "",
      joiningDate: "", address: "", abn: "", bankAccount: "", bsb: "", hourlyRate: "",
    },
  });

  useEffect(() => {
    if (employee && isEditing) {
      form.reset({
        companyId: employee.companyId.toString(),
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        employeeNumber: employee.employeeNumber || "",
        phone: employee.phone || "",
        designation: employee.designation || "",
        department: employee.department || "",
        joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : "",
        address: (employee as any).address || "",
        abn: (employee as any).abn || "",
        bankAccount: employee.bankAccount || "",
        bsb: (employee as any).bsb || "",
        hourlyRate: (employee as any).hourlyRate ? (employee as any).hourlyRate.toString() : "",
      });
    }
  }, [employee, form, isEditing]);

  const onSubmit = (data: EmployeeFormValues) => {
    const cleanData = {
      ...data,
      companyId: parseInt(data.companyId, 10),
      hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
      employeeNumber: data.employeeNumber || undefined,
      phone: data.phone || undefined,
      designation: data.designation || undefined,
      department: data.department || undefined,
      joiningDate: data.joiningDate ? new Date(data.joiningDate).toISOString() : undefined,
      address: data.address || undefined,
      abn: data.abn || undefined,
      bankAccount: data.bankAccount || undefined,
      bsb: data.bsb || undefined,
    };

    if (isEditing && id) {
      updateEmployee.mutate({ id, data: cleanData as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetEmployeeQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          toast({ title: "Employee updated successfully" });
          setLocation(`/employees/${id}`);
        },
        onError: (err) => toast({ variant: "destructive", title: "Failed to update employee", description: err.message }),
      });
    } else {
      createEmployee.mutate({ data: cleanData as any }, {
        onSuccess: (newEmployee) => {
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          toast({ title: "Employee created successfully" });
          setLocation(`/employees/${newEmployee.id}`);
        },
        onError: (err) => toast({ variant: "destructive", title: "Failed to create employee", description: err.message }),
      });
    }
  };

  const isPending = createEmployee.isPending || updateEmployee.isPending;

  if (isEditing && isLoadingEmployee) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(isEditing ? `/employees/${id}` : "/employees")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEditing ? "Edit Employee" : "New Employee"}</h1>
          <p className="text-muted-foreground mt-1">{isEditing ? "Update employee details." : "Add a new team member."}</p>
        </div>
      </div>

      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5" />Employee Profile</CardTitle>
            <CardDescription>Personal and professional information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" {...form.register("firstName")} />
                  {form.formState.errors.firstName && <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" {...form.register("lastName")} />
                  {form.formState.errors.lastName && <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                  {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+61 4XX XXX XXX" {...form.register("phone")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" placeholder="Unit 8 90-92 Pohlman St, SOUTHPORT QLD 4215" rows={2} {...form.register("address")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abn">ABN (Australian Business Number)</Label>
                  <Input id="abn" placeholder="XX XXX XXX XXX" {...form.register("abn")} />
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Employment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyId">Company *</Label>
                  <Select onValueChange={(v) => form.setValue("companyId", v)} value={form.watch("companyId")} disabled={isEditing}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {companies?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.companyId && <p className="text-sm text-destructive">{form.formState.errors.companyId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeNumber">Employee ID</Label>
                  <Input id="employeeNumber" {...form.register("employeeNumber")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" {...form.register("department")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation / Trade</Label>
                  <Input id="designation" placeholder="e.g. Subcontractor, Painter" {...form.register("designation")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="joiningDate">Start Date</Label>
                  <Input id="joiningDate" type="date" {...form.register("joiningDate")} />
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Financial Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (AUD $)</Label>
                  <Input id="hourlyRate" type="number" step="0.01" placeholder="27.00" {...form.register("hourlyRate")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bsb">BSB Number</Label>
                  <Input id="bsb" placeholder="064-170" {...form.register("bsb")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bankAccount">Bank Account Number</Label>
                  <Input id="bankAccount" placeholder="10828825" {...form.register("bankAccount")} />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button type="button" variant="outline" onClick={() => setLocation(isEditing ? `/employees/${id}` : "/employees")}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Employee"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
