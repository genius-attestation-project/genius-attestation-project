import { jsonError } from "@/utils/response";

export async function POST() {
  return jsonError("Payment submission now uses /api/account-update/payment-update.", 410);
}
