# Kubernetes

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
  -t ghcr.io/kevinle3212/trustledger-frontend:main .
```

For a local `kind` cluster, load the image:

```bash
kind load docker-image ghcr.io/kevinle3212/trustledger-frontend:main
```

For a remote cluster, push the image to the registry configured in
`k8s/kustomization.yaml`.

## Configure

Edit `k8s/configmap.yaml` for non-secret public values such as chain addresses
or deploy blocks. Public `NEXT_PUBLIC_*` values are safe to expose because they
are compiled or served to browsers.

Create secrets from the example template without committing real values:

```bash
cp k8s/secret.example.yaml /tmp/trustledger-secret.yaml
$EDITOR /tmp/trustledger-secret.yaml
kubectl apply -f /tmp/trustledger-secret.yaml
```

Or create the secret directly:

```bash
kubectl -n trustledger create secret generic trustledger-frontend-secrets \
  --from-literal=NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" \
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

Then open <http://127.0.0.1:3000/api/health>.

Kubernetes probes use `/api/health/runtime` so pods become ready when the
Next.js server is accepting requests. The full `/api/health` endpoint remains
strict and returns deployment configuration status for RPC, notification, cron,
oracle, and app URL checks.

## Reproducibility Notes

- The container uses Node `22.22.3` by default and can be rebuilt with
  `--build-arg NODE_VERSION=<version>` for controlled upgrades.
- The image runs `npm run vercel-build`, matching Vercel's build command.
- Next.js standalone output keeps the runtime image limited to traced server
  files and static assets.
- `k8s/secret.example.yaml` is intentionally excluded from
  `k8s/kustomization.yaml` so placeholder secrets are never applied by default.
- Use Kustomize overlays outside the base for production-specific hostnames,
  image tags, resource sizes, and ingress class settings.
