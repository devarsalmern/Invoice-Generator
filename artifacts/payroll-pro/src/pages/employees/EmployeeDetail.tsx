import { useRoute, useLocation } from "wouter";
import { useGetEmployee, useDeleteEmployee, getGetEmployeeQueryKey, getListEmployeesQueryKey, useListCompanies, getListCompaniesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserCircle, Phone, Mail, Briefcase, Calendar, Pencil, Trash2,
  ArrowLeft, Loader2, Building2, DollarSign, MapPin, Hash
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function EmployeeDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/employees/:id");
  const id = parseInt(params?.id as string, 10);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employee, isLoading, isError } = useGetEmployee(id, {
    query: { enabled: !!id, queryKey: getGetEmployeeQueryKey(id) }
  });
  const { data: companies } = useListCompanies({ query: { queryKey: getListCompaniesQueryKey() } });
  const deleteEmployee = useDeleteEmployee();

  const handleDelete = () => {
    deleteEmployee.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        toast({ title: "Employee deleted successfully" });
        setLocation("/employees");
      },
      onError: (err) => toast({ variant: "destructive", title: "Failed to delete employee", description: err.message }),
    });
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isError || !employee) return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold">Employee not found</h2>
      <Button className="mt-4" onClick={() => setLocation("/employees")}>Back to Employees</Button>
    </div>
  );

  const company = companies?.find(c => c.id === employee.companyId);
  const emp = employee as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/employees")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{employee.firstName} {employee.lastName}</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> {employee.designation || "Employee"} at {company?.name || `Company #${employee.companyId}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setLocation(`/employees/${id}/edit`)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete <strong>{employee.firstName} {employee.lastName}</strong>.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleteEmployee.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader><CardTitle>Employment Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><UserCircle className="h-4 w-4" />Employee ID</p>
                  <p className="font-mono">{employee.employeeNumber || `EMP-${employee.id}`}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Building2 className="h-4 w-4" />Department</p>
                  <p>{employee.department ? <Badge variant="outline">{employee.department}</Badge> : "Not specified"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Briefcase className="h-4 w-4" />Designation</p>
                  <p className="font-medium">{employee.designation || "Not specified"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" />Start Date</p>
                  <p className="font-medium">{employee.joiningDate ? format(new Date(employee.joiningDate), "d MMMM yyyy") : "Not specified"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />Hourly Rate</p>
                  <p className="font-medium text-lg">{emp.hourlyRate ? `$${Number(emp.hourlyRate).toFixed(2)}/hr` : "Not specified"}</p>
                </div>
                {emp.abn && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Hash className="h-4 w-4" />ABN</p>
                    <p className="font-mono">{emp.abn}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" />Email</p>
                  <p className="font-medium">{employee.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" />Phone</p>
                  <p className="font-medium">{employee.phone || "Not provided"}</p>
                </div>
                {emp.address && (
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" />Address</p>
                    <p className="font-medium whitespace-pre-line">{emp.address}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {emp.bsb && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">BSB</p>
                  <p className="font-mono text-sm">{emp.bsb}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Account Number</p>
                <p className="font-mono text-sm">{employee.bankAccount || "Not provided"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>System Record</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Record ID</p>
                <p className="font-mono text-sm">{employee.id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{format(new Date(employee.createdAt), "d MMM yyyy h:mm a")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
