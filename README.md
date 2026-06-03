# Genius Attestation Project

## Manual Super Admin Setup With Prisma Studio

Use these steps to manually prepare a Google account for Super Admin Google login in development or during trusted admin database maintenance.

1. Run Prisma Studio:

   ```bash
   npx prisma studio
   ```

2. Open Prisma Studio in the browser:

   ```text
   http://localhost:5555
   ```

3. Open the `AccessRole` table.

4. Create the role if it does not already exist:

   ```text
   name = Super Admin
   description = Full system access
   ```

5. Open the `Users` table.

6. Find the user row for the selected Google account email.

7. Update that user:

   ```text
   roleId = Super Admin role id
   isActive = true
   provider = google
   ```

8. Save the changes.

9. Verify Google login.

Only users whose related `AccessRole.name` is exactly `Super Admin` can log in with Google. Normal users can still log in manually with email and password.

Prisma Studio is only for development and trusted admin database editing. Do not expose it publicly.
