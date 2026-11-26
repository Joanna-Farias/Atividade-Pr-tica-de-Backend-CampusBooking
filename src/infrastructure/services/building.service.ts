import type { Usage } from '../../shared/types.js';
import { BuildingRepository } from '../repositories/building.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

const DAILY_OPERATIONAL_MINUTES = 840; // 08h às 22h (14h)

export class BuildingService {
  private repo = new BuildingRepository();

  async usage(buildingId: number, date: string): Promise<Usage> {
    const building = await this.repo.findById(buildingId);
    if (!building) {
      throw new AppError(404, 'NOT_FOUND', 'Prédio não encontrado.');
    }

    // Janela operacional do dia solicitado no fuso de Recife (UTC-03)
    const windowStart = new Date(`${date}T08:00:00.000-03:00`);
    const windowEnd = new Date(`${date}T22:00:00.000-03:00`);

    const rooms = await this.repo.roomsWithBookings(buildingId, windowStart, windowEnd);

    let totalBookings = 0;
    let totalBookedMinutes = 0;

    const roomUsages = rooms.map((room) => {
      let bookedMinutes = 0;

      for (const booking of room.bookings) {
        const effectiveStart = Math.max(booking.startAt.getTime(), windowStart.getTime());
        const effectiveEnd = Math.min(booking.endAt.getTime(), windowEnd.getTime());
        if (effectiveEnd > effectiveStart) {
          bookedMinutes += Math.round((effectiveEnd - effectiveStart) / 60000);
        }
      }

      const bookingsCount = room.bookings.length;
      const availableMinutes = Math.max(0, DAILY_OPERATIONAL_MINUTES - bookedMinutes);
      const usagePercentage = Number(((bookedMinutes / DAILY_OPERATIONAL_MINUTES) * 100).toFixed(2));

      totalBookings += bookingsCount;
      totalBookedMinutes += bookedMinutes;

      return {
        roomId: room.id,
        name: room.name,
        bookings: bookingsCount,
        bookedMinutes,
        availableMinutes,
        usagePercentage,
      };
    });

    // Ordenação: usagePercentage decrescente, empate por id crescente
    roomUsages.sort((a, b) => {
      if (b.usagePercentage !== a.usagePercentage) {
        return b.usagePercentage - a.usagePercentage;
      }
      return a.roomId - b.roomId;
    });

    const totalRooms = rooms.length;
    const totalAvailableMinutes = totalRooms * DAILY_OPERATIONAL_MINUTES;
    const overallUsagePercentage =
      totalAvailableMinutes > 0
        ? Number(((totalBookedMinutes / totalAvailableMinutes) * 100).toFixed(2))
        : 0;

    return {
      buildingId: building.id,
      buildingName: building.name,
      date,
      totalRooms,
      totalBookings,
      totalAvailableMinutes,
      totalBookedMinutes,
      overallUsagePercentage,
      rooms: roomUsages,
    };
  }
}