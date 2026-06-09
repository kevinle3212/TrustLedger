# ──────────────────────────────────────────────────────────────────────────────
# TrustLedger - demo and local-development image
#
# Bundles Node.js 22 + Foundry (forge, cast, anvil), installs root and frontend
# dependencies, and pre-compiles contracts so the container is ready to run
# demos or tests the moment it starts.
#
# Usage - via docker-compose.yml at the project root:
#   docker compose up demo-good   # happy path demo
#   docker compose up demo-bad    # dispute-flow demo
#   docker compose up node        # node only (connect MetaMask / Remix)
#   docker compose run test       # Hardhat + Foundry test suite
#   docker compose run frontend-test # frontend unit/e2e test commands
#
# Build and run directly:
#   docker build -t trustledger .
#   docker run -e DEMO=good -p 8545:8545 trustledger
# ──────────────────────────────────────────────────────────────────────────────

ARG FOUNDRY_TAG=v1.5.1
ARG NODE_VERSION=22

# Stage 1: grab the official Foundry binaries
FROM ghcr.io/foundry-rs/foundry:${FOUNDRY_TAG} AS foundry-bin

# Stage 2: final image
FROM node:${NODE_VERSION}-bookworm-slim AS trustledger

# Copy Foundry binaries from the official image (avoids the foundryup shell script)
COPY --from=foundry-bin /usr/local/bin/forge /usr/local/bin/forge
COPY --from=foundry-bin /usr/local/bin/cast  /usr/local/bin/cast
COPY --from=foundry-bin /usr/local/bin/anvil /usr/local/bin/anvil

# git: submodule init; curl: health check; ca-certificates: forge TLS (compiler download)
# python3/make/g++: native npm dependencies built by node-gyp on slim images
RUN apt-get update \
    && apt-get install -y --no-install-recommends bash git curl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install Node dependencies (separate layer - cached unless package files change)
COPY package.json package-lock.json ./
RUN npm ci

COPY src/package.json src/package-lock.json ./src/
RUN cd src && npm ci

# ── Copy source
COPY . .

# Initialize git submodules if .git is present; silently skip if not
# (contracts/lib/forge-std and contracts/lib/openzeppelin-contracts)
RUN git submodule update --init --recursive 2>/dev/null || true

# ── Pre-compile everything at build time so the container starts instantly
RUN npm run compile \
    && cd contracts && forge build

EXPOSE 8545

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=12 \
    CMD cast block-number --rpc-url http://127.0.0.1:8545 >/dev/null 2>&1 || exit 1

# Drop to the built-in non-root user so the container does not run as root.
USER node

ENTRYPOINT ["bash", "scripts/docker-demo.sh"]
