import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PresenceService {
  /** socketId → userId */
  private readonly sockets = new Map<string, number>();
  /** userId → last disconnect time (in-memory cache) */
  private readonly lastSeen = new Map<number, Date>();

  constructor(private readonly prisma: PrismaService) {}

  addSocket(socketId: string, userId: number) {
    this.sockets.set(socketId, userId);
  }

  removeSocket(socketId: string) {
    const userId = this.sockets.get(socketId);
    if (userId !== undefined) {
      this.sockets.delete(socketId);
      // Only record lastSeen if no other socket for this user remains
      if (!this.isOnline(userId)) {
        const now = new Date();
        this.lastSeen.set(userId, now);
        // Persist to DB (fire-and-forget)
        this.prisma.user
          .update({ where: { id: userId }, data: { lastSeenAt: now } })
          .catch(() => {});
      }
    } else {
      this.sockets.delete(socketId);
    }
  }

  isOnline(userId: number): boolean {
    for (const uid of this.sockets.values()) {
      if (uid === userId) return true;
    }
    return false;
  }

  /**
   * Returns 'online', formatted time like '4h 5m', or null (never seen).
   * @param dbLastSeen - fallback from DB when no in-memory data
   */
  formatPresence(userId: number, dbLastSeen?: Date | null): string | null {
    if (this.isOnline(userId)) return 'online';
    const lastSeen = this.lastSeen.get(userId) ?? dbLastSeen ?? null;
    if (!lastSeen) return null;
    return PresenceService.formatDuration(lastSeen);
  }

  static formatDuration(date: Date): string {
    const totalMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (totalMinutes < 1) return '< 1m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  onlineUserIds(): Set<number> {
    return new Set(this.sockets.values());
  }
}
