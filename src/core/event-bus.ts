type EventCallback<T> = (data: T) => void | Promise<void>

export class EventBus<TEvents extends Record<string, any>> {
  private listeners = new Map<keyof TEvents, Set<EventCallback<any>>>();

  on<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  async emit<K extends keyof TEvents>(event: K, data: TEvents[K]): Promise<void> {
    const callbacks = this.listeners.get(event);

    if (!callbacks) return;

    await Promise.all(Array.from(callbacks).map((cb) => cb(data)));
  }

  once<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>): () => void {
    const unsubscribe = this.on(event, async (data) => {
      unsubscribe();
      await callback(data);
    });
    return unsubscribe;
  }
}

// Define the Event type to fix the import error
export type Event = {
  'agent:message': { text: string };
  'human:input': { text: string };
  'tool:call': { name: string; args: any };
  'tool:result': { name: string; result: any };
  [key: string]: any;
};

export const bus = new EventBus<Event>();
