import { prisma } from "../lib/prisma.js";
/**
 * Periodically trims the chat history to prevent database bloat.
 * Enforces a limit of ~200 messages for Global/Trade and ~20 for private threads.
 */
export const cleanupWorldChat = async () => {
    try {
        const types = ["WORLD", "TRADE"];
        for (const type of types) {
            // Find messages to delete (all except the latest 200)
            const messages = await prisma.chatMessage.findMany({
                where: { type },
                orderBy: { timestamp: "desc" },
                skip: 200,
                select: { id: true }
            });
            if (messages.length > 0) {
                const idsToDelete = messages.map((m) => m.id);
                await prisma.chatMessage.deleteMany({
                    where: { id: { in: idsToDelete } }
                });
                console.log(`[ChatCleanup] Purged ${idsToDelete.length} old ${type} messages.`);
            }
        }
    }
    catch (err) {
        console.error("[ChatCleanup] Error in World/Trade cleanup:", err);
    }
};
export const cleanupPrivateChat = async () => {
    try {
        /**
         * 2. Private Conversation Management
         * Private whispers are now managed per-conversation.
         * - Thread Trimming: For every unique pair of people chatting, the system ensures only the latest 20 messages are stored in the database.
         * - Privacy Policy: This keeps the character history predictable and prevents massive table growth from long-running DM threads.
         */
        const partners = await prisma.chatMessage.findMany({
            where: { type: "PRIVATE" },
            select: { fromCharacterId: true, toCharacterId: true }
        });
        if (partners.length === 0)
            return;
        // Normalize pairs to avoid double-processing (A->B and B->A)
        const processedPairs = new Set();
        for (const p of partners) {
            if (!p.fromCharacterId || !p.toCharacterId)
                continue;
            const pairKey = [p.fromCharacterId, p.toCharacterId].sort().join(':');
            if (processedPairs.has(pairKey))
                continue;
            processedPairs.add(pairKey);
            const [idA, idB] = pairKey.split(':');
            // Check count for this specific thread
            const messages = await prisma.chatMessage.findMany({
                where: {
                    type: "PRIVATE",
                    OR: [
                        { fromCharacterId: idA, toCharacterId: idB },
                        { fromCharacterId: idB, toCharacterId: idA }
                    ]
                },
                orderBy: { timestamp: "desc" },
                skip: 20, // Keep latest 20
                select: { id: true }
            });
            if (messages.length > 0) {
                const idsToDelete = messages.map((m) => m.id);
                await prisma.chatMessage.deleteMany({
                    where: { id: { in: idsToDelete } }
                });
            }
        }
        console.log(`[ChatCleanup] Private chat threads checked and trimmed.`);
    }
    catch (err) {
        console.error("[ChatCleanup] Error in Private cleanup:", err);
    }
};
export const startChatCleanupJob = () => {
    console.log("[ChatCleanup] Initializing automated chat maintenance...");
    // Run every 30 minutes
    const INTERVAL = 30 * 60 * 1000;
    const runCleanup = async () => {
        console.log("[ChatCleanup] Starting maintenance cycle...");
        await cleanupWorldChat();
        await cleanupPrivateChat();
        console.log("[ChatCleanup] Maintenance cycle complete.");
    };
    // Run once on startup
    runCleanup();
    // Schedule recurring
    setInterval(runCleanup, INTERVAL);
};
//# sourceMappingURL=chatCleanupService.js.map