-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "color" SET DEFAULT '#0071E3';
