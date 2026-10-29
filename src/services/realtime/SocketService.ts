/**
 * Authoritative Realtime Synchronization Service for Manager Mobile App
 * Direct Native WebSocket connection with high-performance HTTP event polling fallback
 * Fully synchronized with Manager Website and Shared Backend Event Bus
 */
import { ENV } from '../../constants/env';

export type SocketEventType =
  | 'vendor.updated'
  | 'vendor.location.updated'
  | 'task.created'
  | 'task.assigned'
  | 'task.updated'
  | 'task.status.updated'
  | 'issue.created'
  | 'issue.updated'
  | 'issue.status.updated'
  | 'issue.escalated'
  | 'issue.resolved'
  | 'connection.status';

export interface RealtimeEventPayload<T = any> {
  type: SocketEventType;
  entityId: string;
  scope?: {
    stateId?: string;
    districtId?: string;
    divisionId?: string;
    pincodeId?: string;
  };
  data?: T;
  changedFields?: string[];
  timestamp?: string;
}

export type SocketEventHandler<T = any> = (payload: RealtimeEventPayload<T>) => void;
export type ConnectionStatusHandler = (isConnected: boolean) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private currentToken: string | null = null;
  private isExplicitlyClosed: boolean = false;
  private isConnectedState: boolean = false;
  private listeners: Map<string, Set<SocketEventHandler>> = new Map();
  private connectionStatusListeners: Set<ConnectionStatusHandler> = new Set();
  private reconnectSubscribers: Set<() => void> = new Set();

  // Polling fallback
  private isPolling: boolean = false;
  private pollTimer: any = null;
  private lastPollTimestamp: number = 0;
  private pingTimer: any = null;
  private reconnectTimer: any = null;

  private getWsUrl(token: string): string {
    const apiBase = ENV.apiBaseUrl;
    // Derive host from apiBase (e.g. http://3.110.88.42:8005/api -> 3.110.88.42:8005)
    let host = '3.110.88.42:8005';
    try {
      const match = apiBase.match(/https?:\/\/([^\/]+)/);
      if (match && match[1]) {
        host = match[1];
      }
    } catch {}

    const isSecure = apiBase.startsWith('https://');
    const protocol = isSecure ? 'wss://' : 'ws://';
    return `${protocol}${host}/ws?token=${token}`;
  }

  connect(token: string, scope?: Record<string, any>) {
    if (!token) return;
    if (this.currentToken === token && this.isConnectedState && !this.isExplicitlyClosed) {
      return;
    }

    this.disconnect();
    this.currentToken = token;
    this.isExplicitlyClosed = false;

    const wsUrl = this.getWsUrl(token);
    console.log(`[SocketService] Connecting to Native WebSocket: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[SocketService] WebSocket connection established.');
        this.stopPollingFallback();
        this.isConnectedState = true;
        this.notifyConnectionStatus(true);
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handleIncomingEvent(payload);
        } catch (e) {
          console.warn('[SocketService] Error parsing incoming WS frame:', e);
        }
      };

      this.ws.onerror = (e) => {
        console.log('[SocketService] WebSocket encountered error, switching to event polling fallback.');
        this.startPollingFallback(token);
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.isConnectedState = false;
        this.notifyConnectionStatus(false);
        if (!this.isExplicitlyClosed) {
          this.startPollingFallback(token);
          this.scheduleReconnect(token);
        }
      };
    } catch (err) {
      console.warn('[SocketService] WebSocket initialization failed:', err);
      this.startPollingFallback(token);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch {}
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(token: string) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isExplicitlyClosed && token === this.currentToken) {
        console.log('[SocketService] Attempting to reconnect persistent WebSocket...');
        this.connect(token);
      }
    }, 10000);
  }

  private startPollingFallback(token: string) {
    if (this.isPolling) return;
    this.isPolling = true;
    if (this.lastPollTimestamp === 0) {
      this.lastPollTimestamp = Date.now() - 5000;
    }

    const poll = async () => {
      if (!this.isPolling || this.isExplicitlyClosed || !this.currentToken) return;

      try {
        const query = new URLSearchParams({
          since: this.lastPollTimestamp.toString(),
          token: this.currentToken,
        });

        const res = await fetch(`${ENV.apiBaseUrl}/realtime/events?${query.toString()}`, {
          headers: {
            Authorization: `Bearer ${this.currentToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          this.lastPollTimestamp = Date.now();
          if (!this.isConnectedState) {
            this.isConnectedState = true;
            this.notifyConnectionStatus(true);
          }

          if (data && Array.isArray(data.events)) {
            for (const evt of data.events) {
              this.handleIncomingEvent(evt);
            }
          }
        }
      } catch {
        // Polling retry on next interval
      }

      if (this.isPolling && !this.isExplicitlyClosed) {
        this.pollTimer = setTimeout(poll, 3000);
      }
    };

    poll();
  }

  private stopPollingFallback() {
    this.isPolling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private handleIncomingEvent(rawPayload: any) {
    if (!rawPayload) return;
    if (rawPayload.type === 'pong' || rawPayload.type === 'heartbeat') return;

    const eventName: SocketEventType = rawPayload.type || rawPayload.event || rawPayload.eventType;
    if (!eventName) return;

    const payload: RealtimeEventPayload = {
      type: eventName,
      entityId: rawPayload.entityId || rawPayload.id || '',
      scope: rawPayload.scope,
      data: rawPayload.data || rawPayload,
      changedFields: rawPayload.changedFields,
      timestamp: rawPayload.timestamp || new Date().toISOString(),
    };

    this.dispatch(eventName, payload);
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    this.stopPollingFallback();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.currentToken = null;
    this.isConnectedState = false;
    this.notifyConnectionStatus(false);
  }

  isConnected(): boolean {
    return this.isConnectedState;
  }

  subscribe<T = any>(event: SocketEventType, handler: SocketEventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  subscribeToConnectionStatus(handler: ConnectionStatusHandler): () => void {
    this.connectionStatusListeners.add(handler);
    handler(this.isConnected());
    return () => {
      this.connectionStatusListeners.delete(handler);
    };
  }

  onReconnect(callback: () => void): () => void {
    this.reconnectSubscribers.add(callback);
    return () => {
      this.reconnectSubscribers.delete(callback);
    };
  }

  private dispatch(event: string, payload: RealtimeEventPayload) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (e) {
          console.warn(`[SocketService] Error executing handler for ${event}:`, e);
        }
      });
    }
  }

  private notifyConnectionStatus(isConnected: boolean) {
    this.connectionStatusListeners.forEach((handler) => {
      try {
        handler(isConnected);
      } catch (e) {
        console.warn('[SocketService] Error notifying connection status:', e);
      }
    });
  }
}

export const socketService = new SocketService();
