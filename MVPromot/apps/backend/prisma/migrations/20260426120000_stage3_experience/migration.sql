-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'WECHAT');

-- CreateEnum
CREATE TYPE "DataDeletionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED', 'FAILED');

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailSnapshot" TEXT NOT NULL,
    "reason" TEXT,
    "status" "DataDeletionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executeAfter" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_provider_idx" ON "OAuthAccount"("userId", "provider");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_status_executeAfter_idx" ON "DataDeletionRequest"("status", "executeAfter");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_userId_requestedAt_idx" ON "DataDeletionRequest"("userId", "requestedAt");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Analysis_userId_fileId_status_updatedAt_idx" ON "Analysis"("userId", "fileId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Frame_analysisId_timestamp_idx" ON "Frame"("analysisId", "timestamp");

-- CreateIndex
CREATE INDEX "UploadedFile_id_userId_idx" ON "UploadedFile"("id", "userId");

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
