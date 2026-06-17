import { NotificationChannel, NotificationConfig } from '../valueObjects/Types';

export interface NotificationMessage {
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface INotificationService {
  readonly channel: NotificationChannel;
  send(message: NotificationMessage): Promise<void>;
  sendConfig(config: NotificationConfig, message: NotificationMessage): Promise<void>;
}
