export function buildReceiptUrl(paymentUpdateId: string) {
  return `/api/account-update/receipts/${encodeURIComponent(paymentUpdateId)}`;
}
