import { INotificationService, NotificationMessage } from '../../domain/ports/INotificationService.js';
import { NotificationChannel, NotificationConfig } from '../../domain/valueObjects/Types.js';
import { ILogger } from '../../domain/ports/ILogger.js';

export class ConsoleNotificationService implements INotificationService {
  readonly channel: NotificationChannel = 'console';

  constructor(private readonly logger: ILogger) {}

  async send(message: NotificationMessage): Promise<void> {
    const prefix = `[${message.severity.toUpperCase()}]`;
    this.logger.info('ConsoleNotification', `${prefix} ${message.title}: ${message.body}`);
  }

  async sendConfig(config: NotificationConfig, message: NotificationMessage): Promise<void> {
    if (message.severity === 'error' && config.onFailure) {
      await this.send(message);
    } else if (message.severity === 'success' && config.onSuccess) {
      await this.send(message);
    }
  }
}
