import type { Booking } from '@prisma/client';
import type { CreateBooking, UpdateBooking } from '../../shared/types.js';
import { BookingRepository } from '../repositories/booking.repository.js';
import { RoomRepository } from '../repositories/room.repository.js';
import { AppError } from '../../shared/errors/AppError.js';

const RECIFE_OFFSET_MS = -3 * 60 * 60 * 1000;
const MAX_DURATION_MS = 2 * 60 * 60 * 1000; // 2 horas

function toRecifeWallClock(date: Date): Date {
  return new Date(date.getTime() + RECIFE_OFFSET_MS);
}

function validateBookingWindow(startAt: Date, endAt: Date): void {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new AppError(400, 'INVALID_DATE', 'Datas inválidas.');
  }

  // Segundos e milissegundos devem ser iguais a zero
  if (
    startAt.getUTCSeconds() !== 0 ||
    startAt.getUTCMilliseconds() !== 0 ||
    endAt.getUTCSeconds() !== 0 ||
    endAt.getUTCMilliseconds() !== 0
  ) {
    throw new AppError(400, 'INVALID_PRECISION', 'Os horários devem ter segundos e milissegundos zerados.');
  }

  const now = new Date();
  if (startAt.getTime() <= now.getTime()) {
    throw new AppError(400, 'PAST_START', 'O início da reserva deve estar no futuro.');
  }

  if (endAt.getTime() <= startAt.getTime()) {
    throw new AppError(400, 'INVALID_INTERVAL', 'O término deve ser posterior ao início.');
  }

  if (endAt.getTime() - startAt.getTime() > MAX_DURATION_MS) {
    throw new AppError(400, 'MAX_DURATION_EXCEEDED', 'A duração máxima da reserva é de 2 horas.');
  }

  // Validação no horário local de Recife (UTC-03): mesmo dia e entre 08:00 e 22:00
  const startLocal = toRecifeWallClock(startAt);
  const endLocal = toRecifeWallClock(endAt);

  const sameLocalDay =
    startLocal.getUTCFullYear() === endLocal.getUTCFullYear() &&
    startLocal.getUTCMonth() === endLocal.getUTCMonth() &&
    startLocal.getUTCDate() === endLocal.getUTCDate();

  if (!sameLocalDay) {
    throw new AppError(400, 'CROSS_DAY_BOOKING', 'A reserva não pode atravessar dias.');
  }

  const startMinutes = startLocal.getUTCHours() * 60 + startLocal.getUTCMinutes();
  const endMinutes = endLocal.getUTCHours() * 60 + endLocal.getUTCMinutes();

  if (startMinutes < 8 * 60 || endMinutes > 22 * 60) {
    throw new AppError(400, 'OUT_OF_HOURS', 'As reservas devem ocorrer entre 08:00 e 22:00 (horário de Recife).');
  }
}

export class BookingService {
  private repo = new BookingRepository();
  private roomRepo = new RoomRepository();

  async create(data: CreateBooking): Promise<Booking> {
    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);

    validateBookingWindow(startAt, endAt);

    const [user, room] = await Promise.all([
      this.repo.findUserById(data.userId),
      this.roomRepo.findById(data.roomId),
    ]);

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'Usuário não encontrado.');
    }
    if (!room) {
      throw new AppError(404, 'NOT_FOUND', 'Sala não encontrada.');
    }
    if (!room.active) {
      throw new AppError(409, 'ROOM_INACTIVE', 'A sala selecionada está inativa.');
    }

    const [roomConflict, userConflict] = await Promise.all([
      this.repo.findRoomConflict(data.roomId, startAt, endAt),
      this.repo.findUserConflict(data.userId, startAt, endAt),
    ]);

    if (roomConflict) {
      throw new AppError(409, 'ROOM_CONFLICT', 'Já existe uma reserva para esta sala no horário informado.');
    }
    if (userConflict) {
      throw new AppError(409, 'USER_CONFLICT', 'O usuário já possui uma reserva sobreposta neste horário.');
    }

    return this.repo.create({
      userId: data.userId,
      roomId: data.roomId,
      startAt,
      endAt,
      purpose: data.purpose,
    });
  }

  async update(id: number, data: UpdateBooking): Promise<Booking> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Reserva não encontrada.');
    }

    if (existing.startAt.getTime() <= Date.now()) {
      throw new AppError(409, 'BOOKING_ALREADY_STARTED', 'Não é possível alterar uma reserva já iniciada.');
    }

    const roomId = data.roomId ?? existing.roomId;
    const startAt = data.startAt ? new Date(data.startAt) : existing.startAt;
    const endAt = data.endAt ? new Date(data.endAt) : existing.endAt;
    const purpose = data.purpose ?? existing.purpose;

    validateBookingWindow(startAt, endAt);

    const room = await this.roomRepo.findById(roomId);
    if (!room) {
      throw new AppError(404, 'NOT_FOUND', 'Sala não encontrada.');
    }
    if (!room.active) {
      throw new AppError(409, 'ROOM_INACTIVE', 'A sala selecionada está inativa.');
    }

    const [roomConflict, userConflict] = await Promise.all([
      this.repo.findRoomConflict(roomId, startAt, endAt, id),
      this.repo.findUserConflict(existing.userId, startAt, endAt, id),
    ]);

    if (roomConflict) {
      throw new AppError(409, 'ROOM_CONFLICT', 'Já existe uma reserva para esta sala no horário informado.');
    }
    if (userConflict) {
      throw new AppError(409, 'USER_CONFLICT', 'O usuário já possui uma reserva sobreposta neste horário.');
    }

    return this.repo.update(id, {
      roomId,
      startAt,
      endAt,
      purpose,
    });
  }

  async delete(id: number): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Reserva não encontrada.');
    }

    if (existing.startAt.getTime() <= Date.now()) {
      throw new AppError(409, 'BOOKING_ALREADY_STARTED', 'Não é possível cancelar uma reserva já iniciada.');
    }

    await this.repo.delete(id);
  }
}