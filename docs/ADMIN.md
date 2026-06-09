# Admin Dashboard

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

The admin dashboard is a restricted, read-only operator surface at `/en/admin`.
It summarizes operational health, contract and dispute lookup paths, juror and
reputation readiness, notification delivery, oracle freshness, dependency and
security reporting, deployment metadata, feature flags, rate limits, and audit
trail readiness.

## Access Model

The first version is intentionally read-only. Mutating admin actions must add
explicit confirmation, server-side authorization, persistent audit logs, and
tests before they are enabled.

Access can be restricted with:

- `ADMIN_SESSION_SECRET` for signed HTTP-only sessions.
- `ADMIN_API_TOKEN` for transition-era bearer access to `/api/admin/summary`.
- `ADMIN_ALLOWED_IPS` to allow only trusted operator networks.
- `ADMIN_WALLET_ADDRESSES` to bind admin accounts to allowlisted wallets.
- `ADMIN_BOOTSTRAP_*` or `ADMIN_ACCOUNTS_JSON` for hashed admin accounts.

Do not commit plaintext admin passwords. Generate the bootstrap owner hash with:

```bash
ADMIN_BOOTSTRAP_PASSWORD='replace-with-a-long-password' npm run admin:bootstrap
```

Set the emitted `ADMIN_BOOTSTRAP_PASSWORD_HASH` in `.env`, Vercel, or your
secret manager. The default bootstrap identity is:

- Email: `kevinle3212@gmail.com`
- Username: `kevinle`
- Non-deletable: yes

## Rust Admin API

The Rust companion service scaffold lives in:

- `.cargo/config.toml`
- `Cargo.toml`
- `lib/trustledger-core`
- `programs/admin-api`
- `infra/rust-admin-api`

Run strict Rust checks with:

```bash
npm run rust:build
npm run rust:fmt
npm run rust:clippy
npm run rust:test
```

The service exposes:

- `GET /health` for secret-free health and config readiness.
- `GET /admin/summary` for a token-protected read-only service summary.
- `GET /audit/preview` for a redacted audit event preview.

It binds to `127.0.0.1:4100` by default. Kubernetes and Docker examples are in
`infra/rust-admin-api/`.

Local run:

```bash
npm run env:sync
cargo run -p trustledger-admin-api
```

Docker run:

```bash
docker compose -f infra/rust-admin-api/docker-compose.yaml up
```

Kubernetes run:

```bash
kubectl create secret generic trustledger-admin-api \
  --from-literal=token="$(openssl rand -hex 32)"
kubectl apply -k infra/rust-admin-api
```

`TRUSTLEDGER_ADMIN_API_TOKEN` is required for protected Rust routes. Do not
place the raw token in Dockerfiles, committed Kubernetes manifests, docs, or
tests.

Root `npm run build` compiles this Rust workspace because the admin API is a
committed runtime surface. `npm run env:sync` and `npm run env:sync:vercel` are
manual commands by design: they mutate ignored local env files or remote Vercel
settings and must not run as side effects of build.
