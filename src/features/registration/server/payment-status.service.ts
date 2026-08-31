export type ComputePaymentStatusParams = {
  approvalStatus: string;
  advancePaymentStatus?: string | null;
  totalCharges: number;
  advancePaid: number;
  balanceAmount: number;
  receivedAmount?: number;
};

export type ComputedPaymentStatus = "Pending Approval" | "Unpaid" | "Partially Paid" | "Paid";

/**
 * Centralized Automatic Payment Status Calculation Engine
 *
 * Rules:
 * 1. If Revenue Registration has NOT been approved and Advance Payment has NOT been approved:
 *    Payment Status = "Pending Approval"
 * 2. If Revenue Registration HAS been approved or Advance Payment HAS been approved:
 *    - Balance Amount = 0 (or Received Amount >= Total Charges) => "Paid"
 *    - Balance Amount > 0 AND (Advance Paid > 0 or Received Amount > 0) => "Partially Paid"
 *    - Balance Amount = Total Charges AND Advance Paid = 0 => "Unpaid"
 */
export function calculatePaymentStatus(params: ComputePaymentStatusParams): ComputedPaymentStatus {
  const approvalStatus = (params.approvalStatus || "").trim();
  const advancePaymentStatus = (params.advancePaymentStatus || "").trim();

  // A registration is approved if either registration approval or advance payment approval is granted
  const isApproved =
    approvalStatus === "Approved" ||
    approvalStatus === "Accepted" ||
    advancePaymentStatus === "Approved";

  // Rule 1: If registration is waiting for approval, payment status is always Pending Approval
  if (!isApproved) {
    return "Pending Approval";
  }

  const total = Number(params.totalCharges) || 0;
  const advance = Number(params.advancePaid) || 0;
  const balance = Math.max(0, Number(params.balanceAmount));
  const received =
    params.receivedAmount !== undefined
      ? Number(params.receivedAmount)
      : Math.max(0, total - balance);

  // Rule 4: If Balance Amount = 0 (or Received Amount >= Total Amount), status is Paid
  if (balance <= 0 || (total > 0 && received >= total)) {
    return "Paid";
  }

  // Rule 3: If Advance Amount > 0 or Received Amount > 0 AND Balance Amount > 0, status is Partially Paid
  if ((advance > 0 || received > 0) && balance > 0) {
    return "Partially Paid";
  }

  // Rule 2: If Advance Amount = 0 AND Balance Amount = Total Amount (no payments received), status is Unpaid
  if (advance === 0 && received === 0 && balance >= total) {
    return "Unpaid";
  }

  return balance <= 0 ? "Paid" : received > 0 ? "Partially Paid" : "Unpaid";
}
