# Kubernetes

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

TrustLedger includes a Kubernetes base for running the production Next.js
frontend alongside the Docker image in `docker/Dockerfile.frontend`.

## Files

| File                      | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `k8s/namespace.yaml`      | Dedicated `trustledger` namespace.                                      |
| `k8s/configmap.yaml`      | Non-secret frontend runtime defaults.                                   |
| `k8s/secret.example.yaml` | Copyable template for cluster-local secrets. Not applied by Kustomize.  |
| `k8s/deployment.yaml`     | Rolling frontend deployment with probes, resources, and security flags. |
| `k8s/service.yaml`        | Internal `ClusterIP` service for port `3000`.                           |
| `k8s/ingress.yaml`        | Optional ingress route. Set the host before public use.                 |
| `k8s/hpa.yaml`            | CPU and memory horizontal autoscaling policy.                           |
| `k8s/networkpolicy.yaml`  | Ingress policy for frontend HTTP traffic.                               |
| `k8s/kustomization.yaml`  | Reproducible base that ties the manifests together.                     |

## Build Image

Build the same standalone frontend image used by Kubernetes:

```bash
docker build -f docker/Dockerfile.frontend \
  --build-arg NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" \
  -t ghcr.io/kevinle3212/trustledger-frontend:main .
```

For a local `kind` cluster, load the image:

```bash
kind load docker-image ghcr.io/kevinle3212/trustledger-frontend:main
```

For a remote cluster, push the image to the registry configured in
`k8s/kustomization.yaml`.

## Configure

Use an overlay, Helm values, or deployment automation to set non-secret public
values such as chain addresses, deploy blocks, app URLs, repository URL, and
`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. The committed `k8s/configmap.yaml` keeps
environment-specific values blank so the base is reusable. Public
`NEXT_PUBLIC_*` values are safe to expose because they are compiled or served to
browsers; do not put bearer tokens or API keys there.

Create secrets from shell environment without committing real values:

```bash
export HEALTH_CHECK_TOKEN="$(openssl rand -hex 32)"
export CRON_SECRET="$(openssl rand -hex 32)"
export NOTIFICATIONS_SECRET="$(openssl rand -hex 32)"
export MAGIC_LINK_SECRET="$(openssl rand -hex 32)"
export SEPOLIA_RPC_URL="https://..."
npm run k8s:secret:generate
kubectl apply -f k8s/secret.yaml
```

`k8s/secret.yaml` is ignored by git. Create it from the example template only
when you need manual editing:

```bash
cp k8s/secret.example.yaml /tmp/trustledger-secret.yaml
$EDITOR /tmp/trustledger-secret.yaml
kubectl apply -f /tmp/trustledger-secret.yaml
```

Or create the secret directly:

```bash
kubectl -n trustledger create secret generic trustledger-frontend-secrets \
  --from-literal=HEALTH_CHECK_TOKEN="$HEALTH_CHECK_TOKEN" \
  --from-literal=CRON_SECRET="$CRON_SECRET" \
  --from-literal=NOTIFICATIONS_SECRET="$NOTIFICATIONS_SECRET" \
  --from-literal=MAGIC_LINK_SECRET="$MAGIC_LINK_SECRET" \
  --from-literal=SEPOLIA_RPC_URL="$SEPOLIA_RPC_URL" \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Preview And Apply

Render the exact manifests before applying:

```bash
npm run lint:k8s
kubectl kustomize k8s
```

Apply the base:

```bash
kubectl apply -k k8s
```

Update the deployed image tag reproducibly:

```bash
kubectl -n trustledger set image \
  deployment/trustledger-frontend \
  frontend=ghcr.io/kevinle3212/trustledger-frontend:<tag>
```

Verify rollout and health:

```bash
kubectl -n trustledger rollout status deployment/trustledger-frontend
kubectl -n trustledger get pods,svc,ingress,hpa
kubectl -n trustledger port-forward service/trustledger-frontend 3000:80
```

Then open <http://127.0.0.1:3000/api/health/runtime>.

Kubernetes probes use `/api/health/runtime` so pods become ready when the
Next.js server is accepting requests. The full `/api/health` endpoint remains
admin-gated with `HEALTH_CHECK_TOKEN`, `ADMIN_API_TOKEN`, or
`HEALTH_CHECK_ALLOWED_IPS`; it returns deployment configuration status for RPC,
notification, cron, oracle, and app URL checks.

## Rust Admin API

The optional Rust companion service has its own base in `infra/rust-admin-api`.
It is not part of the frontend Kustomize base so operators can deploy it only
when they need the extra backend surface.

```bash
kubectl create secret generic trustledger-admin-api \
  --from-literal=token="$(openssl rand -hex 32)"
kubectl apply -k infra/rust-admin-api
kubectl port-forward service/trustledger-admin-api 4100:4100
```

Probe it locally:

```bash
curl http://127.0.0.1:4100/health
curl -H "Authorization: Bearer $TRUSTLEDGER_ADMIN_API_TOKEN" \
  http://127.0.0.1:4100/admin/summary
```

## Reproducibility Notes

- The container uses Node `22.22.3` by default and can be rebuilt with
  `--build-arg NODE_VERSION=<version>` for controlled upgrades.
- The image runs `npm run vercel-build`, matching Vercel's build command.
- Next.js standalone output keeps the runtime image limited to traced server
  files and static assets.
- `src/next.config.ts` enables standalone output only outside Vercel. Vercel
  still uses the same source and build script, but its builder owns serverless
  packaging and does not consume the container runtime layout.
- `k8s/secret.example.yaml` is intentionally excluded from
  `k8s/kustomization.yaml` so placeholder secrets are never applied by default.
- Use Kustomize overlays outside the base for production-specific hostnames,
  image tags, resource sizes, and ingress class settings.
