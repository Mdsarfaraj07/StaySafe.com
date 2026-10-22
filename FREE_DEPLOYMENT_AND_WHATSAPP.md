# StaySafe: WhatsApp Support + Free Deployment

## WhatsApp support (free click-to-chat)

The floating **WhatsApp support** button opens `https://wa.me/<number>` with a prefilled message. It is a user-initiated handoff to WhatsApp; the website cannot read or synchronize WhatsApp replies. This does not use the WhatsApp Business Platform API and has no API fee.

Set `VITE_WHATSAPP_NUMBER` in the frontend environment to the support phone in international digits only. Example format: `919876543210` (replace with your real business number; no `+`, spaces, brackets, or hyphens). For local development, copy `frontend/.env.example` to `frontend/.env.local`, set the number, then restart Vite. For Render, enter the value when prompted by the Blueprint or in the `staysafe-web` environment settings and redeploy.

Do not put a WhatsApp API token or any private credential in a `VITE_` variable. Vite exposes `VITE_` values to the browser.

## Local one-command launch (free, requires Docker Desktop)

From the project root:

```bash
docker compose up --build
```

Open `http://localhost:5173`. The backend is on `http://localhost:8080`; MySQL is on port `3306`. First startup builds the Java and frontend containers and initializes the database. Stop with `Ctrl+C`; use `docker compose down` to stop and `docker compose down -v` only if you intentionally want to delete the local database volume.

The Compose credentials/secrets are development-only. Never expose this Compose configuration directly to the public internet.

## Free cloud deployment (Render + MySQL-compatible free database)

1. Push this project to a GitHub repository.
2. Create a free MySQL-compatible database, for example a TiDB Cloud Starter instance, and create a schema named `staysafe`. Copy its hostname, database username and password. TiDB Cloud documents a free MySQL-compatible Starter tier, subject to quotas and plan rules.
3. In Render, choose **New → Blueprint**, connect the repository, and select its `render.yaml`.
4. Supply the database hostname, username and password, plus your WhatsApp number. `DB_PORT` defaults to `4000` and TLS mode defaults to `VERIFY_IDENTITY` for a hosted MySQL-compatible database. Adjust these to match your provider's connection details.
5. After the services are created, copy the exact frontend origin (for example `https://staysafe-web.onrender.com`) into the backend `CORS_ORIGINS` and `FRONTEND_URL` environment variables, then redeploy/restart the backend. The initial localhost values are only placeholders. Confirm the backend URL was injected into `VITE_API_HOST`; if you change the API host later, redeploy the static frontend.
6. Add Razorpay test keys and an email API/SMTP settings only when you are ready to test payment and email features. Do not add production secrets to Git.

References:
- Render free service limitations: https://render.com/docs/free
- Render Blueprint configuration: https://render.com/docs/blueprint-spec
- TiDB Cloud free Starter tier: https://docs.pingcap.com/tidbcloud/select-cluster-tier/

## Important free-tier limitations

- Render free web services can sleep when idle and can take about a minute to wake. Free services use ephemeral local storage, so local property uploads and private documents can disappear after a restart/redeploy. Do not store real identity or property documents on this setup. Use private object storage with access controls for anything real.
- Free database tiers have quotas and provider-specific limits; check the current terms before launch. Keep backups of any data you care about.
- Free hosting is suitable for a demo or portfolio, not a production booking marketplace with sensitive identity documents or financial transactions.
- `MAIL_ENABLED` is false in the Blueprint by default. Configure an SMTP provider separately; Render free services restrict outbound SMTP ports 25, 465, and 587, so use a supported email API or a host/provider combination that permits email delivery.
- WhatsApp click-to-chat does not create a shared agent inbox or two-way API integration. Automated replies, templates, webhooks, and syncing website chat with WhatsApp require the WhatsApp Business Platform and Meta setup.
- DigiLocker/CKYC and Razorpay require their own approved credentials and production configuration. Never treat mock/demo KYC records as real identity verification.

## Troubleshooting

- **WhatsApp button missing:** set `VITE_WHATSAPP_NUMBER`, then rebuild/redeploy the frontend. The number must be your real support number in international digits.
- **CORS error:** set backend `CORS_ORIGINS` to the exact deployed frontend origin (scheme + hostname, no trailing path), save, and redeploy/restart the backend.
- **Database connection error:** check database allow-list/network access, hostname, port, schema, username, password, and TLS mode. The database must be reachable from Render.
- **Render deploy fails:** inspect the service logs. The backend Docker build requires the Maven dependencies to be downloadable during build.
