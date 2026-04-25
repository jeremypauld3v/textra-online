/**
 * Periodically trims the chat history to prevent database bloat.
 * Enforces a limit of ~200 messages for Global/Trade and ~20 for private threads.
 */
export declare const cleanupWorldChat: () => Promise<void>;
export declare const cleanupPrivateChat: () => Promise<void>;
export declare const startChatCleanupJob: () => void;
//# sourceMappingURL=chatCleanupService.d.ts.map