/*
  Warnings:

  - You are about to drop the column `content` on the `Theme` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Theme" DROP COLUMN "content",
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sections" JSONB NOT NULL DEFAULT '[]';
