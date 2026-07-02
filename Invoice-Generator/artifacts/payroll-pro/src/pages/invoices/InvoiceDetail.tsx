import { useRoute, useLocation } from "wouter";
import { 
  useGetInvoice, 
  useDeleteInvoice, 
  useGenerateInvoicePdf,
  useSendInvoiceEmail,
  useMarkInvoicePaid,
  getGetInvoiceQueryKey, 
  getListInvoicesQueryKey,
  useGetCompany,
  getGetCompanyQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Mail, 
  Download, 
  Trash2,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Banknote,
  Calendar,
  UserCircle
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

export default function InvoiceDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/invoices/:id");
  const id = parseInt(params?.id as string, 10);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading, isError } = useGetInvoice(id, {
    query: {
      enabled: !!id,
      queryKey: getGetInvoiceQueryKey(id)
    }
  });

  const { data: company } = useGetCompany(invoice?.companyId as number, {
    query: {
      enabled: !!invoice?.companyId,
      queryKey: getGetCompanyQueryKey(invoice?.companyId as number)
    }
  });

  const deleteInvoice = useDeleteInvoice();
  const generatePdf = useGenerateInvoicePdf();
  const sendEmail = useSendInvoiceEmail();
  const markPaid = useMarkInvoicePaid();

  const handleDelete = () => {
    deleteInvoice.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        toast({ title: "Invoice deleted successfully" });
        setLocation("/invoices");
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Failed to delete invoice",
          description: err.message,
        });
      }
    });
  };

  const handleGeneratePdf = () => {
    generatePdf.mutate({ id }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
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
        queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
        toast({ title: "Invoice sent to customer" });
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

  const handleMarkPaid = () => {
    markPaid.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
        toast({ title: "Invoice marked as paid" });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Failed to update status",
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

  if (isError || !invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Invoice not found</h2>
        <Button className="mt-4" onClick={() => setLocation("/invoices")}>Back to Invoices</Button>
      </div>
    );
  }

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case "draft":
        return <Badge variant="secondary" className="text-sm px-3 py-1">Draft</Badge>;
      case "sent":
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-sm px-3 py-1">Sent</Badge>;
      case "paid":
        return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-sm px-3 py-1">Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive" className="text-sm px-3 py-1">Overdue</Badge>;
      default:
        return <Badge variant="outline" className="text-sm px-3 py-1">{statusStr}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Invoice {invoice.invoiceNumber}</h1>
              {getStatusBadge(invoice.status)}
            </div>
            <p className="text-muted-foreground mt-1">
              For {invoice.customerName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {invoice.status !== 'paid' && (
            <Button 
              onClick={handleMarkPaid} 
              variant="outline"
              disabled={markPaid.isPending}
              className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950"
            >
              {markPaid.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Banknote className="h-4 w-4 mr-2" />}
              Mark as Paid
            </Button>
          )}

          {invoice.pdfUrl ? (
            <Button variant="outline" onClick={() => window.open(invoice.pdfUrl || '', '_blank')}>
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
            disabled={sendEmail.isPending || !invoice.pdfUrl}
          >
            {sendEmail.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : invoice.status === 'sent' ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            {invoice.status === 'sent' ? "Resend Email" : "Send to Customer"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this invoice? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleteInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="shadow-md print:shadow-none overflow-hidden">
        <div className="h-3 bg-primary w-full" />
        <CardContent className="p-8 sm:p-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-primary uppercase">INVOICE</h2>
              <div className="mt-8 space-y-1 text-sm">
                <h3 className="font-bold text-lg text-foreground">{company?.name || "Company Name"}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{company?.address}</p>
                {company?.registrationNumber && <p className="text-muted-foreground">Reg: {company.registrationNumber}</p>}
                {company?.taxNumber && <p className="text-muted-foreground">Tax ID: {company.taxNumber}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm text-right self-start md:mt-12">
              <div className="text-muted-foreground">Invoice Number:</div>
              <div className="font-medium font-mono">{invoice.invoiceNumber}</div>
              
              <div className="text-muted-foreground">Issue Date:</div>
              <div className="font-medium">{format(new Date(invoice.issueDate), "MMM d, yyyy")}</div>
              
              <div className="text-muted-foreground">Due Date:</div>
              <div className="font-medium">{format(new Date(invoice.dueDate), "MMM d, yyyy")}</div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="mb-10 bg-muted/30 p-6 rounded-lg border w-fit min-w-[300px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Bill To</h3>
            <p className="font-bold text-lg">{invoice.customerName}</p>
            {invoice.customerEmail && <p className="text-sm text-muted-foreground mt-1">{invoice.customerEmail}</p>}
            {invoice.customerAddress && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{invoice.customerAddress}</p>}
          </div>

          {/* Line Items Table */}
          <div className="mb-8">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-border bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[50%] font-bold text-foreground">Description</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Qty</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Unit Price</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Tax %</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.taxRate ? `${item.taxRate}%` : '-'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                      No line items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex flex-col md:flex-row justify-between items-end md:items-start gap-8">
            <div className="w-full md:w-1/2 order-2 md:order-1">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Payment Instructions:</p>
                <p>Please make payment by the due date. Reference invoice number {invoice.invoiceNumber} on your transfer.</p>
              </div>
            </div>
            
            <div className="w-full md:w-[350px] order-1 md:order-2 space-y-3 text-sm border rounded-lg p-5 bg-card">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatCurrency(invoice.taxAmount)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-base">Total Due</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Verification Link */}
          {invoice.verificationToken && (
            <div className="mt-16 pt-8 border-t text-center space-y-2 print:hidden">
              <p className="text-sm font-medium text-muted-foreground">Document Authenticity</p>
              <p className="text-xs text-muted-foreground">
                This document is cryptographically signed. Verify its authenticity at:
              </p>
              <p className="text-xs font-mono bg-muted py-1 px-3 rounded inline-block">
                {window.location.origin}/verify/{invoice.verificationToken}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
