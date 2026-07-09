/**
 * 💰 MarketService
 * Handles the global player-to-player economy.
 */
export declare class MarketService {
    /**
     * 📈 Get all active marketplace listings
     */
    getListings(): Promise<({
        template: {
            code: string;
            name: string;
            emoji: string;
            type: string;
            description: string;
            statAtk: number | null;
            statDef: number | null;
            statStr: number | null;
            statAgi: number | null;
            statInt: number | null;
            statLuk: number | null;
            statDex: number | null;
            statHeal: number | null;
            statEnergy: number | null;
            minRoll: number;
            maxRoll: number;
            levelReq: number;
            equipSlot: string | null;
            classType: string | null;
            statLifesteal: number | null;
            statThorns: number | null;
            statGoldBonus: number | null;
            statExpBonus: number | null;
            statMoveSpeed: number | null;
            statHpRegen: number | null;
            sprites: import("@prisma/client/runtime/client").JsonValue | null;
            rarityId: string;
        };
        seller: {
            name: string;
        };
    } & {
        id: string;
        itemCode: string;
        quantity: number;
        createdAt: Date;
        rolledAtk: number | null;
        rolledDef: number | null;
        rolledStr: number | null;
        rolledAgi: number | null;
        rolledInt: number | null;
        rolledLuk: number | null;
        sellerId: string;
        price: number;
    })[]>;
    /**
     * 🏷️ Create a new listing
     * Moves items from inventory into the MarketListing.
     */
    listItem(characterId: string, inventoryItemId: string, quantity: number, price: number): Promise<{
        id: string;
        itemCode: string;
        quantity: number;
        createdAt: Date;
        rolledAtk: number | null;
        rolledDef: number | null;
        rolledStr: number | null;
        rolledAgi: number | null;
        rolledInt: number | null;
        rolledLuk: number | null;
        sellerId: string;
        price: number;
    }>;
    /**
     * 🛒 Buy an item from the marketplace
     * Atomic swap of Gold and Items. Supports partial stack buying.
     */
    buyItem(buyerId: string, listingId: string, requestedQuantity: number): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * ❌ Cancel a listing
     * Returns item to the seller.
     */
    cancelListing(characterId: string, listingId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
export declare const marketService: MarketService;
//# sourceMappingURL=marketService.d.ts.map