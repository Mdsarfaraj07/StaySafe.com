# StaySafe email OTP, password reset, booking email, and session configuration

## Implemented in this project

- Registration creates an account with `emailVerified=false` and sends a one-time code to the registered email.
- Registration is completed only after the email OTP is verified.
- Login validates email/password, sends an OTP, and issues the JWT only after OTP verification.
- Forgot password sends a reset OTP (the API response is generic to reduce account enumeration).
- Password reset consumes a valid OTP and stores the new password using BCrypt.
- OTP challenges are stored as BCrypt hashes, expire after 10 minutes, are single-use, and lock after five failed attempts.
- OTP resend is supported for eligible registered accounts.
- A booking confirmation email is sent after a payment is confirmed and the booking is persisted. Email delivery failure is logged and does not undo a paid booking.
- JWT sessions persist in the existing browser localStorage across refreshes and expire after seven days by default.

## SMTP setup (required for real email)

Do not expect OTPs or booking confirmation emails to arrive until SMTP is configured. The project intentionally does not expose OTPs in API responses or console logs.

Set these environment variables in the backend process:

### Gmail example

1. Enable 2-Step Verification on the mailbox that sends StaySafe emails.
2. Create an App Password for that mailbox (do not use your normal Gmail password).
3. Set the variables below. Use your own sender mailbox.

```powershell
$env:MAIL_HOST="smtp.gmail.com"
$env:MAIL_PORT="587"
$env:MAIL_USERNAME="your-sender@gmail.com"
$env:MAIL_PASSWORD="your-16-character-app-password"
$env:MAIL_SMTP_AUTH="true"
$env:MAIL_SMTP_STARTTLS="true"
$env:MAIL_ENABLED="true"
$env:JWT_SECRET="replace-with-a-random-secret-of-at-least-32-characters"
$env:JWT_EXPIRATION_MS="604800000"
```

Then start the backend from `staysafe-fullstack/backend`:

```powershell
mvn spring-boot:run
```

For production, use a transactional email provider/domain with SPF, DKIM and DMARC configured. Store secrets in your deployment secret manager, not in source control, `.env` files committed to Git, or frontend variables.

## API flow

- `POST /api/auth/register` `{name,email,password,phone,role}` -> `{challengeId,email,message}`
- `POST /api/auth/register/verify` `{challengeId,otp}` -> `{token,user}`
- `POST /api/auth/login` `{email,password}` -> `{challengeId,email,message}`
- `POST /api/auth/login/verify` `{challengeId,otp}` -> `{token,user}`
- `POST /api/auth/password/forgot` `{email}` -> generic challenge response
- `POST /api/auth/password/reset` `{challengeId,otp,newPassword}` -> success message
- `POST /api/auth/otp/resend` `{challengeId}` -> new challenge response
- Booking confirmation is sent server-side after a confirmed booking is finalized by checkout verification or a Razorpay webhook.

## Session behavior

The frontend already persists the JWT and user in localStorage; the default JWT lifetime is now seven days. This survives page reloads but is not a server-side HTTP session or refresh-token system. For a production system, prefer Secure, HttpOnly, SameSite cookies or a carefully designed refresh-token rotation/revocation mechanism, and assess CSRF/XSS risks. JWTs are stateless, but a per-user token version is checked on each request; password reset increments it and revokes previously issued tokens.

## Production requirements / limitations

- Configure per-IP and per-account rate limits for login, OTP issue/resend, and password reset. Add abuse monitoring and CAPTCHA/risk checks where appropriate.
- Add integration tests for expired, replayed, invalid, and brute-forced OTPs.
- Configure database migrations for the new `users.email_verified` and `email_otp_challenges` schema; Hibernate `ddl-auto=update` is currently used by this starter project.
- Existing accounts are intended to remain verified because the new column defaults to true. Check the actual migration result before deploying to a populated database.
- Mail is sent synchronously in this starter implementation. For high volume, use a transactional outbox/queue and retry policy.
- This code has not been compiled in this environment because Maven is not installed. Run `mvn test` and `npm run build` locally before deployment.
