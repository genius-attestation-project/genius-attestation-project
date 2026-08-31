import { GET } from "../src/app/api/registrations/route";
import * as authModule from "../src/lib/auth";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";

async function main() {
    try {
        const adminUser = await prisma.user.findFirst({
            where: { role: { name: "OWNER_ADMIN" } }
        });
        
        // Mock auth
        (authModule as any).auth = async () => ({
            user: { id: adminUser!.id, ownerAdminId: adminUser!.id, email: "test@example.com" }
        });

        const req = new NextRequest("http://localhost:3000/api/registrations?pageSize=50");
        const res = await GET(req as any);
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body:", text.substring(0, 500));
    } catch (e) {
        console.error("FAILED:", e);
    }
}
main();
