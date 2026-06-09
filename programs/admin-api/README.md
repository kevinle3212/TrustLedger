# trustledger-admin-api

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

Read-only Rust companion API for TrustLedger operator tooling.

## Routes

- `GET /health` returns secret-free health and configuration readiness.
- `GET /admin/summary` returns a read-only admin summary and requires
  `Authorization: Bearer <TRUSTLEDGER_ADMIN_API_TOKEN>`.
- `GET /audit/preview` returns a redacted audit event showing whether the
  request was authorized.

## Environment

- `TRUSTLEDGER_ADMIN_API_BIND`: bind address, default `127.0.0.1:4100`.
- `TRUSTLEDGER_ADMIN_API_TOKEN`: bearer token for restricted routes.
- `TRUSTLEDGER_ENV`: optional environment label, default `local`.

## Run

```bash
TRUSTLEDGER_ADMIN_API_TOKEN="$(openssl rand -hex 32)" \
  cargo run -p trustledger-admin-api
```
