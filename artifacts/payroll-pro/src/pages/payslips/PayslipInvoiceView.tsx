import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";

interface PayslipInvoiceViewProps {
  payslip: any;
  company: any;
}

const fmt = (n: number) => n.toFixed(2);
const fmtAud = (n: number) => `$${n.toFixed(2)}`;

const formatDisplayDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return "—";
  try { return format(new Date(dateStr), "d MMMM yyyy"); } catch { return dateStr; }
};

const formatItemDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr;
};

export default function PayslipInvoiceView({ payslip, company }: PayslipInvoiceViewProps) {
  const emp = payslip.employee;
  const items: any[] = payslip.items || [];

  const subtotal = payslip.subtotal ?? items.reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const gstAmount = payslip.gstAmount ?? 0;
  const totalAmount = payslip.totalAmount ?? subtotal + gstAmount;

  // Only show tax column if any item has a non-zero taxRate
  const hasTax = items.some((i: any) => parseFloat(i.taxRate ?? 0) > 0);

  const payslipNumber = `PAY-${String(payslip.id).padStart(4, "0")}`;
  const verifyUrl = payslip.verificationToken
    ? `${window.location.origin}/verify/${payslip.verificationToken}`
    : null;

  return (
    <div className="bg-white text-[13px] font-sans text-gray-900 p-10" style={{ minHeight: "297mm" }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        {/* Left: Company info */}
        <div>
          <div className="text-2xl font-bold mb-3">Tax Invoice</div>
          <div className="font-semibold text-sm">{company?.name || "Company"}</div>
          {company?.taxNumber && <div className="text-gray-600 text-xs">ABN: {company.taxNumber}</div>}
          {company?.email && <div className="text-gray-600 text-xs">{company.email}</div>}
          {company?.phone && <div className="text-gray-600 text-xs">{company.phone}</div>}
        </div>

        {/* Right: Employee info */}
        {emp && (
          <div className="text-right">
            <div className="font-semibold text-sm">{emp.firstName} {emp.lastName}</div>
            {(emp as any).address && (
              <div className="text-gray-600 text-xs whitespace-pre-line">{(emp as any).address}</div>
            )}
            {(emp as any).abn && <div className="text-gray-600 text-xs">ABN: {(emp as any).abn}</div>}
          </div>
        )}
      </div>

      {/* Amount summary row */}
      <div className="flex flex-wrap gap-8 mb-4 py-3 border-t border-b border-gray-200">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Amount due</div>
          <div className="text-2xl font-bold mt-0.5">{fmtAud(totalAmount)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Due date</div>
          <div className="text-base font-bold mt-0.5">{formatDisplayDate(payslip.dueDate)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Issue date</div>
          <div className="text-sm mt-0.5">{formatDisplayDate(payslip.issueDate)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Invoice number</div>
          <div className="text-sm mt-0.5">{payslipNumber}</div>
        </div>
        {payslip.referenceNumber && (
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Reference</div>
            <div className="text-sm mt-0.5">{payslip.referenceNumber}</div>
          </div>
        )}
      </div>

      {/* View online link */}
      {verifyUrl && (
        <div className="mb-5">
          <a href={verifyUrl} className="text-blue-600 text-sm font-medium hover:underline">View online</a>
        </div>
      )}

      {/* Line items table */}
      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="border-b-2 border-gray-900">
            <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-700 w-1/2">Description</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700">Quantity</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700">Price</th>
            {hasTax && <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700">Tax</th>}
            <th className="text-right py-2 pl-3 text-xs font-semibold text-gray-700">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? items.map((item: any, idx: number) => (
            <tr key={idx} className="border-b border-gray-100">
              <td className="py-3 pr-4 align-top">
                <div className="text-sm">{item.description || "Daily subcontract painting services"}</div>
                {item.date && (
                  <div className="text-xs text-gray-500 mt-0.5">Dated: {formatItemDate(item.date)} qty/hours</div>
                )}
              </td>
              <td className="py-3 px-3 text-right align-top text-sm">{fmt(item.quantity || 0)}</td>
              <td className="py-3 px-3 text-right align-top text-sm">{fmt(item.unitPrice || 0)}</td>
              {hasTax && <td className="py-3 px-3 text-right align-top text-sm">{fmt(parseFloat(item.taxRate ?? 0))}%</td>}
              <td className="py-3 pl-3 text-right align-top text-sm">{fmt(item.amount || 0)}</td>
            </tr>
          )) : (
            <tr className="border-b border-gray-100">
              <td className="py-3 pr-4 text-sm text-gray-500 italic" colSpan={hasTax ? 5 : 4}>No line items recorded.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals (right-aligned) */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          {gstAmount > 0 && (
            <>
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">Total GST 10%</span>
                <span>{fmt(gstAmount)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm border-t border-gray-200 mt-1">
                <span className="text-gray-600">Total</span>
                <span>{fmt(totalAmount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between py-2 border-t border-gray-900 mt-1">
            <span className="font-bold">Amount due</span>
            <span className="font-bold text-base">{fmtAud(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Footer: QR + bank details */}
      <div className="border-t border-gray-200 pt-6 flex items-start gap-5">
        {verifyUrl ? (
          <div className="flex-shrink-0">
            <QRCodeSVG value={verifyUrl} size={72} />
          </div>
        ) : null}
        <div>
          {verifyUrl && (
            <a href={verifyUrl} className="text-blue-600 text-sm font-medium hover:underline block mb-2">View online</a>
          )}
          {emp && (
            <>
              <div className="text-sm font-medium">{emp.firstName} {emp.lastName}</div>
              {(emp as any).bsb && <div className="text-xs text-gray-600">BSB: {(emp as any).bsb}</div>}
              {emp.bankAccount && <div className="text-xs text-gray-600">Account: {emp.bankAccount}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
