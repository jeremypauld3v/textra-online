import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/textra_db?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
    console.log('🌱 Seeding Game Data...');
    // 1. Item Templates
    const items = [
        { code: "IRON_ORE", name: "Iron Ore", emoji: "🪨", rarity: "COMMON", type: "MATERIAL", description: "A heavy chunk of iron." },
        { code: "SILVER_ORE", name: "Silver Ore", emoji: "💎", rarity: "UNCOMMON", type: "MATERIAL", description: "A shimmering ore." },
        { code: "OAK_LOG", name: "Oak Log", emoji: "🪵", rarity: "COMMON", type: "MATERIAL", description: "Sturdy wood." },
        { code: "HERB", name: "Medicinal Herb", emoji: "🌿", rarity: "COMMON", type: "MATERIAL", description: "A common herb." },
        { code: "PLANT_FIBER", name: "Plant Fiber", emoji: "🧵", rarity: "COMMON", type: "MATERIAL", description: "Strong fibers." },
        { code: "ROUGH_LEATHER", name: "Rough Leather", emoji: "👞", rarity: "COMMON", type: "MATERIAL", description: "Sturdy leather." },
        { code: "RAW_FISH", name: "Raw Fish", emoji: "🐟", rarity: "COMMON", type: "MATERIAL", description: "A fresh catch." },
        { code: "SLIME_GLAND", name: "Slime Gland", emoji: "🧪", rarity: "COMMON", type: "MATERIAL", description: "A sticky gland." },
        { code: "GOBLIN_EAR", name: "Goblin Ear", emoji: "👂", rarity: "COMMON", type: "MATERIAL", description: "Proof of a defeated goblin." },
        { code: "BOAR_TUSK", name: "Boar Tusk", emoji: "🐗", rarity: "UNCOMMON", type: "MATERIAL", description: "A sharp tusk." },
        // --- EQUIPMENT: SWORDSMAN ---
        { code: "WOODEN_SWORD", name: "Wooden Sword", emoji: "🗡️", rarity: "COMMON", type: "EQUIPMENT", description: "A blunt training sword.", statAtk: 5, statStr: 1, equipSlot: "WEAPON", levelReq: 1 },
        { code: "IRON_SWORD", name: "Iron Sword", emoji: "⚔️", rarity: "UNCOMMON", type: "EQUIPMENT", description: "A sturdy iron blade.", statAtk: 12, statStr: 3, equipSlot: "WEAPON", levelReq: 5 },
        { code: "TRAINEE_TUNIC", name: "Trainee Tunic", emoji: "👕", rarity: "COMMON", type: "EQUIPMENT", description: "Light fabric protection.", statDef: 3, equipSlot: "CHEST", levelReq: 1 },
        { code: "IRON_ARMOR", name: "Iron Armor", emoji: "🛡️", rarity: "UNCOMMON", type: "EQUIPMENT", description: "Heavy iron plates.", statDef: 10, statStr: 2, equipSlot: "CHEST", levelReq: 5 },
        { code: "LEATHER_BOOTS", name: "Leather Boots", emoji: "👞", rarity: "COMMON", type: "EQUIPMENT", description: "Sturdy travel boots.", statDef: 1, statAgi: 2, equipSlot: "BOOTS", levelReq: 1 },
        // --- EQUIPMENT: ARCHER ---
        { code: "SHORT_BOW", name: "Short Bow", emoji: "🏹", rarity: "UNCOMMON", type: "EQUIPMENT", description: "A basic hunting bow.", statAtk: 10, statAgi: 4, equipSlot: "WEAPON", levelReq: 4 },
        { code: "LEATHER_ARMOR", name: "Leather Armor", emoji: "🦺", rarity: "UNCOMMON", type: "EQUIPMENT", description: "Flexible and light.", statDef: 6, statAgi: 3, equipSlot: "CHEST", levelReq: 4 },
        // --- EQUIPMENT: MAGE ---
        { code: "OAK_STAFF", name: "Oak Staff", emoji: "🪄", rarity: "UNCOMMON", type: "EQUIPMENT", description: "A staff humming with energy.", statAtk: 8, equipSlot: "WEAPON", levelReq: 4 },
        { code: "MAGE_ROBE", name: "Apprentice Robe", emoji: "👘", rarity: "UNCOMMON", type: "EQUIPMENT", description: "Woven with magic threads.", statDef: 4, equipSlot: "CHEST", levelReq: 4 },
        // --- CONSUMABLES ---
        { code: "HEALTH_POTION", name: "Health Potion", emoji: "🧪", rarity: "COMMON", type: "CONSUMABLE", description: "Restores 20 HP.", statHeal: 20 },
        { code: "STAMINA_POTION", name: "Stamina Potion", emoji: "⚡", rarity: "COMMON", type: "CONSUMABLE", description: "Restores 50 Energy.", statEnergy: 50 },
    ];
    for (const item of items) {
        await prisma.itemTemplate.upsert({
            where: { code: item.code },
            update: item,
            create: item,
        });
    }
    // 2. Monsters & Loot
    const monsters = [
        {
            name: "Goblin Scout", hp: 30, attack: 4, defense: 2, expReward: 15,
            loot: [
                { code: "GOBLIN_EAR", chance: 0.8 },
                { code: "HERB", chance: 0.2 }
            ]
        },
        {
            name: "Wild Boar", hp: 45, attack: 6, defense: 3, expReward: 20,
            loot: [
                { code: "BOAR_TUSK", chance: 0.6 },
                { code: "ROUGH_LEATHER", chance: 0.3 }
            ]
        },
        {
            name: "Bandit Trainee", hp: 35, attack: 5, defense: 4, expReward: 18,
            loot: [
                { code: "HERB", chance: 0.5 },
                { code: "PLANT_FIBER", chance: 0.3 }
            ]
        },
        {
            name: "Dire Wolf", hp: 50, attack: 8, defense: 2, expReward: 30,
            loot: [
                { code: "ROUGH_LEATHER", chance: 0.5 },
                { code: "BOAR_TUSK", chance: 0.2 }
            ]
        },
    ];
    for (const m of monsters) {
        const createdMonster = await prisma.monsterTemplate.upsert({
            where: { name: m.name },
            update: { hp: m.hp, attack: m.attack, defense: m.defense, expReward: m.expReward },
            create: { name: m.name, hp: m.hp, attack: m.attack, defense: m.defense, expReward: m.expReward },
        });
        // Clear old loot for this monster to avoid duplicates during re-seeding
        await prisma.lootTable.deleteMany({ where: { monsterTemplateId: createdMonster.id } });
        for (const l of m.loot) {
            await prisma.lootTable.create({
                data: {
                    monsterTemplateId: createdMonster.id,
                    itemCode: l.code,
                    chance: l.chance
                }
            });
        }
    }
    // [DEPRECATED] Map zone graph removed in favor of infinite depth expansion.
    // 4. Resource Nodes
    const nodes = [
        { name: "Iron Ore", type: "Mining", icon: "🪨", itemCode: "IRON_ORE", baseHp: 15, xpReward: 5 },
        { name: "Silver Ore", type: "Mining", icon: "💎", itemCode: "SILVER_ORE", baseHp: 25, xpReward: 10 },
        { name: "Oak Log", type: "Woodcutting", icon: "🪵", itemCode: "OAK_LOG", baseHp: 15, xpReward: 5 },
        { name: "Herb", type: "Herbalism", icon: "🌿", itemCode: "HERB", baseHp: 10, xpReward: 5 },
        { name: "Cotton Bush", type: "Fiber", icon: "🧵", itemCode: "PLANT_FIBER", baseHp: 10, xpReward: 5 },
        { name: "Raw Hide", type: "Skinning", icon: "👞", itemCode: "ROUGH_LEATHER", baseHp: 15, xpReward: 5 },
        { name: "Fishing Spot", type: "Fishing", icon: "🐟", itemCode: "RAW_FISH", baseHp: 20, xpReward: 5 },
    ];
    for (const n of nodes) {
        await prisma.resourceNodeTemplate.upsert({
            where: { name: n.name },
            update: n,
            create: n,
        });
    }
    // 5. Crafting Recipes (Starting Blueprints)
    console.log('⚒️ Seeding Crafting Recipes...');
    // Clear old recipes to avoid duplicates on re-seed
    await prisma.recipeIngredient.deleteMany();
    await prisma.craftingRecipe.deleteMany();
    const recipes = [
        {
            id: "recipe_wooden_sword",
            resultItemCode: "WOODEN_SWORD",
            levelReq: 1,
            ingredients: [{ itemCode: "OAK_LOG", quantity: 10 }]
        },
        {
            id: "recipe_trainee_tunic",
            resultItemCode: "TRAINEE_TUNIC",
            levelReq: 1,
            ingredients: [{ itemCode: "PLANT_FIBER", quantity: 10 }]
        },
        {
            id: "recipe_leather_boots",
            resultItemCode: "LEATHER_BOOTS",
            levelReq: 1,
            ingredients: [{ itemCode: "ROUGH_LEATHER", quantity: 8 }]
        },
        // Swordsman Upgrades
        {
            id: "recipe_iron_sword",
            resultItemCode: "IRON_SWORD",
            levelReq: 5,
            ingredients: [{ itemCode: "IRON_ORE", quantity: 15 }, { itemCode: "OAK_LOG", quantity: 5 }]
        },
        {
            id: "recipe_iron_armor",
            resultItemCode: "IRON_ARMOR",
            levelReq: 5,
            ingredients: [{ itemCode: "IRON_ORE", quantity: 20 }, { itemCode: "ROUGH_LEATHER", quantity: 5 }]
        },
        // Archer
        {
            id: "recipe_short_bow",
            resultItemCode: "SHORT_BOW",
            levelReq: 4,
            ingredients: [{ itemCode: "OAK_LOG", quantity: 15 }, { itemCode: "PLANT_FIBER", quantity: 5 }]
        },
        {
            id: "recipe_leather_armor",
            resultItemCode: "LEATHER_ARMOR",
            levelReq: 4,
            ingredients: [{ itemCode: "ROUGH_LEATHER", quantity: 15 }, { itemCode: "PLANT_FIBER", quantity: 5 }]
        },
        // Mage
        {
            id: "recipe_oak_staff",
            resultItemCode: "OAK_STAFF",
            levelReq: 4,
            ingredients: [{ itemCode: "OAK_LOG", quantity: 20 }, { itemCode: "SILVER_ORE", quantity: 2 }]
        },
        {
            id: "recipe_mage_robe",
            resultItemCode: "MAGE_ROBE",
            levelReq: 4,
            ingredients: [{ itemCode: "PLANT_FIBER", quantity: 20 }, { itemCode: "SILVER_ORE", quantity: 2 }]
        },
        {
            id: "recipe_health_potion",
            resultItemCode: "HEALTH_POTION",
            levelReq: 1,
            ingredients: [
                { itemCode: "HERB", quantity: 3 },
                { itemCode: "SLIME_GLAND", quantity: 1 }
            ]
        },
        {
            id: "recipe_stamina_potion",
            resultItemCode: "STAMINA_POTION",
            levelReq: 1,
            ingredients: [
                { itemCode: "HERB", quantity: 2 },
                { itemCode: "RAW_FISH", quantity: 2 }
            ]
        },
    ];
    for (const r of recipes) {
        await prisma.craftingRecipe.create({
            data: {
                id: r.id,
                resultItemCode: r.resultItemCode,
                levelReq: r.levelReq,
                ingredients: {
                    create: r.ingredients
                }
            }
        });
    }
    // 6. Dungeon Templates
    console.log('🏰 Seeding Dungeons...');
    const dungeons = [
        {
            name: "Goblin Burrow",
            description: "A foul-smelling hole in the woods. Goblins swarm within.",
            minDepth: 50,
            minLevel: 1,
            floorCount: 3,
            bossName: "Goblin Chief",
            bossHp: 120,
            bossAttack: 15,
            bossDefense: 8,
            bossExpReward: 100,
            treasureChance: 0.3,
            lootItemCode: "WOODEN_SWORD"
        },
        {
            name: "Shadow Mines",
            description: "Abandoned mines overtaken by darkness. Rich ore, deadly foes.",
            minDepth: 150,
            minLevel: 5,
            floorCount: 5,
            bossName: "Stone Golem",
            bossHp: 250,
            bossAttack: 25,
            bossDefense: 18,
            bossExpReward: 300,
            treasureChance: 0.4,
            lootItemCode: "SILVER_ORE"
        }
    ];
    for (const d of dungeons) {
        await prisma.dungeonTemplate.upsert({
            where: { name: d.name },
            update: d,
            create: d,
        });
    }
    console.log('✅ Seeding Complete!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
//# sourceMappingURL=seed.js.map