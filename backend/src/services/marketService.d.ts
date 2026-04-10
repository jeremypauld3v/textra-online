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
            statEnergy: number | null;
            statHeal: number | null;
            statDef: number | null;
            statAtk: number | null;
            statAgi: number | null;
            statStr: number | null;
            code: string;
            name: string;
            emoji: string;
            rarity: string;
            type: string;
            description: string;
            levelReq: number;
            equipSlot: string | null;
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
        sellerId: string;
        price: number;
    }>;
    /**
     * 🛒 Buy an item from the marketplace
     * Atomic swap of Gold and Items.
     */
    buyItem(buyerId: string, listingId: string): Promise<{
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