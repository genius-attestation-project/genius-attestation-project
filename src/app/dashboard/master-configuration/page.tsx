import { redirect } from "next/navigation";

export default function MasterConfigurationIndex() {
  // Redirect to the first item in the master configuration list
  redirect("/dashboard/master-configuration/document-types");
}
