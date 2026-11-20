# Architecture and production readiness

## Scope

Single-service pilot application for HST-operated tablets. Browser UI and JSON API are served by one Node.js process. No third-party runtime packages or trackers are required.

```text
Tablet browser
  ├─ secure HST login
  ├─ dashboard + logs
  └─ LAS / LAU guided survey
          ↓ same-origin JSON API
Node.js HTTP service
  ├─ session + CSRF + validation
  ├─ dashboard aggregation
  ├─ audit events
  └─ atomic data adapter → local JSON volume
```

## Data model

- `users`: HST identity, role, territory, scrypt password hash, active status.
- `surveys`: pseudonymous contact ID, HST owner, audience, timestamps, status and selected answers. No consumer name, phone, email, location or free-text field is collected.
- `audit`: login/logout and survey save events; capped at 500 entries in the pilot adapter.

## Roles

The pilot seeds the `HST` role. Every dashboard query is scoped to the authenticated `userId`. Production extension should add `SUPERVISOR` (aggregated team read) and `ADMIN` (catalog/user management), enforced server-side.

## Security controls implemented

- salted scrypt password hashing and timing-safe verification;
- 256-bit random server-side session token, 8-hour idle renewal;
- HttpOnly + SameSite=Strict cookie; Secure and HSTS in production mode;
- per-session CSRF token for all mutations;
- login throttling: 7 failures per IP/login pair in 10 minutes;
- strict input allowlists, body size limit and output encoding;
- CSP, frame denial, MIME sniff prevention, referrer and permissions policies;
- same-origin assets only; no trackers or third-party scripts;
- atomic file replacement and `0600` data-file mode.

## Production hardening backlog

1. Replace local login with Microsoft Entra ID (OIDC) and conditional access/MFA.
2. Replace JSON adapter with encrypted PostgreSQL; add migrations, backups and tenant-aware retention.
3. Run behind Azure Front Door/Application Gateway or another TLS reverse proxy.
4. Store configuration in Key Vault; rotate secrets and remove demo credentials.
5. Add centralized, immutable audit logging and operational monitoring without consumer PII.
6. Add MDM kiosk mode, device compliance and remote wipe for tablets.
7. Complete Legal/Compliance approval, accessibility testing on target devices and a DPIA before field use.
8. Add catalog CMS/versioning so each survey stores the approved content version.

## Reliability

Writes are serialized and committed via temporary-file rename. The UI preserves an interrupted contact as `abandoned` when HST explicitly exits. For offline-first production use, add an encrypted local queue with idempotency keys and conflict-safe server synchronization.
