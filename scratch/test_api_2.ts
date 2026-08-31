import { GET } from "../src/app/api/registrations/route";

async function main() {
    // We can't easily mock auth() without overriding the module, but we can do it via a quick ts-node script
    // Actually, I can just inject the auth mock.
}
