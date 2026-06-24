import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListCompanies, getListCompaniesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Search, MapPin, Phone, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyList() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  
  const { data: companies, isLoading } = useListCompanies({
    query: { queryKey: getListCompaniesQueryKey() }
  });

  const filteredCompanies = companies?.filter(company => 
    company.name.toLowerCase().includes(search.toLowerCase()) ||
    (company.registrationNumber && company.registrationNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground mt-2">Manage the organizations you process payroll for.</p>
        </div>
        <Button onClick={() => setLocation("/companies/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      <div className="flex items-center space-x-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search companies..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCompanies?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">No companies found</CardTitle>
          <CardDescription className="mt-2 mb-6">
            {search ? "No companies match your search." : "Get started by adding your first company."}
          </CardDescription>
          {search ? (
            <Button variant="outline" onClick={() => setSearch("")}>Clear Search</Button>
          ) : (
            <Button onClick={() => setLocation("/companies/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies?.map((company) => (
            <Card 
              key={company.id} 
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => setLocation(`/companies/${company.id}`)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl line-clamp-1">{company.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-1">
                      {company.registrationNumber ? `Reg: ${company.registrationNumber}` : "No registration number"}
                    </CardDescription>
                  </div>
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="line-clamp-1">{company.address || "No address provided"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span className="line-clamp-1">{company.phone || "No phone provided"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="line-clamp-1">{company.email || "No email provided"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
