-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('CAROUSEL', 'REEL', 'STATIC_IMAGE', 'VIDEO', 'STORY', 'THREAD', 'LONG_FORM');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "category" TEXT,
ADD COLUMN     "contentType" "ContentType",
ADD COLUMN     "hashtags" TEXT[];
