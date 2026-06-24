# VINVERSE Admin Bootstrap

This document covers the default administrative access to the VINVERSE system and how to securely manage admin accounts.

## 1. Default Admin Credentials

Upon running the initial database seed (`npm run seed`), a default administrative account is provisioned:

- **Email:** `admin@vinverse.com`
- **Password:** `Admin@123456`
- **Role:** `ADMIN`
- **Status:** `ACTIVE`

**Note:** The seed script is completely idempotent. Running `npm run seed` multiple times will not create duplicate administrator records. It will simply upsert the existing `admin@vinverse.com` account.

## 2. Changing the Admin Password

For security reasons, the default admin password should be changed immediately after taking control of a production or staging instance.

To change your password:

1. **Log in** with the current admin credentials to obtain your `accessToken`.
2. **Submit a PATCH request** to `/api/v1/users/password` with your token in the `Authorization` header.

**Example Request:**
```bash
curl -X PATCH http://localhost:4000/api/v1/users/password \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Admin@123456",
    "newPassword": "YourSecureNewPassword!99"
  }'
```

*(This will automatically revoke all existing refresh tokens, requiring you to log in again on all devices.)*

## 3. Creating Additional Admins

You can quickly and safely provision additional administrators using the built-in NPM script via terminal.

Run the following command from the backend project root:

```bash
npm run create-admin
```

You will be prompted interactively to enter the new administrator's:
1. **Name**
2. **Email**
3. **Password**

This script properly hashes the password (using bcrypt with 12 rounds, exactly matching customer registration) and directly inserts the new active admin into the database.

## 4. Deactivating Admins

If an administrator leaves the organization or their access needs to be temporarily revoked, you should update their user status rather than deleting the record (to preserve audit logs and relationships).

While a dedicated admin management UI might be implemented later, deactivation can be done directly in the database.

**Via Prisma Studio:**
1. Run `npx prisma studio`
2. Open the `User` model.
3. Locate the administrator by email.
4. Change the `status` field from `ACTIVE` to `INACTIVE` or `BLOCKED`.
5. Save changes.

*Any active sessions (refresh tokens) will fail on their next refresh, and the user will immediately lose API access since the `authenticate()` middleware validates that `status === "ACTIVE"`.*
