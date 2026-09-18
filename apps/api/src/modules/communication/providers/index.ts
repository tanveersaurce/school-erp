import { NotificationChannel } from '@edusphere/common';
import { INotificationProvider } from './notification-provider.interface.js';
import { emailNotificationProvider } from './email.provider.js';
import { smsNotificationProvider } from './sms.provider.js';
import { pushNotificationProvider } from './push.provider.js';
import { whatsappNotificationProvider } from './whatsapp.provider.js';

export * from './notification-provider.interface.js';
export * from './email.provider.js';
export * from './sms.provider.js';
export * from './push.provider.js';
export * from './whatsapp.provider.js';

export class NotificationProviderRegistry {
  private providers = new Map<NotificationChannel, INotificationProvider>();

  constructor() {
    this.register(emailNotificationProvider);
    this.register(smsNotificationProvider);
    this.register(pushNotificationProvider);
    this.register(whatsappNotificationProvider);
  }

  public register(provider: INotificationProvider): void {
    this.providers.set(provider.channel, provider);
  }

  public getProvider(channel: NotificationChannel): INotificationProvider | undefined {
    return this.providers.get(channel);
  }
}

export const providerRegistry = new NotificationProviderRegistry();
