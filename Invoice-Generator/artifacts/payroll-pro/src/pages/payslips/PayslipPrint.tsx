import { useRoute } from "wouter";
import { useGetPayslip, getGetPayslipQueryKey, useGetCompany, getGetCompanyQueryKey } from "@workspace/api-client-react";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import PayslipInvoiceView from "./PayslipInvoiceView";

export default function PayslipPrint() {
  const [, params] = useRoute("/payslips/:id/print");
  const id = parseInt(params?.id as string, 10);

  const { data: payslip, isLoading } = useGetPayslip(id, {
    query: { enabled: !!id, queryKey: getGetPayslipQueryKey(id) }
  });
  const { data: company } = useGetCompany(payslip?.companyId as number, {
    query: { enabled: !!payslip?.companyId, queryKey: getGetCompanyQueryKey(payslip?.companyId as number) }
  });

  useEffect(() => {
    if (payslip && company) {
      const emp = payslip.employee;
      const empName = emp ? `${emp.firstName} ${emp.lastName}` : "Invoice";
      const ref = payslip.referenceNumber ? ` - ${payslip.referenceNumber}` : "";
      const payNum = `PAY-${String(payslip.id).padStart(4, "0")}`;
      document.title = `${empName} - ${payNum}${ref}`;
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, [payslip, company]);

  if (isLoading || !payslip) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="text-gray-500 text-sm">Preparing invoice for print…</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 10mm; }
          body { margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="no-print flex justify-center gap-4 py-4 bg-gray-100 border-b print:hidden">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          Print / Save as PDF
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-white border rounded text-sm font-medium hover:bg-gray-50"
        >
          Close
        </button>
      </div>
      <div className="max-w-[210mm] mx-auto bg-white shadow-sm">
        <PayslipInvoiceView payslip={payslip} company={company} />
      </div>
    </>
  );
}
