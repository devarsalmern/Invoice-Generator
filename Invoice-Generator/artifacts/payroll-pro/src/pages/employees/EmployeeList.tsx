import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListEmployees, getListEmployeesQueryKey, useListCompanies, getListCompaniesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Search, Building2, MoreHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function EmployeeList() {
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState<string>("all");
  const [, setLocation] = useLocation();

  const { data: companies } = useListCompanies({
    query: { queryKey: getListCompaniesQueryKey() }
  });

  const queryParams = {
    ...(search ? { search } : {}),
    ...(companyId !== "all" ? { companyId: parseInt(companyId, 10) } : {})
  };

  const { data: employees, isLoading } = useListEmployees(queryParams, {
    query: { queryKey: getListEmployeesQueryKey(queryParams) }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground mt-2">Manage employee records across all companies.</p>
        </div>
        <Button onClick={() => setLocation("/employees/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, email, or employee number..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[250px]">
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>ID / Number</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Joining Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : employees?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Users className="h-8 w-8 mb-2 opacity-20" />
                        <p>No employees found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  employees?.map((employee) => {
                    const company = companies?.find(c => c.id === employee.companyId);
                    return (
                      <TableRow 
                        key={employee.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/employees/${employee.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
                              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium leading-none">{employee.firstName} {employee.lastName}</span>
                              <span className="text-xs text-muted-foreground mt-1">{employee.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{employee.employeeNumber || `EMP-${employee.id}`}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">{employee.designation || "Not specified"}</span>
                            {employee.department && (
                              <Badge variant="outline" className="w-fit font-normal text-xs">{employee.department}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{company?.name || `Company #${employee.companyId}`}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {employee.joiningDate ? format(new Date(employee.joiningDate), "MMM d, yyyy") : "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
