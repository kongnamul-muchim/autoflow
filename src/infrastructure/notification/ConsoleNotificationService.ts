import { INotificationService, NotificationMessage } from '../../core/domain/ports/INotificationService.js';
import { ILogger } from '../../core/domain/ports/ILogger.js';

export class ConsoleNotificationService implements INotificationService {
  readonly channel = 'console' as const;

  constructor(private readonly logger: ILogger) {}

  async send(message: NotificationMessage): Promise<void> {
    const prefix = `[${message.severity.toUpperCase()}]`;
    this.logger.info('ConsoleNotification', `${prefix} ${message.title}: ${message.body}`);
  }

  async sendConfig(config: { channel: string; onSuccess: boolean; onFailure: boolean }, message: NotificationMessage): Promise<void> {
    if (message.severity === 'error' && config.onFailure) {
      await this.send(message);
    } else if (message.severity === 'success' && config.onSuccess) {
      await this.send(message);
    }
  }
}
