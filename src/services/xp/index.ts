// XP Engine public entry point.
// Importing this module guarantees the engine is subscribed to the event bus.

import { registerXPEngine } from "./XPService";

registerXPEngine();

export { XPService, registerXPEngine } from "./XPService";
export { emitXPEvent, emitXPEventAsync, notifyXPApplied, onXPApplied, onXPEvent } from "./xpEvents";
export type { XPAppliedListener, XPAppliedPayload } from "./xpEvents";

export { XP_REWARDS, XP_REASONS, levelForXP, levelProgress, xpForLevel } from "./xpRules";
export type {
  UserXPStats,
  XPAwardResult,
  XPEntry,
  XPEvent,
  XPEventListener,
  XPEventType,
} from "./xpTypes";
