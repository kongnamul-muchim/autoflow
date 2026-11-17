export interface NotificationMessage {
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface INotificationService {
  readonly channel: string;
  send(message: NotificationMessage): Promise<void>;
}
