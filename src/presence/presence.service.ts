import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceService {
  /** socketId → userId */
  private readonly sockets = new Map<string, number>();

  addSocket(socketId: string, userId: number) {
    this.sockets.set(socketId, userId);
  }

  removeSocket(socketId: string) {
    this.sockets.delete(socketId);
  }

  isOnline(userId: number): boolean {
    for (const uid of this.sockets.values()) {
      if (uid === userId) return true;
    }
    return false;
  }

  onlineUserIds(): Set<number> {
    return new Set(this.sockets.values());
  }
}
