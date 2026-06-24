import { useRoute, useLocation } from "wouter";
import { 
  useGetPayslip, 
  useDeletePayslip, 
  useGeneratePayslipPdf,
  useSendPayslipEmail,
  getGetPayslipQueryKey, 
  getListPayslipsQueryKey,
  useGetCompany,
  getGetCompanyQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Mail, 
  Download, 
  Trash2,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Building2,
  User,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function PayslipDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/payslips/:id");
  const id = parseInt(params?.id as string, 10);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payslip, isLoading, isError } = useGetPayslip(id, {
    query: {
      enabled: !!id,
      queryKey: getGetPayslipQueryKey(id)
    }
  });

  const { data: company } = useGetCompany(payslip?.companyId as number, {
    query: {
      enabled: !!payslip?.companyId,
      queryKey: getGetCompanyQueryKey(payslip?.companyId as number)
    }
  });

  const deletePayslip = useDeletePayslip();
  const generatePdf = useGeneratePayslipPdf();
  const sendEmail = useSendPayslipEmail();

  const handleDelete = () => {
    deletePayslip.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPayslipsQueryKey() });
        toast({ title: "Payslip deleted successfully" });
        setLocation("/payslips");
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Failed to delete payslip",
          description: err.message,
        });
      }
    });
  };

  const handleGeneratePdf = () => {
    generatePdf.mutate({ id }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetPayslipQueryKey(id) });
        toast({ title: "PDF generated successfully" });
        if (res.pdfUrl) {
          window.open(res.pdfUrl, '_blank');
        }
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Failed to generate PDF",
          description: err.message,
        });
      }
    });
  };

  const handleSendEmail = () => {
    sendEmail.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPayslipQueryKey(id) });
        toast({ title: "Payslip sent to employee" });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Failed to send email",
          description: err.message,
        });
      }
    });
  };

  const formatCurrency = (value: number | undefined) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value || 0);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !payslip) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Payslip not found</h2>
        <Button className="mt-4" onClick={() => setLocation("/payslips")}>Back to Payslips</Button>
      </div>
    );
  }

  const period = format(new Date(payslip.year, payslip.month - 1, 1), "MMMM yyyy");

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case "draft":
        return <Badge variant="secondary" className="text-sm px-3 py-1">Draft</Badge>;
      case "generated":
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-sm px-3 py-1">Generated</Badge>;
      case "sent":
        return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-sm px-3 py-1">Sent to Employee</Badge>;
      default:
        return <Badge variant="outline" className="text-sm px-3 py-1">{statusStr}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/payslips")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Payslip {period}</h1>
              {getStatusBadge(payslip.status)}
            </div>
            <p className="text-muted-foreground mt-1">
              For {payslip.employee?.firstName} {payslip.employee?.lastName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {payslip.pdfUrl ? (
            <Button variant="outline" onClick={() => window.open(payslip.pdfUrl || '', '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          ) : (
            <Button variant="outline" onClick={handleGeneratePdf} disabled={generatePdf.isPending}>
              {generatePdf.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Generate PDF
            </Button>
          )}
          
          <Button 
            onClick={handleSendEmail} 
            disabled={sendEmail.isPending || !payslip.pdfUrl}
            className={payslip.status === 'sent' ? "bg-emerald-600 hover:bg-emerald-700" : ""}
          >
            {sendEmail.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : payslip.status === 'sent' ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            {payslip.status === 'sent' ? "Resend Email" : "Send to Employee"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Payslip</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this payslip? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deletePayslip.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="border-t-4 border-t-primary shadow-md print:shadow-none">
        <CardContent className="p-8 sm:p-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-primary">PAYSLIP</h2>
              <p className="text-muted-foreground mt-1">Salary period: {period}</p>
              
              <div className="mt-8 space-y-1">
                <h3 className="font-bold text-lg">{company?.name || "Company Name"}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{company?.address}</p>
                {company?.registrationNumber && <p className="text-sm text-muted-foreground">Reg: {company.registrationNumber}</p>}
                {company?.taxNumber && <p className="text-sm text-muted-foreground">Tax ID: {company.taxNumber}</p>}
              </div>
            </div>
            
            <div className="bg-muted/30 p-6 rounded-lg border min-w-[300px]">
              <h3 className="font-bold text-lg border-b pb-2 mb-4">Employee Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{payslip.employee?.firstName} {payslip.employee?.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee ID</span>
                  <span className="font-medium">{payslip.employee?.employeeNumber || `EMP-${payslip.employeeId}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{payslip.employee?.department || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Designation</span>
                  <span className="font-medium">{payslip.employee?.designation || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Salary Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {/* Earnings */}
            <div>
              <h3 className="font-bold text-lg bg-muted px-4 py-2 rounded-t-md border-b">Earnings</h3>
              <div className="border border-t-0 rounded-b-md p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Basic Salary</span>
                  <span className="font-medium">{formatCurrency(payslip.basicSalary)}</span>
                </div>
                {!!payslip.housingAllowance && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Housing Allowance</span>
                    <span className="font-medium">{formatCurrency(payslip.housingAllowance)}</span>
                  </div>
                )}
                {!!payslip.transportAllowance && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transport Allowance</span>
                    <span className="font-medium">{formatCurrency(payslip.transportAllowance)}</span>
                  </div>
                )}
                {!!payslip.bonus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bonus / Commission</span>
                    <span className="font-medium">{formatCurrency(payslip.bonus)}</span>
                  </div>
                )}
                {!!payslip.overtime && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overtime</span>
                    <span className="font-medium">{formatCurrency(payslip.overtime)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Gross Earnings</span>
                  <span>{formatCurrency(payslip.grossSalary)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="font-bold text-lg bg-muted px-4 py-2 rounded-t-md border-b">Deductions</h3>
              <div className="border border-t-0 rounded-b-md p-4 space-y-3">
                {!!payslip.tax && (
                  <div className="flex justify-between text-destructive/90">
                    <span>Income Tax</span>
                    <span className="font-medium">-{formatCurrency(payslip.tax)}</span>
                  </div>
                )}
                {!!payslip.insurance && (
                  <div className="flex justify-between text-destructive/90">
                    <span>Insurance / Health</span>
                    <span className="font-medium">-{formatCurrency(payslip.insurance)}</span>
                  </div>
                )}
                {!!payslip.otherDeductions && (
                  <div className="flex justify-between text-destructive/90">
                    <span>Other Deductions</span>
                    <span className="font-medium">-{formatCurrency(payslip.otherDeductions)}</span>
                  </div>
                )}
                {(!payslip.tax && !payslip.insurance && !payslip.otherDeductions) && (
                  <div className="text-muted-foreground text-center py-2">No deductions</div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg text-destructive">
                  <span>Total Deductions</span>
                  <span>-{formatCurrency((payslip.tax || 0) + (payslip.insurance || 0) + (payslip.otherDeductions || 0))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary Area */}
          <div className="mt-12 flex justify-end">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 min-w-[300px]">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Net Salary</span>
                <span className="text-3xl font-bold text-primary">{formatCurrency(payslip.netSalary)}</span>
              </div>
              {payslip.employee?.bankAccount && (
                <div className="mt-4 pt-4 border-t border-primary/10 text-sm text-muted-foreground">
                  <p>To be paid to account:</p>
                  <p className="font-mono">{payslip.employee.bankAccount}</p>
                </div>
              )}
            </div>
          </div>

          {/* Verification Link */}
          {payslip.verificationToken && (
            <div className="mt-16 pt-8 border-t text-center space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Document Authenticity</p>
              <p className="text-xs text-muted-foreground">
                This document is cryptographically signed. Verify its authenticity at:
              </p>
              <p className="text-xs font-mono bg-muted py-1 px-3 rounded inline-block">
                {window.location.origin}/verify/{payslip.verificationToken}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
