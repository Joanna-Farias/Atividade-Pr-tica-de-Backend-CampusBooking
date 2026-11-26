import type { Booking, User } from '@prisma/client';
import type { BookingData } from '../../shared/types.js';
import { prisma } from '../prisma/index.js';

export class BookingRepository {
  async findById(id: number): Promise<Booking | null> {
    return prisma.booking.findUnique({ where: { id } });
  }

  async findUserById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findRoomConflict(
    roomId: number,
    startAt: Date,
    endAt: Date,
    excludeId?: number
  ): Promise<Booking | null> {
    return prisma.booking.findFirst({
      where: {
        roomId,
        ...(excludeId !== undefined && { id: { not: excludeId } }),
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
  }

  async findUserConflict(
    userId: number,
    startAt: Date,
    endAt: Date,
    excludeId?: number
  ): Promise<Booking | null> {
    return prisma.booking.findFirst({
      where: {
        userId,
        ...(excludeId !== undefined && { id: { not: excludeId } }),
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
  }

  async create(data: BookingData): Promise<Booking> {
    return prisma.booking.create({ data });
  }

  async update(id: number, data: Omit<BookingData, 'userId'>): Promise<Booking> {
    return prisma.booking.update({ where: { id }, data });
  }

  async delete(id: number): Promise<void> {
    await prisma.booking.delete({ where: { id } });
  }
}