-- Initial TrustLedger off-chain schema.
-- Matches prisma/schema.prisma. Apply with `npm run db:migrate` (prisma migrate
-- deploy). If you prefer Prisma to author the baseline for you, delete this
-- folder and run `npm run db:migrate:dev -- --name init` against a live database.

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUBMITTED', 'APPROVED', 'DISPUTED', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'COMMITTING', 'REVEALING', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VoteChoice" AS ENUM ('CLIENT', 'FREELANCER', 'ABSTAIN');

-- CreateTable
CREATE TABLE "contract_metadata" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "onChainId" BIGINT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "clientAddress" TEXT NOT NULL,
    "freelancerAddress" TEXT,
    "tokenSymbol" TEXT NOT NULL DEFAULT 'ETH',
    "amount" DECIMAL(78,0) NOT NULL,
    "holdBackBps" INTEGER NOT NULL DEFAULT 0,
    "status" "ContractStatus" NOT NULL DEFAULT 'PENDING',
    "ipfsCid" TEXT,
    "metadataVersion" TEXT NOT NULL DEFAULT '1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "onChainDisputeId" BIGINT NOT NULL,
    "contractMetadataId" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "evidenceCid" TEXT,
    "outcome" "VoteChoice",
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jurors" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "stakeAmount" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "casesVoted" INTEGER NOT NULL DEFAULT 0,
    "casesWon" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jurors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "juror_votes" (
    "id" TEXT NOT NULL,
    "jurorId" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "commitHash" TEXT,
    "revealedVote" "VoteChoice",
    "rewardAmount" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "committedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revealedAt" TIMESTAMP(3),

    CONSTRAINT "juror_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_aggregates" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "chainId" INTEGER NOT NULL DEFAULT 0,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_metadata_clientAddress_idx" ON "contract_metadata"("clientAddress");
CREATE INDEX "contract_metadata_freelancerAddress_idx" ON "contract_metadata"("freelancerAddress");
CREATE INDEX "contract_metadata_status_idx" ON "contract_metadata"("status");
CREATE UNIQUE INDEX "contract_metadata_chainId_contractAddress_onChainId_key" ON "contract_metadata"("chainId", "contractAddress", "onChainId");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");
CREATE UNIQUE INDEX "disputes_chainId_onChainDisputeId_key" ON "disputes"("chainId", "onChainDisputeId");

-- CreateIndex
CREATE INDEX "jurors_reputationScore_idx" ON "jurors"("reputationScore");
CREATE UNIQUE INDEX "jurors_chainId_walletAddress_key" ON "jurors"("chainId", "walletAddress");

-- CreateIndex
CREATE INDEX "juror_votes_disputeId_idx" ON "juror_votes"("disputeId");
CREATE UNIQUE INDEX "juror_votes_jurorId_disputeId_key" ON "juror_votes"("jurorId", "disputeId");

-- CreateIndex
CREATE INDEX "analytics_aggregates_day_idx" ON "analytics_aggregates"("day");
CREATE UNIQUE INDEX "analytics_aggregates_eventType_day_chainId_key" ON "analytics_aggregates"("eventType", "day", "chainId");

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_contractMetadataId_fkey" FOREIGN KEY ("contractMetadataId") REFERENCES "contract_metadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "juror_votes" ADD CONSTRAINT "juror_votes_jurorId_fkey" FOREIGN KEY ("jurorId") REFERENCES "jurors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "juror_votes" ADD CONSTRAINT "juror_votes_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
