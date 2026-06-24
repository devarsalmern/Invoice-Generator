import { useRoute, useLocation } from "wouter";
import {
  useGetPayslip, useDeletePayslip, useGeneratePayslipPdf, useSendPayslipEmail,
  getGetPayslipQueryKey, getListPayslipsQueryKey, useGetCompany, getGetCompanyQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileText, Mail, Download, Trash2, ArrowLeft, Loader2, CheckCircle2, Printer } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import PayslipInvoiceView from "./PayslipInvoiceView";

export default function PayslipDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/payslips/:id");
  const id = parseInt(params?.id as string, 10);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payslip, isLoading, isError } = useGetPayslip(id, {
    query: { enabled: !!id, queryKey: getGetPayslipQueryKey(id) }
  });
  const { data: company } = useGetCompany(payslip?.companyId as number, {
    query: { enabled: !!payslip?.companyId, queryKey: getGetCompanyQueryKey(payslip?.companyId as number) }
  });

  const deletePayslip = useDeletePayslip();
  const generatePdf = useGeneratePayslipPdf();
  const sendEmail = useSendPayslipEmail();

  const handleDelete = () => {
    deletePayslip.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPayslipsQueryKey() });
        toast({ title: "Invoice deleted" });
        setLocation("/payslips");
      },
      onError: (err) => toast({ variant: "destructive", title: "Failed to delete", description: err.message }),
    });
  };

  const handleGeneratePdf = () => {
    generatePdf.mutate({ id }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetPayslipQueryKey(id) });
        toast({ title: "Ready to print / save as PDF" });
        window.open(`/payslips/${id}/print`, "_blank");
      },
      onError: (err) => toast({ variant: "destructive", title: "Failed", description: err.message }),
    });
  };

  const handleSendEmail = () => {
    sendEmail.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPayslipQueryKey(id) });
        toast({ title: "Invoice marked as sent" });
      },
      onError: (err) => toast({ variant: "destructive", title: "Failed to send", description: err.message }),
    });
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isError || !payslip) return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold">Invoice not found</h2>
      <Button className="mt-4" onClick={() => setLocation("/payslips")}>Back to Invoices</Button>
    </div>
  );

  const getStatusBadge = (s: string) => {
    if (s === "generated") return <Badge className="bg-blue-500 hover:bg-blue-600">Generated</Badge>;
    if (s === "sent") return <Badge className="bg-emerald-500 hover:bg-emerald-600">Sent</Badge>;
    return <Badge variant="secondary">Draft</Badge>;
  };

  const payslipNumber = `PAY-${String(payslip.id).padStart(4, "0")}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/payslips")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{payslipNumber}</h1>
              {getStatusBadge(payslip.status)}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {payslip.employee?.firstName} {payslip.employee?.lastName}
              {payslip.referenceNumber && ` — ${payslip.referenceNumber}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {payslip.status === "generated" || payslip.status === "sent" ? (
            <Button variant="outline" onClick={() => window.open(`/payslips/${id}/print`, "_blank")}>
              <Download className="h-4 w-4 mr-2" />Download PDF
            </Button>
          ) : (
            <Button variant="outline" onClick={handleGeneratePdf} disabled={generatePdf.isPending}>
              {generatePdf.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Generate PDF
            </Button>
          )}
          <Button variant="outline" onClick={() => window.open(`/payslips/${id}/print`, "_blank")}>
            <Printer className="h-4 w-4 mr-2" />Print
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={sendEmail.isPending}
            className={payslip.status === "sent" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
          >
            {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
              payslip.status === "sent" ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            {payslip.status === "sent" ? "Resend" : "Send"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete {payslipNumber}.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deletePayslip.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Invoice card */}
      <Card className="overflow-hidden shadow-md">
        <PayslipInvoiceView payslip={payslip} company={company} />
      </Card>
    </div>
  );
}
