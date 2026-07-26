import { EventEmitter } from "events";

// ponytail: single-process EventEmitter. Use Redis pub/sub if multi-process.
export const orderEvents = new EventEmitter();
orderEvents.setMaxListeners(100);
