/*
  Warnings:

  - A unique constraint covering the columns `[roomId,startAt]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - Made the column `endAt` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "endAt" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_roomId_startAt_key" ON "Booking"("roomId", "startAt");
