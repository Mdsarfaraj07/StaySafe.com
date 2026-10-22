# StaySafe live support, notification emails, and property evidence documents

This update adds a support chat experience, admin chat replies, email delivery for application notifications, and private property verification document uploads.

## 1. Live support chat

- Signed-in customers and property owners see a **Live support** button.
- Messages are persisted in the `chat_messages` table.
- The customer widget polls every 3 seconds; the admin conversation list polls every 4 seconds and the selected thread every 2.5 seconds. This is near-real-time polling, not a WebSocket connection.
- Admin users can open the **Live Chat** tab in the admin dashboard and reply to conversations.
- Customers/owners can access only their own conversation. Admin chat endpoints require the ADMIN role.
- A new customer message creates an admin notification. An admin reply creates a user notification and email (when SMTP is enabled).

## 2. Email notifications

The existing `NotificationService` now emails the registered account email whenever the app creates a notification. This includes ticket updates, listing review outcomes, booking/payment events, document review outcomes and support chat replies. The in-app notification is saved even if mail delivery fails.

Set the following backend environment variables before testing delivery:

```properties
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-sending-address@example.com
MAIL_PASSWORD=your-provider-app-password
MAIL_SMTP_AUTH=true
MAIL_SMTP_STARTTLS=true
MAIL_ENABLED=true
FRONTEND_URL=http://localhost:5173
```

For Gmail, use an App Password with 2-Step Verification enabled. Do not commit real credentials. In production, move outbound email to a retryable queue/outbox; delivery in this scaffold is synchronous best-effort.

## 3. Property evidence documents

When creating a property listing, the owner must select:

- An electricity bill (`ELECTRICITY_BILL`)
- Ownership proof (`OWNERSHIP_PROOF`) or rental/owner authorization (`RENTAL_AUTHORIZATION`)

Optional document types include property tax receipt, address proof and other supporting evidence. Accepted files are PDF, JPG or PNG, maximum 10 MB each.

Files are stored under `PRIVATE_DOCUMENT_DIR` (default `./private-documents`), not in the public image folder. Downloads require the owner who uploaded the file or an admin. The frontend does not receive a public document URL.

Admins can review pending documents under **Property Documents** in the admin dashboard. A property cannot be activated until an approved electricity bill and approved ownership proof or rental authorization exist, and the owner has completed KYC. Rejection remarks are saved and emailed to the registered owner email.

## 4. Run locally

1. Use Java 17 and MySQL, with the existing `staysafe` database configuration.
2. Set SMTP variables if you want real email delivery; otherwise the notification records still work, but emails will not be sent.
3. Start the backend from `backend`:

   ```bash
   mvn spring-boot:run
   ```

4. Start the frontend from `frontend`:

   ```bash
   npm install
   npm run dev
   ```

5. Log in as a customer/owner to test Live support. Log in as an admin to reply in Admin Dashboard → Live Chat.
6. Log in as an owner and create a property with the required document files. Review them as admin before approving the listing.

With `spring.jpa.hibernate.ddl-auto=update`, Hibernate creates the new `chat_messages` and `property_documents` tables on startup. For production, use a versioned database migration and back up the database before deployment.

## 5. Production cautions

- The polling intervals are near-real-time, not push-based WebSockets. Add WebSocket/STOMP or SSE if you need push delivery at scale.
- Run antivirus/malware scanning on uploaded files and consider object storage with private ACLs, KMS encryption and expiring signed downloads.
- Restrict document retention, use least-privilege admin access, audit downloads/reviews and establish a deletion policy.
- Configure rate limits, SMTP retry/outbox processing, SPF/DKIM/DMARC, monitoring and alerting.
- This package still requires local build, end-to-end tests and production security review before deployment.

## API endpoints added

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/chat/messages` | Get the signed-in customer's/owner's conversation |
| `POST` | `/api/chat/messages` | Send a support message |
| `GET` | `/api/chat/admin/conversations` | Admin list of conversations |
| `GET` | `/api/chat/admin/{userId}/messages` | Admin reads a conversation |
| `POST` | `/api/chat/admin/{userId}/messages` | Admin replies |
| `POST` | `/api/property-documents/property/{propertyId}` | Owner uploads a private document (`multipart/form-data`) |
| `GET` | `/api/property-documents/property/{propertyId}` | Owner/admin lists documents for a property |
| `GET` | `/api/property-documents/admin/pending` | Admin lists pending documents |
| `PUT` | `/api/property-documents/admin/{id}/review` | Admin approves/rejects a document |
| `GET` | `/api/property-documents/{id}/download` | Authorized owner/admin downloads the file |
