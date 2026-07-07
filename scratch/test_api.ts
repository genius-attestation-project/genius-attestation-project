async function main() {
  const res = await fetch("http://localhost:3000/api/roles/cmr97au6e39izry0ly9pvhfs2/permissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissionCodes: ["dashboard.view"] })
  });
  const text = await res.text();
  console.log("Status:", res.status, text);
}
main();
