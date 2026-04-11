import { prisma } from "../lib/prisma.js";
import { inventoryService } from "./inventoryService.js";

/**
 * 💰 MarketService
 * Handles the global player-to-player economy.
 */
export class MarketService {
  /**
   * 📈 Get all active marketplace listings
   */
  async getListings() {
    return await prisma.marketListing.findMany({
      include: {
        template: true,
        seller: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * 🏷️ Create a new listing
   * Moves items from inventory into the MarketListing.
   */
  async listItem(characterId: string, inventoryItemId: string, quantity: number, price: number) {
    if (price <= 0 || quantity <= 0) throw new Error("Invalid price or quantity");

    // 1. Fetch character and inventory item
    const invItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { template: true }
    });

    if (!invItem || invItem.characterId !== characterId || invItem.quantity < quantity) {
      throw new Error("Insufficient items in inventory");
    }

    // 2. Atomic Transaction: Remove from inventory, add to market
    return await prisma.$transaction(async (tx) => {
      if (invItem.quantity > quantity) {
        await tx.inventoryItem.update({
          where: { id: inventoryItemId },
          data: { quantity: { decrement: quantity } }
        });
      } else {
        await tx.inventoryItem.delete({
          where: { id: inventoryItemId }
        });
      }

      return await tx.marketListing.create({
        data: {
          sellerId: characterId,
          itemCode: invItem.itemCode,
          quantity,
          price,
          rolledAtk: invItem.rolledAtk,
          rolledDef: invItem.rolledDef,
          rolledStr: invItem.rolledStr,
          rolledAgi: invItem.rolledAgi
        }
      });
    });
  }

  /**
   * 🛒 Buy an item from the marketplace
   * Atomic swap of Gold and Items. Supports partial stack buying.
   */
  async buyItem(buyerId: string, listingId: string, requestedQuantity: number) {
    if (requestedQuantity <= 0) throw new Error("Invalid quantity");

    // 1. Fetch listing and buyer
    const listing = await prisma.marketListing.findUnique({
      where: { id: listingId },
      include: { seller: true }
    });

    if (!listing) throw new Error("Listing no longer exists");
    if (listing.sellerId === buyerId) throw new Error("You cannot buy your own listing");
    if (requestedQuantity > listing.quantity) throw new Error("Not enough items in listing");

    const buyer = await prisma.character.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new Error("Buyer not found");

    const totalCost = requestedQuantity * listing.price;
    if (buyer.gold < totalCost) {
      throw new Error("Insufficient gold");
    }

    // 2. Logic: Seller gets 95% (5% Tax)
    const tax = Math.floor(totalCost * 0.05);
    const sellerEarnings = totalCost - tax;

    // 3. Execution (Atomic Transaction)
    await prisma.$transaction(async (tx) => {
      // Deduct Gold from Buyer
      await tx.character.update({
        where: { id: buyerId },
        data: { gold: { decrement: totalCost } }
      });

      // Add Gold to Seller
      await tx.character.update({
        where: { id: listing.sellerId },
        data: { gold: { increment: sellerEarnings } }
      });

      // Add Item to Buyer's Inventory
      await inventoryService.addItem(
        buyerId,
        listing.itemCode,
        requestedQuantity,
        { 
          rolledAtk: listing.rolledAtk, 
          rolledDef: listing.rolledDef, 
          rolledStr: listing.rolledStr, 
          rolledAgi: listing.rolledAgi 
        },
        tx
      );

      // Update or Remove Listing
      if (listing.quantity > requestedQuantity) {
        await tx.marketListing.update({
          where: { id: listingId },
          data: { quantity: { decrement: requestedQuantity } }
        });
      } else {
        await tx.marketListing.delete({ where: { id: listingId } });
      }
    });

    return { success: true, message: `Purchased x${requestedQuantity} for ${totalCost}G` };
  }

  /**
   * ❌ Cancel a listing
   * Returns item to the seller.
   */
  async cancelListing(characterId: string, listingId: string) {
    const listing = await prisma.marketListing.findUnique({
      where: { id: listingId }
    });

    if (!listing || listing.sellerId !== characterId) {
      throw new Error("Listing not found or not yours");
    }

    await prisma.$transaction(async (tx) => {
      if (listing.rolledAtk !== null) {
        // Equipment: Create new unique entry back
        await tx.inventoryItem.create({
          data: {
            characterId: characterId,
            itemCode: listing.itemCode,
            quantity: listing.quantity,
            rolledAtk: listing.rolledAtk,
            rolledDef: listing.rolledDef,
            rolledStr: listing.rolledStr,
            rolledAgi: listing.rolledAgi
          }
        });
      } else {
        // Material: Stack back
        const existing = await tx.inventoryItem.findFirst({
          where: { characterId, itemCode: listing.itemCode }
        });

        if (existing) {
          await tx.inventoryItem.update({
            where: { id: existing.id },
            data: { quantity: { increment: listing.quantity } }
          });
        } else {
          await tx.inventoryItem.create({
            data: {
              characterId: characterId,
              itemCode: listing.itemCode,
              quantity: listing.quantity
            }
          });
        }
      }

      await tx.marketListing.delete({ where: { id: listingId } });
    });

    return { success: true, message: "Listing cancelled and item returned" };
  }
}

export const marketService = new MarketService();
