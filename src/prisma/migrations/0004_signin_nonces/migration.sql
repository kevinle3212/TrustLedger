-- Persisted sign-in challenge nonces so the SIWE challenge/session flow works
-- across serverless instances. Matches prisma/schema.prisma (model SignInNonce).
-- Apply with `npm run db:migrate` (prisma migrate deploy).

-- CreateTable
CREATE TABLE "signin_nonces" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signin_nonces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signin_nonces_walletAddress_key" ON "signin_nonces"("walletAddress");
