/**
 * Calculates Number of Days:
 * Current Date minus Date the document arrived at the CURRENT office.
 * Whenever a document is transferred to another office, the calculation restarts from the arrival date of the new office.
 */
export function calculateNumberOfDays(
  arrivalDate?: string | Date | null,
  fallbackDate?: string | Date | null
): string {
  const dateVal = arrivalDate || fallbackDate;
  if (!dateVal) return "0 Days";
  const arrival = new Date(dateVal);
  if (isNaN(arrival.getTime())) return "0 Days";
  const now = new Date();
  const diffTime = now.getTime() - arrival.getTime();
  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  return `${diffDays} Days`;
}

/**
 * Calculates Finished Days:
 * Outbound: Current Date - Date Sent
 * Inbound: Current Date - Date Received (or Date Transferred)
 */
export function calculateFinishedDays(
  dateSentOrReceived?: string | Date | null
): string {
  if (!dateSentOrReceived) return "0 Days";
  const dateObj = new Date(dateSentOrReceived);
  if (isNaN(dateObj.getTime())) return "0 Days";
  const now = new Date();
  const diffTime = now.getTime() - dateObj.getTime();
  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  return `${diffDays} Days`;
}
