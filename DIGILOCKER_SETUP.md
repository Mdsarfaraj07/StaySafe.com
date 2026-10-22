# StaySafe DigiLocker integration

## What this implements

- Authenticated StaySafe owner starts an OAuth 2.0 authorization flow.
- Backend generates a random one-time `state` bound to the authenticated user and a consent version.
- User is redirected to DigiLocker; the provider redirects to the backend callback.
- Backend consumes the state, exchanges the authorization code server-to-server, retrieves DigiLocker account details and issued-document metadata, then records `PENDING_REVIEW`.
- Frontend shows a status toast after redirect.
- The old demo CKYC registry is disabled by default. To test that old mock only, explicitly enable the `mock-ckyc` profile.

## Critical limitation

This is an OAuth/DigiLocker requester integration scaffold, not a direct CKYC Registry (CKYCR/CERSAI) lookup. DigiLocker login/account details and a list of issued-document metadata do not alone prove that a CKYC record exists or that a document has passed all required authenticity checks. The implementation deliberately records `PENDING_REVIEW`; it never auto-marks a record `VERIFIED`.

The callback currently lists issued-document metadata but does not download, retain, or cryptographically validate a selected identity document. Complete that step against your approved DigiLocker API specification and StaySafe's applicable legal/compliance requirements before using this for production identity verification.

## Onboarding prerequisites

1. Register StaySafe as a DigiLocker requester/partner and receive approval and API documentation.
2. Configure the exact registered redirect URI, client ID, and client secret.
3. Confirm the approved API base URLs, OAuth scopes, endpoint versions, document-fetch method, response schemas, rate limits, and signature-validation requirements with DigiLocker. The defaults below follow the published Authorized Partner API specification; provider onboarding materials take precedence.
4. Use a real HTTPS redirect URI in deployed environments.

Official starting points:
- https://www.digilocker.gov.in/web/partners/help-and-support
- https://www.digilocker.gov.in/web/implementation-model
- https://img1.digitallocker.gov.in/circulars/Digital-Locker-Authorized-Partner-APISpecification-v1.13.pdf

## Local setup

Set environment variables in the backend runtime (do not commit credentials):

```text
DIGILOCKER_CLIENT_ID=your_approved_client_id
DIGILOCKER_CLIENT_SECRET=your_approved_client_secret
DIGILOCKER_REDIRECT_URI=http://localhost:8080/api/kyc/digilocker/callback
DIGILOCKER_AUTHORIZE_URI=https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize
DIGILOCKER_TOKEN_URI=https://digilocker.meripehchaan.gov.in/public/oauth2/1/token
DIGILOCKER_USER_URI=https://digilocker.meripehchaan.gov.in/public/oauth2/1/user
DIGILOCKER_ISSUED_DOCUMENTS_URI=https://digilocker.meripehchaan.gov.in/public/oauth2/2/files/issued
FRONTEND_URL=http://localhost:5173
KYC_HASH_SECRET=replace_with_a_long_random_secret
```

The backend's configured `redirect-uri` must exactly match the URI registered with DigiLocker. The frontend should be available at `http://localhost:5173`; update `FRONTEND_URL` for other environments.

Run the backend from `staysafe-fullstack/backend`:

```bash
mvn spring-boot:run
```

Run the frontend from `staysafe-fullstack/frontend`:

```bash
npm install
npm run dev
```

Log in as a StaySafe owner and open the existing KYC onboarding flow. Select consent and click **Continue with DigiLocker**. Without approved client credentials, the start endpoint intentionally returns a configuration error. Do not put these credentials in Vite variables.

## Database and deployment notes

Hibernate will create the `digilocker_oauth_state` table because the current project uses `spring.jpa.hibernate.ddl-auto=update`. For production, use Flyway/Liquibase migrations instead.

The OAuth `state` records are stored in MySQL and expire after 10 minutes. Add a scheduled cleanup for expired/consumed state records. For high availability, the database state flow is preferable to in-memory state, but callback consumption should be strengthened with an atomic conditional update/row lock to prevent simultaneous replay.

The access token is used only in the callback and is not stored. If your approved workflow needs later document fetching, implement encrypted short-lived token storage or another provider-supported flow; do not store bearer tokens in plaintext.

## API

- `POST /api/kyc/digilocker/start` — requires an authenticated owner; JSON body `{"consent":true}`.
- `GET /api/kyc/digilocker/callback?code=...&state=...` — public OAuth callback; validates and consumes state, exchanges the code, queries profile and issued-document metadata, then redirects to the frontend.
- `GET /api/kyc/me` — existing StaySafe KYC status endpoint.
- Existing `/api/kyc/ckyc-lookup` and `/api/kyc/ckyc-confirm` no longer use the demo registry by default; they return service-unavailable until an authorized CKYC provider is configured.

## Production hardening required

- Verify current official API endpoints, token auth requirements, scopes, document response structure and required signatures with DigiLocker.
- Add rate limits to OAuth start and callback; protect against state replay with an atomic consume operation.
- Add PKCE if required by the selected client profile/specification.
- Validate and cryptographically verify the selected issued document per issuer/API guidance before any `VERIFIED` transition.
- Do not store raw identity numbers, documents, tokens, OTPs or complete provider responses in logs.
- Define consent language, lawful purpose, retention/deletion, data-subject rights and access policy.
- Add tests for OAuth errors, expired/replayed state, disabled users, provider timeouts, missing profile data and duplicate KYC records.
