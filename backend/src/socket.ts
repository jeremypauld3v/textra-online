import { Server } from "socket.io";
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { prisma } from "./lib/prisma.js";
import type { Prisma } from "@prisma/client";

let io: Server;
const onlineUsers = new Map<string, number>(); // userId -> connection count
const activeTrades = new Map<string, string>(); // userId -> partnerId

export function initSocket(fastify: FastifyInstance) {
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
      const decoded = jwt.verify(token, secret) as any;
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    console.log(`👤 User connected: ${userId} (${socket.id})`);

    // Add to online users and broadcast
    const count = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, count + 1);
    io.emit("presence_update", { onlineUserIds: Array.from(onlineUsers.keys()) });

    // Join a private room for direct messages/trades
    socket.join(`user:${userId}`);

    // Global Chat
    socket.on("chat_message", async (msg: string) => {
       const char = await prisma.character.findFirst({ where: { userId } });
       if (!char) return;

       // Persist to DB
       await (prisma as any).chatMessage.create({
          data: {
             type: "WORLD",
             content: msg,
             fromCharacterId: char.id
          }
       });

       const payload = {
          userId,
          characterName: char.name,
          message: msg,
          timestamp: new Date().toISOString()
       };
       io.emit("chat_broadcast", payload);
    });

    // Private Messaging
    socket.on("private_message", async (data: { targetUserId: string, message: string }) => {
       const char = await prisma.character.findFirst({ where: { userId } });
       const targetChar = await prisma.character.findFirst({ where: { userId: data.targetUserId } });
       if (!char || !targetChar) return;

       // Persist to DB
       await (prisma as any).chatMessage.create({
          data: {
             type: "PRIVATE",
             content: data.message,
             fromCharacterId: char.id,
             toCharacterId: targetChar.id
          }
       });

       const payload = {
          fromUserId: userId,
          fromCharacterName: char.name,
          message: data.message,
          timestamp: new Date().toISOString()
       };
       // Send to target and back to sender (for UI sync)
       io.to(`user:${data.targetUserId}`).emit("private_broadcast", payload);
       io.to(`user:${userId}`).emit("private_broadcast", payload);
    });

    // Trading logic
    socket.on("trade_request", async (targetUserId: string) => {
       if (targetUserId === userId) return; // Block self-trade

       // ANTI-SPAM: Check if either user is busy
       if (activeTrades.has(userId)) {
          console.log(`⚠️ Blocked Trade Request: ${userId} is already busy.`);
          return;
       }
       if (activeTrades.has(targetUserId)) {
          console.log(`⚠️ Blocked Trade Request: ${targetUserId} is busy.`);
          return;
       }

       const char = await prisma.character.findFirst({ where: { userId } });
       if (!char) {
          console.error(`❌ Trade Request Failed: User ${userId} has no character.`);
          return;
       }

       console.log(`🤝 [SYSTEM] Trade Request: ${char.name} (${userId}) -> ${targetUserId}`);
       io.to(`user:${targetUserId}`).emit("trade_invite", { 
          fromUserId: userId,
          fromName: char.name 
       });
    });

    socket.on("trade_respond", async (data: { targetUserId: string, accepted: boolean }) => {
       console.log(`🙋 [SYSTEM] Trade Response from ${userId} to ${data.targetUserId}: ${data.accepted ? 'ACCEPTED' : 'DECLINED'}`);
       
       if (data.accepted) {
          // Verify neither is busy now
          if (activeTrades.has(userId) || activeTrades.has(data.targetUserId)) {
             io.to(`user:${userId}`).emit("trade_declined", { message: "One of the players is now busy." });
             return;
          }

          console.log(`✅ [SYSTEM] Initializing Trade: ${userId} <-> ${data.targetUserId}`);
          
          // SET ACTIVE TRADE (Lock them out of other trades)
          activeTrades.set(userId, data.targetUserId);
          activeTrades.set(data.targetUserId, userId);

          // Send confirm to both to open modals
          io.to(`user:${userId}`).emit("trade_start", { partnerUserId: data.targetUserId });
          io.to(`user:${data.targetUserId}`).emit("trade_start", { partnerUserId: userId });
       } else {
          io.to(`user:${data.targetUserId}`).emit("trade_declined", { fromUserId: userId });
       }
    });

    socket.on("trade_cancel", (data: { targetUserId: string }) => {
       console.log(`🛑 [SYSTEM] Trade Cancelled by ${userId} for ${data.targetUserId}`);
       activeTrades.delete(userId);
       activeTrades.delete(data.targetUserId);
       io.to(`user:${data.targetUserId}`).emit("trade_cancelled", { fromUserId: userId });
    });

    socket.on("trade_update", (data: { toUserId: string, items: any[], gold: number, locked: boolean }) => {
       io.to(`user:${data.toUserId}`).emit("trade_sync", {
          fromUserId: userId,
          items: data.items,
          gold: data.gold,
          locked: data.locked
       });
    });

    socket.on("trade_commit", async (data: { targetUserId: string, myItems: any[], myGold: number, hisItems: any[], hisGold: number }) => {
       try {
          await prisma.$transaction(async (tx) => {
             const me = await tx.character.findFirst({ where: { userId } });
             const him = await tx.character.findFirst({ where: { userId: data.targetUserId } });

             if (!me || !him) throw new Error("Characters not found");

             if (me.gold < data.myGold) throw new Error("Not enough gold");
             if (him.gold < data.hisGold) throw new Error("Partner not enough gold");

             // 1. Move Gold
             await tx.character.update({ where: { id: me.id }, data: { gold: { decrement: data.myGold, increment: data.hisGold } } });
             await tx.character.update({ where: { id: him.id }, data: { gold: { decrement: data.hisGold, increment: data.myGold } } });

             const processTransfer = async (items: any[], fromChar: any, toChar: any) => {
                const tradeSummary = [];
                for (const tradeItem of items) {
                   const original = await tx.inventoryItem.findUnique({ 
                      where: { id: tradeItem.id },
                      include: { template: true }
                   });
                   if (!original || original.characterId !== fromChar.id) throw new Error("Item validation failed");
                   if (original.quantity < tradeItem.quantity) throw new Error("Insufficient quantity");

                   tradeSummary.push({ itemCode: original.itemCode, quantity: tradeItem.quantity, name: original.template.name });

                   if (original.quantity > tradeItem.quantity) {
                      await tx.inventoryItem.update({
                         where: { id: original.id },
                         data: { quantity: { decrement: tradeItem.quantity } }
                      });
                      await tx.inventoryItem.create({
                         data: {
                            characterId: toChar.id,
                            itemCode: original.itemCode,
                            quantity: tradeItem.quantity,
                            rolledAtk: original.rolledAtk,
                            rolledDef: original.rolledDef,
                            rolledStr: original.rolledStr,
                            rolledAgi: original.rolledAgi
                         }
                      });
                   } else {
                      await tx.inventoryItem.update({
                         where: { id: original.id },
                         data: { characterId: toChar.id }
                      });
                   }
                }
                return tradeSummary;
             };

             // 2. Translocate Items
             const myOfferSummary = await processTransfer(data.myItems, me, him);
             const hisOfferSummary = await processTransfer(data.hisItems, him, me);

             // 3. Log Trade
             await (tx as any).tradeLog.create({
                data: {
                   initiatorId: me.id,
                   partnerId: him.id,
                   initiatorOffer: { items: myOfferSummary, gold: data.myGold },
                   partnerOffer: { items: hisOfferSummary, gold: data.hisGold }
                }
             });
          });

          io.to(`user:${userId}`).emit("trade_complete", { success: true });
          io.to(`user:${data.targetUserId}`).emit("trade_complete", { success: true });

          // CLEAR ACTIVE TRADE
          activeTrades.delete(userId);
          activeTrades.delete(data.targetUserId);
       } catch (err: any) {
          console.error("Trade Failed:", err.message);
          io.to(`user:${userId}`).emit("trade_complete", { success: false, error: err.message });
          io.to(`user:${data.targetUserId}`).emit("trade_complete", { success: false, error: err.message });
          // ALSO CLEAR ON FAILURE
          activeTrades.delete(userId);
          activeTrades.delete(data.targetUserId);
       }
    });

    socket.on("disconnect", () => {
      console.log(`👤 User disconnected: ${userId}`);
      const partnerId = activeTrades.get(userId);
      if (partnerId) {
         console.log(`🧹 [SYSTEM] Cleaning active trade for ${userId} (partner: ${partnerId})`);
         activeTrades.delete(userId);
         activeTrades.delete(partnerId);
         io.to(`user:${partnerId}`).emit("trade_cancelled", { message: "Partner disconnected" });
      }

      const count = onlineUsers.get(userId) || 1;
      if (count <= 1) {
        onlineUsers.delete(userId);
      } else {
        onlineUsers.set(userId, count - 1);
      }
      io.emit("presence_update", { onlineUserIds: Array.from(onlineUsers.keys()) });
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export { io };
