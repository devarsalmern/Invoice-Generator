import { useRoute, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ShieldCheck, XCircle, Loader2, ChevronRight, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import PayslipInvoiceView from "../payslips/PayslipInvoiceView";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function fmtAud(n: number) {
  return `AUD $${(n || 0).toFixed(2)}`;
}

function fmtMonth(month: number, year: number) {
  try { return format(new Date(year, month - 1, 1), "MMMM yyyy"); } catch { return `${month}/${year}`; }
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d), "d MMM yyyy"); } catch { return d; }
}

export default function VerifyDocument() {
  const [, params] = useRoute("/verify/:token");
  const [, setLocation] = useLocation();
  const token = params?.token;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError(false);
    fetch(`${BASE_URL}/api/verify/${token}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [token]);

  const Logo = () => (
    <div className="flex justify-center mb-6">
      <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
        <div className="w-9 h-9 rounded bg-blue-600 flex items-center justify-center text-white shadow-sm">
          <span className="font-serif italic leading-none text-lg">P</span>
        </div>
        PayrollPro
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <Logo />
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-gray-500 text-sm">Verifying document…</p>
    </div>
  );

  if (!token || error || !data || !data.valid) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <Logo />
      <div className="max-w-sm w-full bg-white rounded-xl shadow border border-red-200 overflow-hidden">
        <div className="bg-red-500 h-1.5 w-full" />
        <div className="p-8 text-center">
          <div className="mx-auto w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Verification Failed</h2>
          <p className="text-gray-500 text-sm">
            This document could not be verified. It may be forged, modified, or not issued by PayrollPro.
          </p>
        </div>
      </div>
    </div>
  );

  // Legacy invoice (non-payslip) fallback
  if (data.documentType === "invoice") return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="max-w-md w-full">
        <Logo />
        <div className="bg-white rounded-xl shadow border border-emerald-200 overflow-hidden">
          <div className="bg-emerald-500 h-1.5 w-full" />
          <div className="p-6 text-center">
            <div className="mx-auto w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
              <ShieldCheck className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Invoice Verified</h2>
            <p className="text-gray-500 text-sm mt-1 mb-4">This invoice is authentic.</p>
            <div className="text-sm text-gray-700 space-y-1 text-left bg-gray-50 rounded p-4">
              <div><span className="text-gray-500">Invoice #: </span>{data.documentNumber}</div>
              <div><span className="text-gray-500">Issued by: </span>{data.issuedBy}</div>
              {data.issueDate && <div><span className="text-gray-500">Date: </span>{fmtDate(data.issueDate)}</div>}
              {data.amount != null && <div className="font-bold pt-1"><span className="text-gray-500 font-normal">Amount: </span>{fmtAud(data.amount)}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Full payslip view
  const { payslip, company, history } = data;
  const pastItems = (history || []).filter((h: any) => !h.isCurrent);
  const currentHistory = (history || []).find((h: any) => h.isCurrent);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Verified banner */}
      <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium">
        <ShieldCheck className="w-4 h-4" />
        Document verified — issued by PayrollPro
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Brand */}
        <Logo />

        {/* Tax Invoice */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <PayslipInvoiceView payslip={payslip} company={company} />
        </div>

        {/* History section */}
        {history && history.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                All Salary Slips — {payslip.employee?.firstName} {payslip.employee?.lastName}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Tap any slip to view it</p>
            </div>
            <ul className="divide-y">
              {history.map((h: any) => (
                <li key={h.id}>
                  {h.verificationToken ? (
                    <a
                      href={`${window.location.origin}/verify/${h.verificationToken}`}
                      className={`flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors ${h.isCurrent ? "bg-blue-50" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${h.isCurrent ? "bg-blue-500" : "bg-gray-300"}`} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {h.referenceNumber || fmtMonth(h.month, h.year)}
                            {h.isCurrent && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-normal">current</span>}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {h.issueDate ? fmtDate(h.issueDate) : fmtMonth(h.month, h.year)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-900">{fmtAud(h.totalAmount)}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-center justify-between px-5 py-3.5 opacity-50">
                      <div className="text-sm text-gray-500">{fmtMonth(h.month, h.year)}</div>
                      <span className="text-sm text-gray-500">{fmtAud(h.totalAmount)}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Verified via cryptographic token · PayrollPro Platform
        </p>
      </div>
    </div>
  );
}
