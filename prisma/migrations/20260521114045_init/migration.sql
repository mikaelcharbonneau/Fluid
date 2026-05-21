-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "difference" TEXT,
    "competitors" TEXT[],
    "styleDirection" TEXT,
    "strategy" JSONB NOT NULL,
    "selectedName" TEXT,
    "selectedStyle" TEXT,
    "selectedLogo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Brand_userId_idx" ON "Brand"("userId");
