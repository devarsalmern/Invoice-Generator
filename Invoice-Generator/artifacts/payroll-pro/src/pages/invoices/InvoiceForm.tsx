import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { 
  useCreateInvoice,
  getListInvoicesQueryKey,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Receipt, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { format, addDays } from "date-fns";

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.string().min(1, "Quantity required").refine(v => !isNaN(parseFloat(v)), "Must be a number"),
  unitPrice: z.string().min(1, "Price required").refine(v => !isNaN(parseFloat(v)), "Must be a number"),
  taxRate: z.string().optional(),
});

const invoiceSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  invoiceNumber: z.string().optional(),
  customerName: z.string().min(2, "Customer name is required"),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function InvoiceForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createInvoice = useCreateInvoice();
  
  const { data: companies } = useListCompanies({
    query: { queryKey: getListCompaniesQueryKey() }
  });

  const today = new Date();
  const defaultIssueDate = today.toISOString().split('T')[0];
  const defaultDueDate = addDays(today, 30).toISOString().split('T')[0];

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      companyId: "",
      invoiceNumber: "",
      customerName: "",
      customerEmail: "",
      customerAddress: "",
      issueDate: defaultIssueDate,
      dueDate: defaultDueDate,
      items: [
        { description: "Consulting Services", quantity: "1", unitPrice: "0", taxRate: "0" }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Calculate totals
  const formItems = form.watch("items") || [];
  
  let subtotal = 0;
  let taxAmount = 0;

  const processedItems = formItems.map(item => {
    const qty = parseFloat(item.quantity || "0") || 0;
    const price = parseFloat(item.unitPrice || "0") || 0;
    const taxRate = parseFloat(item.taxRate || "0") || 0;
    
    const amount = qty * price;
    const itemTax = amount * (taxRate / 100);
    
    subtotal += amount;
    taxAmount += itemTax;
    
    return { ...item, amount, itemTax };
  });

  const totalAmount = subtotal + taxAmount;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const onSubmit = (data: InvoiceFormValues) => {
    const processedItemsForApi = data.items.map(item => {
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.unitPrice);
      const rate = parseFloat(item.taxRate || "0");
      return {
        description: item.description,
        quantity: qty,
        unitPrice: price,
        taxRate: rate,
        amount: qty * price
      };
    });

    const payload = {
      companyId: parseInt(data.companyId, 10),
      invoiceNumber: data.invoiceNumber || undefined,
      customerName: data.customerName,
      customerEmail: data.customerEmail || undefined,
      customerAddress: data.customerAddress || undefined,
      issueDate: new Date(data.issueDate).toISOString(),
      dueDate: new Date(data.dueDate).toISOString(),
      subtotal,
      taxAmount,
      totalAmount,
      items: processedItemsForApi
    };

    createInvoice.mutate({ data: payload }, {
      onSuccess: (newInvoice) => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        toast({ title: "Invoice created successfully" });
        setLocation(`/invoices/${newInvoice.id}`);
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Failed to create invoice",
          description: err.message,
        });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/invoices")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Invoice</h1>
          <p className="text-muted-foreground mt-1">Generate a new invoice for a customer.</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyId">Issuing Company *</Label>
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
                    <Label htmlFor="invoiceNumber">Invoice Number (Optional)</Label>
                    <Input id="invoiceNumber" placeholder="Leave blank for auto-generation" {...form.register("invoiceNumber")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Issue Date *</Label>
                    <Input id="issueDate" type="date" {...form.register("issueDate")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date *</Label>
                    <Input id="dueDate" type="date" {...form.register("dueDate")} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium border-b pb-2">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input id="customerName" {...form.register("customerName")} />
                      {form.formState.errors.customerName && (
                        <p className="text-sm text-destructive">{form.formState.errors.customerName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">Customer Email</Label>
                      <Input id="customerEmail" type="email" {...form.register("customerEmail")} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="customerAddress">Billing Address</Label>
                      <Textarea 
                        id="customerAddress" 
                        placeholder="Street, City, Postal Code" 
                        className="resize-none h-20"
                        {...form.register("customerAddress")} 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Line Items</CardTitle>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => append({ description: "", quantity: "1", unitPrice: "0", taxRate: "0" })}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Description</TableHead>
                        <TableHead className="w-[15%]">Qty</TableHead>
                        <TableHead className="w-[15%]">Price</TableHead>
                        <TableHead className="w-[15%]">Tax %</TableHead>
                        <TableHead className="w-[15%] text-right">Amount</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="p-2">
                            <Input 
                              placeholder="Item description" 
                              {...form.register(`items.${index}.description`)} 
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input 
                              type="number" 
                              step="0.01" 
                              {...form.register(`items.${index}.quantity`)} 
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input 
                              type="number" 
                              step="0.01" 
                              {...form.register(`items.${index}.unitPrice`)} 
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input 
                              type="number" 
                              step="0.1" 
                              {...form.register(`items.${index}.taxRate`)} 
                            />
                          </TableCell>
                          <TableCell className="p-2 text-right font-medium">
                            {formatCurrency(processedItems[index]?.amount || 0)}
                          </TableCell>
                          <TableCell className="p-2">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => fields.length > 1 && remove(index)}
                              disabled={fields.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {form.formState.errors.items?.root && (
                  <p className="text-sm text-destructive mt-2">{form.formState.errors.items.root.message}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-lg">Total Amount</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t p-4 flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={createInvoice.isPending}>
                  {createInvoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Draft Invoice
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setLocation("/invoices")}>
                  Cancel
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
