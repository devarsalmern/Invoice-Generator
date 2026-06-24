import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListPayslips, getListPayslipsQueryKey, useListCompanies, getListCompaniesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, Building2, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function PayslipList() {
  const [companyId, setCompanyId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [, setLocation] = useLocation();

  const { data: companies } = useListCompanies({
    query: { queryKey: getListCompaniesQueryKey() }
  });

  const queryParams = {
    ...(companyId !== "all" ? { companyId: parseInt(companyId, 10) } : {}),
    ...(status !== "all" ? { status } : {})
  };

  const { data: payslips, isLoading } = useListPayslips(queryParams, {
    query: { queryKey: getListPayslipsQueryKey(queryParams) }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "generated":
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Generated</Badge>;
      case "sent":
        return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Sent</Badge>;
      default:
        return <Badge variant="outline">{statusStr}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payslips</h1>
          <p className="text-muted-foreground mt-2">Generate and manage employee payroll records.</p>
        </div>
        <Button onClick={() => setLocation("/payslips/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Create Payslip
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-center gap-4">
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
            <div className="w-full sm:w-[200px]">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
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
                  <TableHead>Period</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : payslips?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-20" />
                        <p>No payslips found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  payslips?.map((payslip) => {
                    const company = companies?.find(c => c.id === payslip.companyId);
                    const period = format(new Date(payslip.year, payslip.month - 1, 1), "MMM yyyy");
                    
                    return (
                      <TableRow 
                        key={payslip.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/payslips/${payslip.id}`)}
                      >
                        <TableCell>
                          <span className="font-medium">{period}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {payslip.employee ? `${payslip.employee.firstName} ${payslip.employee.lastName}` : `EMP-${payslip.employeeId}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Building2 className="h-4 w-4" />
                            <span className="truncate max-w-[150px]">{company?.name || `Company #${payslip.companyId}`}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(payslip.grossSalary)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payslip.netSalary)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payslip.status)}
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
