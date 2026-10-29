/**
 * Lightweight Offline Queue Service for operational mutations:
 * - Daily Reports
 * - Vendor Onboarding
 * - Tasks / Status Updates
 */

export type OfflineActionType =
  | 'SUBMIT_DAILY_REPORT'
  | 'ONBOARD_VENDOR'
  | 'UPDATE_TASK_STATUS';

export interface OfflineQueueItem<T = any> {
  id: string;
  actionType: OfflineActionType;
  payload: T;
  createdAt: string;
  retryCount: number;
}

export interface IOfflineQueueService {
  isOnline: boolean;
  setOnlineStatus(online: boolean): void;
  enqueue<T>(actionType: OfflineActionType, payload: T): Promise<OfflineQueueItem<T>>;
  getPendingItems(): Promise<OfflineQueueItem[]>;
  clearItem(id: string): Promise<void>;
  syncAll(processor: (item: OfflineQueueItem) => Promise<boolean>): Promise<{ synced: number; failed: number }>;
}

export class OfflineQueueService implements IOfflineQueueService {
  private inMemoryQueue: OfflineQueueItem[] = [];
  public isOnline: boolean = true;

  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }

  async enqueue<T>(actionType: OfflineActionType, payload: T): Promise<OfflineQueueItem<T>> {
    const item: OfflineQueueItem<T> = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actionType,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.inMemoryQueue.push(item);
    return item;
  }

  async getPendingItems(): Promise<OfflineQueueItem[]> {
    return [...this.inMemoryQueue];
  }

  async clearItem(id: string): Promise<void> {
    this.inMemoryQueue = this.inMemoryQueue.filter(item => item.id !== id);
  }

  async syncAll(
    processor: (item: OfflineQueueItem) => Promise<boolean>
  ): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline || this.inMemoryQueue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;
    const remaining: OfflineQueueItem[] = [];

    for (const item of this.inMemoryQueue) {
      try {
        const success = await processor(item);
        if (success) {
          synced++;
        } else {
          item.retryCount++;
          remaining.push(item);
          failed++;
        }
      } catch {
        item.retryCount++;
        remaining.push(item);
        failed++;
      }
    }

    this.inMemoryQueue = remaining;
    return { synced, failed };
  }
}

export const offlineQueueService = new OfflineQueueService();
