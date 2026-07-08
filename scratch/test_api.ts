import { GET } from "../src/app/api/registrations/route";
import { auth } from "../src/lib/auth";

jest.mock("../src/lib/auth"); // or just override it

async function main() {
    // We will bypass auth mock and just edit the file temporarily
}
