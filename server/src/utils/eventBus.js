import { EventEmitter } from 'events';

class AppEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emitPayPalEvent(eventType, payload) {
    this.emit('paypal:events', {
      eventType,
      payload,
      timestamp: new Date().toISOString(),
    });
  }
}

export const eventBus = new AppEventBus();
