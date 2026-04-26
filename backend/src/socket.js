import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./lib/prisma.js";
import { inventoryService } from "./services/inventoryService.js";
let io;
const onlineUsers = new Map(); // userId -> connection count
const charCache = new Map(); // userId -> char info
const activeTrades = new Map(); // userId -> partnerId
const tradeStates = new Map(); // userId -> my offer half
const pendingTradeRequests = new Map();
let presenceTimeout = null;
const broadcastPresence = () => {
    if (presenceTimeout)
        return;
    presenceTimeout = setTimeout(() => {
        io.emit("presence_update", { onlineUserIds: Array.from(onlineUsers.keys()) });
        presenceTimeout = null;
    }, 2000); // Only broadcast once every 2 seconds
};
export function initSocket(fastify) {
    io = new Server(fastify.server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }
        try {
            const secret = process.env.JWT_SECRET || "supersecretjwtkey_change_in_production";
            const decoded = jwt.verify(token, secret);
            socket.data.userId = decoded.userId;
            next();
        }
        catch (err) {
            next(new Error("Authentication error: Invalid token"));
        }
    });
    io.on("connection", async (socket) => {
        const userId = socket.data.userId;
        console.log(`👤 User connected: ${userId} (${socket.id})`);
        // Pre-fetch and cache character info
        if (!charCache.has(userId)) {
            const char = await prisma.character.findFirst({ where: { userId }, select: { id: true, name: true, userId: true } });
            if (char)
                charCache.set(userId, char);
        }
        // Add to online users and broadcast
        const count = onlineUsers.get(userId) || 0;
        onlineUsers.set(userId, count + 1);
        broadcastPresence();
        // Join a private room for direct messages/trades
        socket.join(`user:${userId}`);
        // Unified Chat Handler
        socket.on("chat_message", async (data) => {
            const char = charCache.get(userId);
            if (!char)
                return;
            // Handle both legacy string and new object format
            const isObject = typeof data === 'object' && data !== null;
            const message = isObject ? data.message : data;
            const channel = isObject ? (data.channel || "global") : "global";
            const targetCharacterId = isObject ? data.targetUserId : null;
            if (!message || message.trim() === "")
                return;
            const payload = {
                senderId: char.id,
                senderName: char.name,
                senderUserId: char.userId,
                message: message,
                createdAt: new Date().toISOString(),
                channel: channel === "whispers" ? "whispers" : (channel === "trade" ? "trade" : "global")
            };
            if (channel === "whispers" && targetCharacterId) {
                const targetChar = await prisma.character.findUnique({
                    where: { id: targetCharacterId },
                    select: { id: true, name: true, userId: true }
                });
                if (!targetChar)
                    return;
                payload.targetId = targetChar.id;
                payload.targetName = targetChar.name;
                io.to(`user:${userId}`).emit("chat_message", payload);
                io.to(`user:${targetChar.userId}`).emit("chat_message", payload);
                prisma.chatMessage.create({
                    data: {
                        type: "PRIVATE",
                        content: message,
                        fromCharacterId: char.id,
                        toCharacterId: targetChar.id
                    }
                }).catch(err => console.error("Private chat persist fail:", err));
            }
            else {
                // World or Trade
                io.emit("chat_message", payload);
                prisma.chatMessage.create({
                    data: {
                        type: channel === "trade" ? "TRADE" : "WORLD",
                        content: message,
                        fromCharacterId: char.id
                    }
                }).catch(err => console.error("Chat persist fail:", err));
            }
        });
        // Trading logic
        socket.on("trade_request", async (targetUserId) => {
            if (targetUserId === userId)
                return; // Block self-trade
            // ANTI-SPAM: Block if sender has a pending outgoing invite OR is in active trade
            if (pendingTradeRequests.has(userId)) {
                console.log(`⚠️ Blocked: ${userId} already has a pending trade request.`);
                io.to(`user:${userId}`).emit("trade_request_blocked", { message: "You already have a pending trade request." });
                return;
            }
            if (activeTrades.has(userId)) {
                console.log(`⚠️ Blocked Trade Request: ${userId} is already in a trade.`);
                return;
            }
            if (activeTrades.has(targetUserId)) {
                console.log(`⚠️ Blocked Trade Request: ${targetUserId} is busy.`);
                io.to(`user:${userId}`).emit("trade_request_blocked", { message: "That player is currently busy." });
                return;
            }
            const char = await prisma.character.findFirst({ where: { userId } });
            if (!char) {
                console.error(`❌ Trade Request Failed: User ${userId} has no character.`);
                return;
            }
            console.log(`🤝 [SYSTEM] Trade Request: ${char.name} (${userId}) -> ${targetUserId}`);
            // ⏰ Set 10-second expiry
            const timeout = setTimeout(() => {
                if (pendingTradeRequests.has(userId)) {
                    pendingTradeRequests.delete(userId);
                    console.log(`⏰ [SYSTEM] Trade Request Expired: ${userId} -> ${targetUserId}`);
                    io.to(`user:${userId}`).emit("trade_expired", { message: "Your trade request expired." });
                    io.to(`user:${targetUserId}`).emit("trade_expired", { message: "Trade invitation expired." });
                }
            }, 10000);
            pendingTradeRequests.set(userId, { targetUserId, timeout });
            io.to(`user:${targetUserId}`).emit("trade_invite", {
                fromUserId: userId,
                fromName: char.name
            });
        });
        socket.on("trade_respond", async (data) => {
            console.log(`🙋 [SYSTEM] Trade Response from ${userId} to ${data.targetUserId}: ${data.accepted ? 'ACCEPTED' : 'DECLINED'}`);
            // Cancel the sender's pending invite timeout
            const pending = pendingTradeRequests.get(data.targetUserId);
            if (pending) {
                clearTimeout(pending.timeout);
                pendingTradeRequests.delete(data.targetUserId);
            }
            if (data.accepted) {
                // Verify neither is busy now (race condition check)
                if (activeTrades.has(userId) || activeTrades.has(data.targetUserId)) {
                    io.to(`user:${userId}`).emit("trade_declined", { message: "One of the players is now busy." });
                    return;
                }
                console.log(`✅ [SYSTEM] Initializing Trade: ${userId} <-> ${data.targetUserId}`);
                // SET ACTIVE TRADE
                activeTrades.set(userId, data.targetUserId);
                activeTrades.set(data.targetUserId, userId);
                // Initialize states
                const emptyState = { items: [], gold: 0, locked: false, finalized: false };
                tradeStates.set(userId, { ...emptyState });
                tradeStates.set(data.targetUserId, { ...emptyState });
                // Send confirm to both to open modals
                io.to(`user:${userId}`).emit("trade_start", { partnerUserId: data.targetUserId });
                io.to(`user:${data.targetUserId}`).emit("trade_start", { partnerUserId: userId });
            }
            else {
                io.to(`user:${data.targetUserId}`).emit("trade_declined", { fromUserId: userId });
            }
        });
        socket.on("trade_cancel", (data) => {
            console.log(`🛑 [SYSTEM] Trade Cancelled by ${userId} for ${data.targetUserId}`);
            activeTrades.delete(userId);
            activeTrades.delete(data.targetUserId);
            tradeStates.delete(userId);
            tradeStates.delete(data.targetUserId);
            io.to(`user:${data.targetUserId}`).emit("trade_cancelled", { fromUserId: userId });
        });
        socket.on("trade_update", (data) => {
            // Update server state
            const myState = tradeStates.get(userId);
            if (myState) {
                // If offer changed or unlocked, reset finalized status for both (safety reset)
                const changed = JSON.stringify(myState.items) !== JSON.stringify(data.items) || myState.gold !== data.gold || myState.locked !== data.locked;
                if (changed) {
                    myState.finalized = false;
                    const partnerState = tradeStates.get(data.toUserId);
                    if (partnerState)
                        partnerState.finalized = false;
                }
                myState.items = data.items;
                myState.gold = data.gold;
                myState.locked = data.locked;
            }
            io.to(`user:${data.toUserId}`).emit("trade_sync", {
                fromUserId: userId,
                items: data.items,
                gold: data.gold,
                locked: data.locked,
                finalized: myState?.finalized || false
            });
        });
        socket.on("trade_commit", async (data) => {
            try {
                const myState = tradeStates.get(userId);
                const companionId = activeTrades.get(userId);
                if (!myState || companionId !== data.targetUserId)
                    return;
                const partnerState = tradeStates.get(data.targetUserId);
                if (!partnerState)
                    return;
                // Double check locking requirement
                if (!myState.locked || !partnerState.locked) {
                    throw new Error("Both players must lock before finalizing.");
                }
                // Mark as finalized
                myState.finalized = true;
                // Sync commitment status (notify partner)
                io.to(`user:${data.targetUserId}`).emit("trade_sync", {
                    fromUserId: userId,
                    items: myState.items,
                    gold: myState.gold,
                    locked: myState.locked,
                    finalized: true
                });
                // Only execute transaction if BOTH have finalized
                if (!partnerState.finalized) {
                    console.log(`⏳ [TRADE] ${userId} finalized, waiting for ${data.targetUserId}`);
                    return;
                }
                console.log(`🚀 [TRADE] Both players finalized! Executing: ${userId} <-> ${data.targetUserId}`);
                await prisma.$transaction(async (tx) => {
                    const me = await tx.character.findFirst({ where: { userId } });
                    const him = await tx.character.findFirst({ where: { userId: data.targetUserId } });
                    if (!me || !him)
                        throw new Error("Characters not found");
                    if (me.gold < myState.gold)
                        throw new Error("Not enough gold");
                    if (him.gold < partnerState.gold)
                        throw new Error("Partner not enough gold");
                    // 1. Move Gold — net delta per player (received - sent)
                    const myGoldDelta = partnerState.gold - myState.gold;
                    const hisGoldDelta = myState.gold - partnerState.gold;
                    await tx.character.update({ where: { id: me.id }, data: { gold: { increment: myGoldDelta } } });
                    await tx.character.update({ where: { id: him.id }, data: { gold: { increment: hisGoldDelta } } });
                    const processTransfer = async (items, fromChar, toChar) => {
                        const tradeSummary = [];
                        for (const tradeItem of items) {
                            const original = await tx.inventoryItem.findUnique({
                                where: { id: tradeItem.id },
                                include: { template: true }
                            });
                            if (!original || original.characterId !== fromChar.id)
                                throw new Error("Item validation failed");
                            if (original.quantity < tradeItem.quantity)
                                throw new Error("Insufficient quantity");
                            tradeSummary.push({ itemCode: original.itemCode, quantity: tradeItem.quantity, name: original.template.name });
                            // Recipient receives via centralized Service (handles stacking/capacity)
                            await inventoryService.addItem(toChar.id, original.itemCode, tradeItem.quantity, {
                                rolledAtk: original.rolledAtk,
                                rolledDef: original.rolledDef,
                                rolledStr: original.rolledStr,
                                rolledAgi: original.rolledAgi
                            }, tx);
                            // Sender loses
                            if (original.quantity > tradeItem.quantity) {
                                await tx.inventoryItem.update({
                                    where: { id: original.id },
                                    data: { quantity: { decrement: tradeItem.quantity } }
                                });
                            }
                            else {
                                await tx.inventoryItem.delete({
                                    where: { id: original.id }
                                });
                            }
                        }
                        return tradeSummary;
                    };
                    // 2. Translocate Items
                    const myOfferSummary = await processTransfer(myState.items, me, him);
                    const hisOfferSummary = await processTransfer(partnerState.items, him, me);
                    // 3. Log Trade
                    await tx.tradeLog.create({
                        data: {
                            initiatorId: me.id,
                            partnerId: him.id,
                            initiatorOffer: { items: myOfferSummary, gold: myState.gold },
                            partnerOffer: { items: hisOfferSummary, gold: partnerState.gold }
                        }
                    });
                });
                io.to(`user:${userId}`).emit("trade_complete", { success: true });
                io.to(`user:${data.targetUserId}`).emit("trade_complete", { success: true });
                // CLEAR ACTIVE TRADE
                activeTrades.delete(userId);
                activeTrades.delete(data.targetUserId);
                tradeStates.delete(userId);
                tradeStates.delete(data.targetUserId);
            }
            catch (err) {
                console.error("Trade Failed:", err.message);
                io.to(`user:${userId}`).emit("trade_complete", { success: false, error: err.message });
                io.to(`user:${data.targetUserId}`).emit("trade_complete", { success: false, error: err.message });
                // ALSO CLEAR ON FAILURE
                activeTrades.delete(userId);
                activeTrades.delete(data.targetUserId);
                tradeStates.delete(userId);
                tradeStates.delete(data.targetUserId);
            }
        });
        socket.on("disconnect", async () => {
            console.log(`👤 User disconnected: ${userId}`);
            // 🛑 OFFLINE AUTO-PAUSE
            try {
                const char = await prisma.character.findFirst({ where: { userId } });
                if (char && (char.actionStatus === "TRAVELING_OUT" || char.actionStatus === "TRAVELING_IN" || char.actionStatus === "CAMPING")) {
                    await prisma.character.update({
                        where: { id: char.id },
                        data: { isPaused: true }
                    });
                    console.log(`⏸️ Auto-Paused character ${char.name} for offline safety.`);
                }
            }
            catch (e) {
                console.error("Auto-pause failed:", e);
            }
            // Clean up any pending outgoing trade request
            const pending = pendingTradeRequests.get(userId);
            if (pending) {
                clearTimeout(pending.timeout);
                pendingTradeRequests.delete(userId);
                io.to(`user:${pending.targetUserId}`).emit("trade_expired", { message: "Trade invitation expired (player disconnected)." });
            }
            const partnerId = activeTrades.get(userId);
            if (partnerId) {
                console.log(`🧹 [SYSTEM] Cleaning active trade for ${userId} (partner: ${partnerId})`);
                activeTrades.delete(userId);
                activeTrades.delete(partnerId);
                tradeStates.delete(userId);
                tradeStates.delete(partnerId);
                io.to(`user:${partnerId}`).emit("trade_cancelled", { message: "Partner disconnected" });
            }
            const count = onlineUsers.get(userId) || 1;
            if (count <= 1) {
                onlineUsers.delete(userId);
                charCache.delete(userId);
            }
            else {
                onlineUsers.set(userId, count - 1);
            }
            broadcastPresence();
        });
    });
    return io;
}
export function getIO() {
    return io;
}
export { io };
//# sourceMappingURL=socket.js.map