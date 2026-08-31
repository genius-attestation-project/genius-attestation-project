import React from "react";
import { DocumentDetailsClient } from "@/features/registration/components/DocumentDetailsClient";

export default async function DocumentDetailsPage({
  params,
}: {
  params: Promise<{ trackingNumber: string }>;
}) {
  const { trackingNumber } = await params;
  return <DocumentDetailsClient trackingNumber={trackingNumber} />;
}
