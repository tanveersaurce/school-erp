import { IDomainEvent } from '@edusphere/types';
import { logger } from '../../../core/logger/logger.js';

export type EventHandler<T = any> = (event: IDomainEvent<T>) => Promise<void> | void;

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  /**
   * Subscribe to a specific domain event type or wildcard '*'
   */
  public subscribe<T = any>(eventType: string, handler: EventHandler<T>): void {
    const list = this.handlers.get(eventType) || [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  /**
   * Emit a domain event asynchronously to all subscribed handlers
   */
  public async emit<T = any>(event: IDomainEvent<T>): Promise<void> {
    logger.info(
      {
        eventId: event.eventId,
        eventType: event.eventType,
        tenantId: event.tenantId,
        sourceEntityType: event.sourceEntityType,
        sourceEntityId: event.sourceEntityId,
        correlationId: event.correlationId,
      },
      `📢 [Domain Event Emitted]: ${event.eventType}`
    );

    const handlersToCall: EventHandler[] = [];

    for (const [pattern, handlers] of this.handlers.entries()) {
      if (pattern === '*' || pattern === event.eventType) {
        handlersToCall.push(...handlers);
      } else if (pattern.endsWith('.*')) {
        const prefix = pattern.slice(0, -2);
        if (event.eventType.startsWith(prefix + '.')) {
          handlersToCall.push(...handlers);
        }
      }
    }

    for (const handler of handlersToCall) {
      try {
        await handler(event);
      } catch (err) {
        logger.error(
          {
            err: (err as Error).message,
            stack: (err as Error).stack,
            eventType: event.eventType,
            eventId: event.eventId,
          },
          `❌ [EventBus Error] Handler failed for event ${event.eventType}`
        );
      }
    }
  }

  /**
   * Remove all handlers (useful in test isolation)
   */
  public clearSubscriptions(): void {
    this.handlers.clear();
  }

  /**
   * Retrieve active registered event types
   */
  public getSubscribedEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export const eventBus = new EventBus();
