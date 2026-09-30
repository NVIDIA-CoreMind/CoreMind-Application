import { backendConfig } from './config';
import {
  AgentEventType,
  ClientApproveMessage,
  ClientDenyMessage,
  ClientQuestionAnswerMessage,
  CoreMindEvent,
} from './types';

export type WsConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

type EventHandler<T = any> = (event: CoreMindEvent<T>) => void;
type StatusHandler = (status: WsConnectionStatus) => void;

export class CoreMindWebSocketService {
  private ws: WebSocket | null = null;
  private status: WsConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private eventListeners: Map<string, Set<EventHandler>> = new Map();
  private anyListeners: Set<EventHandler> = new Set();
  private statusListeners: Set<StatusHandler> = new Set();
  private shouldConnect = true;

  // Exponential backoff delays in milliseconds
  private readonly backoffDelays = [1000, 2000, 5000, 10000, 15000, 30000];

  constructor() {
    // Listen for config changes (e.g. user updates WS url in settings)
    backendConfig.subscribe(() => {
      if (this.status === 'connected' || this.status === 'connecting' || this.status === 'reconnecting') {
        this.reconnect();
      }
    });
  }

  public getStatus(): WsConnectionStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  public connect(): void {
    this.shouldConnect = true;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.clearReconnectTimer();
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const url = backendConfig.getWsUrl();

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : event.data.toString();
          const parsed: CoreMindEvent = JSON.parse(raw);
          this.dispatchEvent(parsed);
        } catch (err) {
          console.warn('[CoreMind WS] Failed to parse event JSON:', err, event.data);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[CoreMind WS] WebSocket error:', err);
        this.setStatus('error');
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.shouldConnect) {
          this.setStatus('disconnected');
          this.scheduleReconnect();
        } else {
          this.setStatus('disconnected');
        }
      };
    } catch (err) {
      console.error('[CoreMind WS] Connect exception:', err);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.shouldConnect = false;
    this.clearReconnectTimer();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  public reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  private scheduleReconnect(): void {
    if (!this.shouldConnect) return;
    this.clearReconnectTimer();

    const delayIndex = Math.min(this.reconnectAttempts, this.backoffDelays.length - 1);
    const delay = this.backoffDelays[delayIndex];
    this.reconnectAttempts++;

    this.setStatus('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(newStatus: WsConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((fn) => {
        try {
          fn(newStatus);
        } catch (err) {
          console.error('[CoreMind WS] Status listener error:', err);
        }
      });
    }
  }

  private dispatchEvent(event: CoreMindEvent): void {
    // Notify general listeners
    this.anyListeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error('[CoreMind WS] onAny listener error:', err);
      }
    });

    // Notify specific event listeners
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((fn) => {
        try {
          fn(event);
        } catch (err) {
          console.error(`[CoreMind WS] Listener error for ${event.type}:`, err);
        }
      });
    }
  }

  public on<T = any>(eventType: AgentEventType | string, handler: EventHandler<T>): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(handler as EventHandler);

    return () => {
      const set = this.eventListeners.get(eventType);
      if (set) {
        set.delete(handler as EventHandler);
        if (set.size === 0) {
          this.eventListeners.delete(eventType);
        }
      }
    };
  }

  public onAny(handler: EventHandler): () => void {
    this.anyListeners.add(handler);
    return () => {
      this.anyListeners.delete(handler);
    };
  }

  public onStatusChange(handler: StatusHandler): () => void {
    this.statusListeners.add(handler);
    // Immediately notify current status
    handler(this.status);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  public send(message: object): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (err) {
        console.error('[CoreMind WS] Send error:', err);
        return false;
      }
    }
    console.warn('[CoreMind WS] Cannot send message, socket not open:', message);
    return false;
  }

  /**
   * Responds to an agent clarification question via WebSocket.
   */
  public answerQuestion(questionId: string, answer: string): boolean {
    const payload: ClientQuestionAnswerMessage = {
      type: 'agent.question_answer',
      question_id: questionId,
      answer,
    };
    return this.send(payload);
  }

  /**
   * Approves a high-risk tool action via WebSocket.
   */
  public approve(approvalId: string): boolean {
    const payload: ClientApproveMessage = {
      type: 'agent.approve',
      approval_id: approvalId,
    };
    return this.send(payload);
  }

  /**
   * Denies a high-risk tool action via WebSocket.
   */
  public deny(approvalId: string, reason?: string): boolean {
    const payload: ClientDenyMessage = {
      type: 'agent.deny',
      approval_id: approvalId,
      reason,
    };
    return this.send(payload);
  }
}

export const coremindWs = new CoreMindWebSocketService();
