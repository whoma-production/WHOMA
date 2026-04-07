-- CreateTable
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "actorRole" "UserRole",
    "actorId" TEXT,
    "subjectUserId" TEXT,
    "source" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportInquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "pagePath" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductEvent_eventName_createdAt_idx" ON "ProductEvent"("eventName", "createdAt");

-- CreateIndex
CREATE INDEX "ProductEvent_subjectUserId_eventName_createdAt_idx" ON "ProductEvent"("subjectUserId", "eventName", "createdAt");

-- CreateIndex
CREATE INDEX "ProductEvent_actorId_eventName_createdAt_idx" ON "ProductEvent"("actorId", "eventName", "createdAt");

-- CreateIndex
CREATE INDEX "SupportInquiry_status_createdAt_idx" ON "SupportInquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportInquiry_category_createdAt_idx" ON "SupportInquiry"("category", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
