import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useRoute } from "wouter";
import { useCreateCompany, useGetCompany, useUpdateCompany, getGetCompanyQueryKey, getListCompaniesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const companySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  logoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export default function CompanyForm() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/companies/:id/edit");
  const isEditing = !!match;
  const id = isEditing ? parseInt(params.id as string, 10) : undefined;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  
  const { data: company, isLoading: isLoadingCompany } = useGetCompany(id as number, {
    query: {
      enabled: isEditing && !!id,
      queryKey: getGetCompanyQueryKey(id as number)
    }
  });

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      registrationNumber: "",
      taxNumber: "",
      phone: "",
      email: "",
      address: "",
      logoUrl: "",
    },
  });

  useEffect(() => {
    if (company && isEditing) {
      form.reset({
        name: company.name,
        registrationNumber: company.registrationNumber || "",
        taxNumber: company.taxNumber || "",
        phone: company.phone || "",
        email: company.email || "",
        address: company.address || "",
        logoUrl: company.logoUrl || "",
      });
    }
  }, [company, form, isEditing]);

  const onSubmit = (data: CompanyFormValues) => {
    // Clean up empty strings to undefined to match API expectations
    const cleanData = {
      ...data,
      email: data.email || undefined,
      logoUrl: data.logoUrl || undefined,
    };

    if (isEditing && id) {
      updateCompany.mutate({ id, data: cleanData }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
          toast({ title: "Company updated successfully" });
          setLocation(`/companies/${id}`);
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Failed to update company",
            description: err.message,
          });
        }
      });
    } else {
      createCompany.mutate({ data: cleanData as any }, {
        onSuccess: (newCompany) => {
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
          toast({ title: "Company created successfully" });
          setLocation(`/companies/${newCompany.id}`);
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Failed to create company",
            description: err.message,
          });
        }
      });
    }
  };

  const isPending = createCompany.isPending || updateCompany.isPending;

  if (isEditing && isLoadingCompany) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(isEditing ? `/companies/${id}` : "/companies")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEditing ? "Edit Company" : "New Company"}</h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? "Update your company details." : "Add a new company to your workspace."}
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Details
            </CardTitle>
            <CardDescription>Essential business information for records and billing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input id="name" placeholder="Acme Inc." {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input id="registrationNumber" placeholder="Reg #" {...form.register("registrationNumber")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxNumber">Tax/VAT Number</Label>
                <Input id="taxNumber" placeholder="Tax ID" {...form.register("taxNumber")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" type="email" placeholder="contact@company.com" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+1 (555) 000-0000" {...form.register("phone")} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Full Address</Label>
                <Textarea 
                  id="address" 
                  placeholder="123 Business Rd, City, Country" 
                  className="resize-none" 
                  {...form.register("address")} 
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button type="button" variant="outline" onClick={() => setLocation(isEditing ? `/companies/${id}` : "/companies")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Company"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
