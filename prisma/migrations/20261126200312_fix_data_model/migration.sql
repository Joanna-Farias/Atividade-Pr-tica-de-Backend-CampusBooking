/*
  Warnings:

  - Made the column `endAt` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Booking_userId_startAt_idx";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "endAt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Booking_roomId_startAt_endAt_idx" ON "Booking"("roomId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
