import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/textra_db?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHICAL";

interface ItemDef {
  code: string; name: string; emoji: string; rarityId: Rarity; type: string;
  equipSlot?: string; levelReq?: number; statAtk?: number; statDef?: number;
  statStr?: number; statAgi?: number; statInt?: number; statLuk?: number; statDex?: number;
  statHeal?: number; description?: string;
}

async function seedItem(item: ItemDef) {
  await prisma.itemTemplate.create({ data: item as any });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌌 COMPLETE REGISTRY SYNC — All items, bosses, dungeons...");

  await prisma.recipeIngredient.deleteMany();
  await prisma.craftingRecipe.deleteMany();
  await prisma.marketListing.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.lootTable.deleteMany();
  await prisma.resourceNodeTemplate.deleteMany();
  await prisma.monsterTemplate.deleteMany();
  await prisma.dungeonTemplate.deleteMany();
  await prisma.itemTemplate.deleteMany();
  await prisma.rarity.deleteMany();

  // ── RARITIES ────────────────────────────────────────────────────────────────
  for (const r of [
    { id: "COMMON",    name: "Common",    rank: 1, color: "#FFFFFF", dropRateModifier: 1.0,  hasGlow: false },
    { id: "UNCOMMON",  name: "Uncommon",  rank: 2, color: "#1EFF00", dropRateModifier: 0.8,  hasGlow: false },
    { id: "RARE",      name: "Rare",      rank: 3, color: "#0070DD", dropRateModifier: 0.5,  hasGlow: false },
    { id: "EPIC",      name: "Epic",      rank: 4, color: "#A335EE", dropRateModifier: 0.2,  hasGlow: true  },
    { id: "LEGENDARY", name: "Legendary", rank: 5, color: "#FF8000", dropRateModifier: 0.05, hasGlow: true  },
    { id: "MYTHICAL",  name: "Mythical",  rank: 6, color: "#E6CC80", dropRateModifier: 0.01, hasGlow: true  },
  ]) await prisma.rarity.create({ data: r });

  // ── MATERIALS (T1–T5, 5 types each = 25 items) ────────────────────────────
  console.log("🪵 Seeding 25 Gathering Materials...");
  const matTiers = [
    { t:1, r:"COMMON",    ore:"Iron",    wood:"Rough Log",  hide:"Scrappy Hide", fiber:"Hemp Fiber",   fish:"Carp"             },
    { t:2, r:"UNCOMMON",  ore:"Tin",     wood:"Birch Log",  hide:"Thin Hide",    fiber:"Flax Fiber",   fish:"Bass"             },
    { t:3, r:"RARE",      ore:"Copper",  wood:"Oak Log",    hide:"Thick Hide",   fiber:"Silk Fiber",   fish:"Salmon"           },
    { t:4, r:"EPIC",      ore:"Gold",    wood:"Maple Log",  hide:"Hard. Hide",   fiber:"Cotton Fiber", fish:"Tuna"             },
    { t:5, r:"LEGENDARY", ore:"Mithril", wood:"Yew Log",    hide:"Pristine Hide",fiber:"Mana Fiber",   fish:"Kraken Tentacle"  },
  ];
  for (const m of matTiers) {
    const P = { type: "MATERIAL", rarityId: m.r };
    await seedItem({ ...P, code:`${m.ore.replace(/ .*/,"").toUpperCase()}_ORE`,   name:`${m.ore} Ore`,      emoji:"🪨" } as any);
    await seedItem({ ...P, code:`T${m.t}_WOOD`, name:m.wood,          emoji:"🪵" } as any);
    await seedItem({ ...P, code:`T${m.t}_HIDE`, name:m.hide,          emoji:"👞" } as any);
    await seedItem({ ...P, code:`T${m.t}_FIBER`,name:m.fiber,         emoji:"🧵" } as any);
    await seedItem({ ...P, code:`T${m.t}_FISH`, name:m.fish,          emoji:"🐟" } as any);
  }

  // ── CONSUMABLES ────────────────────────────────────────────────────────────
  await seedItem({ code:"POTION_S", name:"Small Potion",  emoji:"🧪", rarityId:"COMMON", type:"CONSUMABLE", statHeal:50,  description:"Restores 50 HP."  });
  await seedItem({ code:"POTION_M", name:"Medium Potion", emoji:"🍶", rarityId:"RARE",   type:"CONSUMABLE", statHeal:150, description:"Restores 150 HP." });
  await seedItem({ code:"POTION_L", name:"Giga Potion",   emoji:"🏺", rarityId:"EPIC",   type:"CONSUMABLE", statHeal:500, description:"Restores 500 HP." });

  // ── CLASS EQUIPMENT — WARRIOR (T1–T5, 5 SLOTS EACH = 25 items) ──────────
  console.log("⚔️ Seeding Warrior, Archer, Mage Sets (75 items)...");
  const classSets = [
    {
      cls:"WARRIOR", stat:"statStr",
      tiers:[
        { t:1, r:"COMMON",    lvl:1,  pfx:"Trainee",  atk:8,   def:5,   pri:3,  luk:1,  desc:"Basic equipment issued to new recruits." },
        { t:2, r:"UNCOMMON",  lvl:13, pfx:"Iron",      atk:22,  def:16,  pri:8,  luk:3,  desc:"Forged from solid iron, reliable in battle." },
        { t:3, r:"RARE",      lvl:25, pfx:"Steel",     atk:50,  def:38,  pri:18, luk:6,  desc:"Tempered steel hardened in the forge\'s heart." },
        { t:4, r:"EPIC",      lvl:37, pfx:"Rune",      atk:95,  def:80,  pri:35, luk:10, desc:"Ancient runes inscribed to amplify strength." },
        { t:5, r:"LEGENDARY", lvl:50, pfx:"Dragon",    atk:220, def:180, pri:70, luk:18, desc:"Forged from the bones of a fallen dragon." },
      ],
      slots:["WEAPON","CHEST","HELMET","BOOTS","GLOVES"],
      emoji: { WEAPON:"⚔️", CHEST:"🛡️", HELMET:"🪖", BOOTS:"👢", GLOVES:"🧤" }
    },
    {
      cls:"ARCHER", stat:"statAgi",
      tiers:[
        { t:1, r:"COMMON",    lvl:1,  pfx:"Traper",  atk:7,   def:4,   pri:3,  luk:2,  desc:"Lightweight gear favored by forest scouts." },
        { t:2, r:"UNCOMMON",  lvl:13, pfx:"Hunter",  atk:20,  def:13,  pri:10, luk:5,  desc:"Crafted for speed and precision in the wild." },
        { t:3, r:"RARE",      lvl:25, pfx:"Sniper",  atk:45,  def:28,  pri:22, luk:10, desc:"Precision gear built for long-range lethality." },
        { t:4, r:"EPIC",      lvl:37, pfx:"Shadow",  atk:88,  def:60,  pri:40, luk:18, desc:"Cloaked in shadow, unseen by all enemies." },
        { t:5, r:"LEGENDARY", lvl:50, pfx:"Void",    atk:205, def:145, pri:80, luk:40, desc:"Woven from the fabric of the void itself." },
      ],
      slots:["WEAPON","CHEST","HELMET","BOOTS","GLOVES"],
      emoji: { WEAPON:"🏹", CHEST:"🧥", HELMET:"🪖", BOOTS:"👟", GLOVES:"🧤" }
    },
    {
      cls:"MAGE", stat:"statInt",
      tiers:[
        { t:1, r:"COMMON",    lvl:1,  pfx:"Novice",    atk:5,   def:3,   pri:5,  luk:3,  desc:"Simple robes worn by those just learning the arcane." },
        { t:2, r:"UNCOMMON",  lvl:13, pfx:"Student",   atk:16,  def:10,  pri:14, luk:6,  desc:"Equipment from the Academy, worn with pride." },
        { t:3, r:"RARE",      lvl:25, pfx:"Sorcerer",  atk:38,  def:22,  pri:28, luk:12, desc:"Infused with magical energy for a seasoned caster." },
        { t:4, r:"EPIC",      lvl:37, pfx:"Archmage",  atk:78,  def:48,  pri:50, luk:22, desc:"Reserved for those who have mastered the arcane arts." },
        { t:5, r:"LEGENDARY", lvl:50, pfx:"Celestial", atk:185, def:110, pri:90, luk:50, desc:"Channeled from the stars by the gods of magic." },
      ],
      slots:["WEAPON","CHEST","HELMET","BOOTS","GLOVES"],
      emoji: { WEAPON:"🧙", CHEST:"👘", HELMET:"🪖", BOOTS:"👞", GLOVES:"🧤" }
    },
  ];

  for (const c of classSets) {
    for (const td of c.tiers) {
      for (const slot of c.slots) {
        const isWeapon = slot === "WEAPON";
        const itemData: any = {
          code: `${c.cls}_T${td.t}_${slot}`,
          name: `${td.pfx} ${slot.charAt(0)+slot.slice(1).toLowerCase()}`,
          emoji: (c.emoji as any)[slot],
          rarityId: td.r as Rarity,
          type: "EQUIPMENT",
          equipSlot: slot,
          levelReq: td.lvl,
          statAtk: isWeapon ? td.atk : 0,
          statDef: !isWeapon ? td.def : 0,
          [c.stat]: td.pri,
          statLuk: td.luk,
          description: (td as any).desc
        };
        // Random unique stat bonuses (higher tiers get better chances)
        const uniqueChance = td.t * 0.15; // T1=15%, T5=75%
        if (Math.random() < uniqueChance) {
          const uniqueStats = ['statLifesteal', 'statThorns', 'statGoldBonus', 'statExpBonus', 'statMoveSpeed', 'statHpRegen'];
          const picked = uniqueStats[Math.floor(Math.random() * uniqueStats.length)];
          const value = Math.round((td.t * 0.5 + Math.random() * td.t) * 10) / 10;
          (itemData as Record<string, any>)[picked!] = value;
        }
        if (isWeapon) itemData.classType = c.cls;
        await seedItem(itemData);
      }
    }
  }

  // ── ACCESSORIES — CAPE, NECKLACE, RING (T1–T5, 3 slots = 15 items) ───────
  console.log("💍 Seeding 15 Hybrid Accessories...");
  const accNames: Record<string, string[]> = {
    CAPE: ["Ragged Cape", "Leather Cloak", "Warrior Mantle", "Shadow Mantle", "Aurelian Wings"],
    NECKLACE: ["Copper Amulet", "Ranger Charm", "Arcane Pendant", "Dragon Fang", "Void Eye"],
    RING: ["Wooden Band", "Iron Ring", "Gilded Ring", "Ruby Signet", "King's Seal"]
  };
  const accDescs: Record<string, string[]> = {
    CAPE:    ["A tattered cloth cape, better than nothing.", "A sturdy leather travel cloak.", "A warrior's thick battle mantle.", "Shadows cling to this dark cloak.", "Wings that shimmer with golden light."      ],
    NECKLACE:["A simple copper pendant.",                    "A charm favored by rangers.",               "A scholar's ornate arcane pendant.",       "An amulet carved from a dragon's fang.",    "An eye that peers into the void."            ],
    RING:    ["Carved from a sturdy oak branch.",            "A plain iron band, solid and honest.",       "Gold-plated with a fine gemstone.",        "A ruby signet ring of noble heritage.",     "The signet of an ancient king."               ],
  };
  const accSets = [
    { slot:"CAPE",     emoji:"🧣" },
    { slot:"NECKLACE", emoji:"📿" },
    { slot:"RING",     emoji:"💍" },
  ];
  for (const acc of accSets) {
    for (let t = 1; t <= 5; t++) {
      const r: Rarity = t <= 2 ? "UNCOMMON" : t === 3 ? "RARE" : t === 4 ? "EPIC" : "LEGENDARY";
      const v = t * 16;
      await seedItem({
        code: `ACC_${acc.slot}_T${t}`,
        name: accNames[acc.slot]![t-1],
        emoji: acc.emoji,
        rarityId: r,
        type: "EQUIPMENT",
        equipSlot: acc.slot,
        levelReq: (t - 1) * 12 + 5,
        statStr: Math.floor(v / 3),
        statAgi: Math.floor(v / 3),
        statInt: Math.floor(v / 3),
        statLuk: Math.floor(v / 4),
        statDef: acc.slot === "CAPE" ? t * 12 : 5,
        description: accDescs[acc.slot]![t-1]
      } as any);
    }
  }

  // ── MYTHICAL EXCLUSIVES — ALL 9 SLOTS COVERED (14 items) ────────────────
  console.log("💎 Seeding 14 Legendary Exclusives (Ultra-Rare)...");
  const mythicals: ItemDef[] = [
    // WEAPONS (4)
    { code:"EXCALIBUR",       name:"Excalibur",            emoji:"🗡️", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"WEAPON",   levelReq:50, statAtk:300, statStr:150, statDef:50,  statLuk:30,  description:"The legendary sword of kings."+              " Drop: World Bosses (0.01%)" },
    { code:"ARTEMIS_BOW",     name:"Artemis' Bow",          emoji:"🏹", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"WEAPON",   levelReq:50, statAtk:280, statAgi:150, statLuk:50,  description:"Blessed by the goddess of the hunt."+          " Drop: Elder Dragons (0.01%)" },
    { code:"MERLIN_STAFF",    name:"Staff of Merlin",       emoji:"🔮", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"WEAPON",   levelReq:50, statAtk:250, statInt:180, statLuk:80,  description:"The ancient archmage's conduit."+              " Drop: Arch-Liches (0.01%)" },
    { code:"CHAOS_BLADE",     name:"Chaos Blade",           emoji:"⚡", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"WEAPON",   levelReq:50, statAtk:200, statStr:50,  statAgi:50,  statInt:50, statLuk:50, description:"Forged in chaos."+                   " Drop: Chaos Demons (0.05%)" },
    // CHEST (3)
    { code:"AEGIS_PLATE",     name:"Plate of Aegis",        emoji:"🛡️", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"CHEST",    levelReq:50, statDef:300, statStr:80,  statLuk:40,  description:"Unbreakable divine plate."+                    " Drop: Mountain Giants (0.05%)" },
    { code:"CELESTIAL_ROBE",  name:"Celestial Robes",       emoji:"👘", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"CHEST",    levelReq:50, statDef:120, statInt:150, statLuk:100, description:"Woven from stardust."+                          " Drop: Celestial Beings (0.05%)" },
    { code:"SHADOW_GARB",     name:"Shadow Garb",           emoji:"🧥", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"CHEST",    levelReq:50, statDef:180, statAgi:120, statLuk:60,  description:"Crafted from absolute darkness."+               " Drop: Void Stalkers (0.05%)" },
    // HELMETS (2)
    { code:"CROWN_OF_GODS",   name:"Crown of Gods",         emoji:"👑", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"HELMET",   levelReq:50, statDef:100, statStr:80,  statAgi:80, statInt:80, statLuk:80, description:"Worn only by legends."+             " Drop: Mythic Raids (0.05%)" },
    { code:"GAZE_OF_VOID",    name:"Gaze of Void",          emoji:"🕶️", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"HELMET",   levelReq:50, statLuk:150, statAgi:50,  statInt:50,  description:"Reveals hidden truths."+                        " Drop: Void Creatures (0.1%)" },
    // GLOVES (2)
    { code:"MIDAS_TOUCH",     name:"Midas Touch",           emoji:"🧤", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"GLOVES",   levelReq:50, statLuk:200, statDef:50,  description:"Everything you touch turns to gold."+           " Drop: Golden Slimes (0.05%)" },
    { code:"DEATHS_GRIP",     name:"Death's Grip",          emoji:"🖤", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"GLOVES",   levelReq:50, statAtk:80,  statStr:50,  statLuk:30,  description:"The reaper's own gauntlets."+                   " Drop: Grim Reapers (0.1%)" },
    // BOOTS (2)
    { code:"HERMES_SANDALS",  name:"Sandals of Hermes",     emoji:"🌬️", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"BOOTS",    levelReq:50, statAgi:150, statLuk:20,  description:"Speed incarnate."+                              " Drop: Air Spirits (0.1%)" },
    { code:"MOUNTAIN_CRUSHERS",name:"Mountain Crushers",    emoji:"🏔️", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"BOOTS",    levelReq:50, statDef:100, statStr:50,  statLuk:15,  description:"Boots that crush stone."+                       " Drop: Stone Golems (0.1%)" },
    // ACCESSORIES (3)
    { code:"CALAMITY_RING",   name:"Calamity Ring",         emoji:"♾️", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"RING",     levelReq:50, statStr:100, statAgi:100, statInt:100, statLuk:100, description:"The ring of absolute power."+          " Drop: Dragon's Sanctum Boss (0.01%)" },
    { code:"PHOENIX_CAPE",    name:"Phoenix Feather Cape",  emoji:"🔥", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"CAPE",     levelReq:50, statDef:80,  statAgi:120, statLuk:50,  description:"Burns with eternal flame."+                     " Drop: Fire Dragons (0.05%)" },
    { code:"WRAITH_CAPE",     name:"Wraith-Thread Cape",    emoji:"👻", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"CAPE",     levelReq:50, statDef:100, statInt:100, statAgi:80,  description:"Sewn from the souls of the dead."+              " Drop: Lich Lord (0.05%)" },
    { code:"KINGS_SEAL",      name:"King's Seal",           emoji:"🏅", rarityId:"MYTHICAL", type:"EQUIPMENT", equipSlot:"RING",     levelReq:50, statStr:60,  statInt:60,  statAgi:60,  statLuk:40,  description:"The ring of sovereignty."+             " Drop: Royal Vaults (0.1%)" },
  ];
  for (const item of mythicals) await seedItem(item);

  // ── DUNGEONS (4 total with escalating difficulty) ─────────────────────────
  console.log("🏰 Seeding 4 Dungeons & Dungeon Monsters...");
  const dungDefs = [
    {
      name: "The Goblin Hive",
      minDepth: 100,
      maxDepth: 350,
      minLevel: 5,
      floors: 5,
      boss: "Goblin Shaman",
      bossHp: 1200,
      bossAtk: 80,
      bossDef: 50,
      exp: 6000,
      loot: "CHAOS_BLADE",
      treasure: 0.25,
      mobs: [
        { name: "Goblin Scout", hp: 300, atk: 40, def: 20, exp: 200, loot: "T1_FIBER" },
        { name: "Goblin Warrior", hp: 500, atk: 60, def: 30, exp: 350, loot: "IRON_ORE" }
      ]
    },
    {
      name: "Abandoned Mine",
      minDepth: 400,
      maxDepth: 800,
      minLevel: 20,
      floors: 8,
      boss: "Elder Miner",
      bossHp: 4000,
      bossAtk: 250,
      bossDef: 180,
      exp: 20000,
      loot: "MOUNTAIN_CRUSHERS",
      treasure: 0.20,
      mobs: [
        { name: "Cave Bat", hp: 800, atk: 100, def: 50, exp: 800, loot: "T2_HIDE" },
        { name: "Zombie Miner", hp: 1500, atk: 150, def: 90, exp: 1500, loot: "TIN_ORE" }
      ]
    },
    {
      name: "The Lost Crypt",
      minDepth: 900,
      maxDepth: 1500,
      minLevel: 35,
      floors: 12,
      boss: "Lich Lord",
      bossHp: 12000,
      bossAtk: 800,
      bossDef: 500,
      exp: 60000,
      loot: "WRAITH_CAPE",
      treasure: 0.15,
      mobs: [
        { name: "Crypt Skeleton", hp: 3000, atk: 350, def: 200, exp: 5000, loot: "COPPER_ORE" },
        { name: "Crypt Wraith", hp: 5000, atk: 500, def: 300, exp: 8000, loot: "T3_FIBER" }
      ]
    },
    {
      name: "Dragon's Sanctum",
      minDepth: 2000,
      maxDepth: null,
      minLevel: 50,
      floors: 20,
      boss: "Ancient Fire Dragon",
      bossHp: 80000,
      bossAtk: 5000,
      bossDef: 3000,
      exp: 500000,
      loot: "CALAMITY_RING",
      treasure: 0.10,
      mobs: [
        { name: "Sanctum Dragonkin", hp: 15000, atk: 1500, def: 1000, exp: 40000, loot: "GOLD_ORE" },
        { name: "Sanctum Cultist", hp: 20000, atk: 2000, def: 1200, exp: 60000, loot: "T4_FIBER" }
      ]
    },
  ];
  for (const d of dungDefs) {
    // 1. Create Dungeon Template
    const dungeon = await prisma.dungeonTemplate.create({ data: {
      name: d.name,
      description: `Venture deep into ${d.name}.`,
      minDepth: d.minDepth,
      maxDepth: d.maxDepth,
      minLevel: d.minLevel,
      floorCount: d.floors,
      treasureChance: d.treasure
    }});

    // 2. Create Boss Monster
    const bossMonster = await prisma.monsterTemplate.create({ data: {
      name: d.boss,
      hp: d.bossHp,
      attack: d.bossAtk,
      defense: d.bossDef,
      expReward: d.exp,
      isBoss: true,
      dungeonId: dungeon.id,
      minDepth: d.minDepth
    }});

    // 3. Boss Loot Table Entry (100% chance to drop exclusive mythical)
    await prisma.lootTable.create({ data: {
      monsterTemplateId: bossMonster.id,
      itemCode: d.loot,
      chance: 1.0,
      minQuantity: 1,
      maxQuantity: 1
    }});

    // 4. Create Regular Mobs for the dungeon
    for (const mob of d.mobs) {
      const mobMonster = await prisma.monsterTemplate.create({ data: {
        name: mob.name,
        hp: mob.hp,
        attack: mob.atk,
        defense: mob.def,
        expReward: mob.exp,
        isBoss: false,
        dungeonId: dungeon.id,
        minDepth: d.minDepth
      }});

      // Mob loot
      await prisma.lootTable.create({ data: {
        monsterTemplateId: mobMonster.id,
        itemCode: mob.loot,
        chance: 0.5,
        minQuantity: 1,
        maxQuantity: 2
      }});
    }
  }

  // ── WORLD MONSTERS (20 types, each with specific loot) ───────────────────
  console.log("🐺 Seeding 20 World Monsters...");
  const monsterDefs = [
    // Normal Monsters (common materials drop) — Name, HP, ATK, DEF, EXP, Gold, Depth, Loot
    { name:"Forest Slime",      hp:60,    atk:8,    def:3,    exp:20,    gold:5,    minDepth:0,    loot:[{ item:"T1_FIBER", chance:0.7, min:1, max:3 }] },
    { name:"Dire Wolf",         hp:200,   atk:30,   def:15,   exp:100,   gold:25,   minDepth:150,  loot:[{ item:"T2_HIDE",  chance:0.6, min:1, max:2 }] },
    { name:"Skeleton Warrior",  hp:350,   atk:55,   def:30,   exp:200,   gold:50,   minDepth:350,  loot:[{ item:"IRON_ORE", chance:0.5, min:2, max:5 }] },
    { name:"Crypt Spider",      hp:280,   atk:65,   def:20,   exp:180,   gold:45,   minDepth:500,  loot:[{ item:"T2_FIBER", chance:0.6, min:1, max:3 }] },
    { name:"Minotaur",          hp:800,   atk:120,  def:80,   exp:500,   gold:120,  minDepth:750,  loot:[{ item:"T3_HIDE",  chance:0.5, min:1, max:2 }] },
    { name:"Sea Serpent",       hp:600,   atk:100,  def:60,   exp:450,   gold:100,  minDepth:1000, loot:[{ item:"T3_FISH",  chance:0.6, min:1, max:3 }] },
    { name:"Golem",             hp:1200,  atk:180,  def:160,  exp:900,   gold:200,  minDepth:1250, loot:[{ item:"COPPER_ORE",chance:0.5,min:2, max:4 }] },
    { name:"Dark Mage",         hp:900,   atk:200,  def:80,   exp:800,   gold:180,  minDepth:1500, loot:[{ item:"T3_FIBER", chance:0.5, min:1, max:2 }, { item:"POTION_M", chance:0.3, min:1, max:1 }] },
    { name:"Wyvern",            hp:2500,  atk:350,  def:280,  exp:2000,  gold:450,  minDepth:1800, loot:[{ item:"T4_HIDE",  chance:0.4, min:1, max:2 }] },
    { name:"Vampire Lord",      hp:3500,  atk:500,  def:350,  exp:3000,  gold:700,  minDepth:2200, loot:[{ item:"T4_FIBER", chance:0.4, min:1, max:2 }, { item:"POTION_L", chance:0.2, min:1, max:1 }] },
    // Elite Monsters (exclusive legendary drops)
    { name:"Golden Slime",      hp:200,   atk:10,   def:800,  exp:6000,  gold:5000, minDepth:500,  loot:[{ item:"IRON_ORE",       chance:0.8, min:3, max:8 }, { item:"MIDAS_TOUCH",      chance:0.005, min:1, max:1 }] },
    { name:"Grim Reaper",       hp:8000,  atk:1200, def:800,  exp:20000, gold:4000, minDepth:2500, loot:[{ item:"T5_HIDE",        chance:0.3, min:1, max:2 }, { item:"DEATHS_GRIP",       chance:0.01,  min:1, max:1 }] },
    { name:"Air Spirit",        hp:5000,  atk:900,  def:500,  exp:15000, gold:3000, minDepth:3000, loot:[{ item:"T4_FIBER",       chance:0.4, min:1, max:2 }, { item:"HERMES_SANDALS",    chance:0.01,  min:1, max:1 }] },
    { name:"Stone Golem",       hp:7000,  atk:800,  def:1200, exp:22000, gold:5000, minDepth:3500, loot:[{ item:"MITHRIL_ORE",    chance:0.3, min:1, max:3 }, { item:"MOUNTAIN_CRUSHERS", chance:0.01,  min:1, max:1 }] },
    { name:"Chaos Demon",       hp:9000,  atk:1800, def:900,  exp:35000, gold:8000, minDepth:4000, loot:[{ item:"T5_FIBER",       chance:0.3, min:1, max:2 }, { item:"CHAOS_BLADE",       chance:0.005, min:1, max:1 }] },
    { name:"Void Stalker",      hp:8500,  atk:1600, def:1000, exp:32000, gold:7000, minDepth:4500, loot:[{ item:"T5_HIDE",        chance:0.3, min:1, max:2 }, { item:"SHADOW_GARB",       chance:0.005, min:1, max:1 }] },
    { name:"Arch-Lich",         hp:12000, atk:2500, def:1200, exp:60000, gold:12000,minDepth:5000, loot:[{ item:"T5_FIBER",       chance:0.2, min:1, max:2 }, { item:"MERLIN_STAFF",      chance:0.001, min:1, max:1 }] },
    { name:"Void Creature",     hp:10000, atk:2000, def:1000, exp:45000, gold:10000,minDepth:5500, loot:[{ item:"T5_HIDE",        chance:0.2, min:1, max:2 }, { item:"GAZE_OF_VOID",      chance:0.01,  min:1, max:1 }] },
    { name:"Fire Dragon",       hp:15000, atk:2800, def:1800, exp:80000, gold:20000,minDepth:6000, loot:[{ item:"T5_HIDE",        chance:0.2, min:1, max:2 }, { item:"PHOENIX_CAPE",      chance:0.001, min:1, max:1 }] },
    { name:"Elder Dragon",      hp:20000, atk:3500, def:2500, exp:120000,gold:30000,minDepth:7000, loot:[{ item:"T5_HIDE",        chance:0.2, min:1, max:2 }, { item:"ARTEMIS_BOW",       chance:0.001, min:1, max:1 }] },
  ];

  for (const m of monsterDefs) {
    const mt = await prisma.monsterTemplate.create({ data: { name:m.name, hp:m.hp, attack:m.atk, defense:m.def, expReward:m.exp, goldReward:m.gold, minDepth:m.minDepth } });
    for (const l of m.loot) {
      await prisma.lootTable.create({ data: { monsterTemplateId:mt.id, itemCode:l.item, chance:l.chance, minQuantity:l.min, maxQuantity:l.max } });
    }
  }

  // ── RESOURCE NODES ────────────────────────────────────────────────────────
  console.log("⛏️ Seeding Resource Nodes...");
  const nodes = [
    { name:"Iron Outcrop",  type:"Mining",      icon:"🪨", hp:25, loot:[{ item:"IRON_ORE", c:0.85, min:2, max:5 }] },
    { name:"Tin Vein",      type:"Mining",      icon:"💎", hp:40, loot:[{ item:"TIN_ORE",  c:0.70, min:1, max:3 }] },
    { name:"Copper Vein",   type:"Mining",      icon:"🏺", hp:55, loot:[{ item:"COPPER_ORE",c:0.60, min:1, max:3 }] },
    { name:"Gold Vein",     type:"Mining",      icon:"🎇", hp:70, loot:[{ item:"GOLD_ORE", c:0.50, min:1, max:2 }] },
    { name:"Mithril Vein",  type:"Mining",      icon:"🌌", hp:90, loot:[{ item:"MITHRIL_ORE",c:0.35,min:1, max:2 }] },
    { name:"Rough Pine",    type:"Woodcutting", icon:"🪵", hp:30, loot:[{ item:"T1_WOOD",  c:0.80, min:2, max:5 }] },
    { name:"Birch Tree",    type:"Woodcutting", icon:"🌲", hp:45, loot:[{ item:"T2_WOOD",  c:0.70, min:1, max:3 }] },
    { name:"Old Oak",       type:"Woodcutting", icon:"🌳", hp:60, loot:[{ item:"T3_WOOD",  c:0.60, min:1, max:3 }, { item:"T2_WOOD", c:0.3, min:1, max:1 }] },
    { name:"Maple Grove",   type:"Woodcutting", icon:"🍂", hp:75, loot:[{ item:"T4_WOOD",  c:0.50, min:1, max:2 }] },
    { name:"Yew Tree",      type:"Woodcutting", icon:"🏹", hp:95, loot:[{ item:"T5_WOOD",  c:0.35, min:1, max:2 }] },
    { name:"Hemp Field",    type:"Harvesting",  icon:"🌿", hp:20, loot:[{ item:"T1_FIBER", c:0.80, min:2, max:5 }] },
    { name:"Flax Patch",    type:"Harvesting",  icon:"🌾", hp:30, loot:[{ item:"T2_FIBER", c:0.70, min:1, max:3 }] },
    { name:"Silk Nest",     type:"Harvesting",  icon:"🕸️", hp:40, loot:[{ item:"T3_FIBER", c:0.60, min:1, max:3 }] },
    { name:"Cotton Shrub",  type:"Harvesting",  icon:"☁️", hp:55, loot:[{ item:"T4_FIBER", c:0.50, min:1, max:2 }] },
    { name:"Mana Bloom",    type:"Harvesting",  icon:"✨", hp:75, loot:[{ item:"T5_FIBER", c:0.35, min:1, max:2 }] },
    { name:"Fishing Hole",  type:"Fishing",     icon:"🎣", hp:10, loot:[{ item:"T1_FISH",  c:0.75, min:1, max:3 }, { item:"T2_FISH", c:0.25, min:1, max:1 }] },
    { name:"Open Lake",     type:"Fishing",     icon:"🏞️", hp:15, loot:[{ item:"T2_FISH",  c:0.70, min:1, max:3 }, { item:"T3_FISH", c:0.20, min:1, max:1 }] },
    { name:"River Rapids",  type:"Fishing",     icon:"🌊", hp:20, loot:[{ item:"T3_FISH",  c:0.65, min:1, max:2 }, { item:"T4_FISH", c:0.15, min:1, max:1 }] },
    { name:"Ocean Pier",    type:"Fishing",     icon:"⚓", hp:25, loot:[{ item:"T4_FISH",  c:0.55, min:1, max:2 }, { item:"T5_FISH", c:0.10, min:1, max:1 }] },
    { name:"Abyssal Trench",type:"Fishing",     icon:"🐙", hp:40, loot:[{ item:"T5_FISH",  c:0.40, min:1, max:2 }] },
  ];
  for (const n of nodes) {
    const nt = await prisma.resourceNodeTemplate.create({ data:{ name:n.name, type:n.type, icon:n.icon, baseHp:n.hp } });
    for (const l of n.loot) {
      await prisma.lootTable.create({ data:{ resourceNodeTemplateId:nt.id, itemCode:l.item, chance:l.c, minQuantity:l.min, maxQuantity:l.max } });
    }
  }

  // ── CRAFTING RECIPES (93 total) ───────────────────────────────────────────
  console.log("⚒️ Seeding 93 Crafting Recipes...");
  const recipes = [
    // POTIONS
    { result:"POTION_S", lvl:1,  ing:[{ code:"T1_FIBER", qty:3 }] },
    { result:"POTION_M", lvl:20, ing:[{ code:"T2_FIBER", qty:5 }, { code:"T2_FISH", qty:2 }] },
    { result:"POTION_L", lvl:40, ing:[{ code:"T5_FIBER", qty:3 }, { code:"T5_FISH", qty:1 }] },
    // WARRIOR T1
    { result:"WARRIOR_T1_WEAPON", lvl:1,  ing:[{ code:"IRON_ORE", qty:5 }] },
    { result:"WARRIOR_T1_CHEST",  lvl:1,  ing:[{ code:"IRON_ORE", qty:8  }, { code:"T1_HIDE", qty:3 }] },
    { result:"WARRIOR_T1_HELMET", lvl:1,  ing:[{ code:"IRON_ORE", qty:6  }, { code:"T1_HIDE", qty:2 }] },
    { result:"WARRIOR_T1_BOOTS",  lvl:1,  ing:[{ code:"IRON_ORE", qty:5  }, { code:"T1_HIDE", qty:2 }] },
    { result:"WARRIOR_T1_GLOVES", lvl:1,  ing:[{ code:"IRON_ORE", qty:4  }, { code:"T1_HIDE", qty:2 }] },
    // WARRIOR T2
    { result:"WARRIOR_T2_WEAPON", lvl:13, ing:[{ code:"TIN_ORE", qty:10 }, { code:"T2_WOOD", qty:3 }] },
    { result:"WARRIOR_T2_CHEST",  lvl:13, ing:[{ code:"TIN_ORE", qty:15 }, { code:"T2_HIDE", qty:5 }] },
    { result:"WARRIOR_T2_HELMET", lvl:13, ing:[{ code:"TIN_ORE", qty:10 }, { code:"T2_HIDE", qty:3 }] },
    { result:"WARRIOR_T2_BOOTS",  lvl:13, ing:[{ code:"TIN_ORE", qty:8  }, { code:"T2_HIDE", qty:3 }] },
    { result:"WARRIOR_T2_GLOVES", lvl:13, ing:[{ code:"TIN_ORE", qty:8  }, { code:"T2_HIDE", qty:2 }] },
    // WARRIOR T3
    { result:"WARRIOR_T3_WEAPON", lvl:25, ing:[{ code:"COPPER_ORE", qty:12 }, { code:"T3_WOOD", qty:4 }] },
    { result:"WARRIOR_T3_CHEST",  lvl:25, ing:[{ code:"COPPER_ORE", qty:20 }, { code:"T3_HIDE", qty:8 }] },
    { result:"WARRIOR_T3_HELMET", lvl:25, ing:[{ code:"COPPER_ORE", qty:14 }, { code:"T3_HIDE", qty:5 }] },
    { result:"WARRIOR_T3_BOOTS",  lvl:25, ing:[{ code:"COPPER_ORE", qty:12 }, { code:"T3_HIDE", qty:4 }] },
    { result:"WARRIOR_T3_GLOVES", lvl:25, ing:[{ code:"COPPER_ORE", qty:10 }, { code:"T3_HIDE", qty:4 }] },
    // WARRIOR T4
    { result:"WARRIOR_T4_WEAPON", lvl:37, ing:[{ code:"GOLD_ORE", qty:15 }, { code:"T4_WOOD", qty:5 }] },
    { result:"WARRIOR_T4_CHEST",  lvl:37, ing:[{ code:"GOLD_ORE", qty:25 }, { code:"T4_HIDE", qty:10 }] },
    { result:"WARRIOR_T4_HELMET", lvl:37, ing:[{ code:"GOLD_ORE", qty:18 }, { code:"T4_HIDE", qty:6 }] },
    { result:"WARRIOR_T4_BOOTS",  lvl:37, ing:[{ code:"GOLD_ORE", qty:15 }, { code:"T4_HIDE", qty:5 }] },
    { result:"WARRIOR_T4_GLOVES", lvl:37, ing:[{ code:"GOLD_ORE", qty:12 }, { code:"T4_HIDE", qty:5 }] },
    // WARRIOR T5
    { result:"WARRIOR_T5_WEAPON", lvl:50, ing:[{ code:"MITHRIL_ORE", qty:20 }, { code:"T5_WOOD", qty:6 }, { code:"T5_HIDE", qty:5 }] },
    { result:"WARRIOR_T5_CHEST",  lvl:50, ing:[{ code:"MITHRIL_ORE", qty:30 }, { code:"T5_HIDE", qty:12 }] },
    { result:"WARRIOR_T5_HELMET", lvl:50, ing:[{ code:"MITHRIL_ORE", qty:22 }, { code:"T5_HIDE", qty:8 }] },
    { result:"WARRIOR_T5_BOOTS",  lvl:50, ing:[{ code:"MITHRIL_ORE", qty:18 }, { code:"T5_HIDE", qty:7 }] },
    { result:"WARRIOR_T5_GLOVES", lvl:50, ing:[{ code:"MITHRIL_ORE", qty:16 }, { code:"T5_HIDE", qty:6 }] },
    // ARCHER T1
    { result:"ARCHER_T1_WEAPON",  lvl:1,  ing:[{ code:"T1_WOOD", qty:8 },  { code:"T1_FIBER", qty:5 }] },
    { result:"ARCHER_T1_CHEST",   lvl:1,  ing:[{ code:"T1_HIDE", qty:10 }, { code:"T1_FIBER", qty:3 }] },
    { result:"ARCHER_T1_HELMET",  lvl:1,  ing:[{ code:"T1_HIDE", qty:6 },  { code:"T1_FIBER", qty:2 }] },
    { result:"ARCHER_T1_BOOTS",   lvl:1,  ing:[{ code:"T1_HIDE", qty:5 },  { code:"T1_WOOD",  qty:2 }] },
    { result:"ARCHER_T1_GLOVES",  lvl:1,  ing:[{ code:"T1_HIDE", qty:4 },  { code:"T1_FIBER", qty:2 }] },
    // ARCHER T2
    { result:"ARCHER_T2_WEAPON",  lvl:13, ing:[{ code:"T2_WOOD", qty:12 }, { code:"T2_FIBER", qty:5 }] },
    { result:"ARCHER_T2_CHEST",   lvl:13, ing:[{ code:"T2_HIDE", qty:10 }, { code:"T2_FIBER", qty:5 }] },
    { result:"ARCHER_T2_HELMET",  lvl:13, ing:[{ code:"T2_HIDE", qty:8 },  { code:"T2_FIBER", qty:3 }] },
    { result:"ARCHER_T2_BOOTS",   lvl:13, ing:[{ code:"T2_HIDE", qty:7 },  { code:"T2_WOOD",  qty:3 }] },
    { result:"ARCHER_T2_GLOVES",  lvl:13, ing:[{ code:"T2_HIDE", qty:6 },  { code:"T2_FIBER", qty:3 }] },
    // ARCHER T3
    { result:"ARCHER_T3_WEAPON",  lvl:25, ing:[{ code:"T3_WOOD", qty:15 }, { code:"T3_FIBER", qty:6 }] },
    { result:"ARCHER_T3_CHEST",   lvl:25, ing:[{ code:"T3_HIDE", qty:14 }, { code:"T3_FIBER", qty:6 }] },
    { result:"ARCHER_T3_HELMET",  lvl:25, ing:[{ code:"T3_HIDE", qty:10 }, { code:"T3_FIBER", qty:4 }] },
    { result:"ARCHER_T3_BOOTS",   lvl:25, ing:[{ code:"T3_HIDE", qty:9 },  { code:"T3_WOOD",  qty:4 }] },
    { result:"ARCHER_T3_GLOVES",  lvl:25, ing:[{ code:"T3_HIDE", qty:8 },  { code:"T3_FIBER", qty:4 }] },
    // ARCHER T4
    { result:"ARCHER_T4_WEAPON",  lvl:37, ing:[{ code:"T4_WOOD", qty:18 }, { code:"T4_FIBER", qty:8 }, { code:"T4_HIDE", qty:4 }] },
    { result:"ARCHER_T4_CHEST",   lvl:37, ing:[{ code:"T4_HIDE", qty:18 }, { code:"T4_FIBER", qty:8 }] },
    { result:"ARCHER_T4_HELMET",  lvl:37, ing:[{ code:"T4_HIDE", qty:12 }, { code:"T4_FIBER", qty:5 }] },
    { result:"ARCHER_T4_BOOTS",   lvl:37, ing:[{ code:"T4_HIDE", qty:10 }, { code:"T4_WOOD",  qty:5 }] },
    { result:"ARCHER_T4_GLOVES",  lvl:37, ing:[{ code:"T4_HIDE", qty:9 },  { code:"T4_FIBER", qty:5 }] },
    // ARCHER T5
    { result:"ARCHER_T5_WEAPON",  lvl:50, ing:[{ code:"T5_WOOD", qty:22 }, { code:"T5_FIBER", qty:10 }, { code:"MITHRIL_ORE", qty:5 }] },
    { result:"ARCHER_T5_CHEST",   lvl:50, ing:[{ code:"T5_HIDE", qty:22 }, { code:"T5_FIBER", qty:10 }] },
    { result:"ARCHER_T5_HELMET",  lvl:50, ing:[{ code:"T5_HIDE", qty:16 }, { code:"T5_FIBER", qty:7 }] },
    { result:"ARCHER_T5_BOOTS",   lvl:50, ing:[{ code:"T5_HIDE", qty:14 }, { code:"T5_WOOD",  qty:6 }] },
    { result:"ARCHER_T5_GLOVES",  lvl:50, ing:[{ code:"T5_HIDE", qty:12 }, { code:"T5_FIBER", qty:6 }] },
    // MAGE T1
    { result:"MAGE_T1_WEAPON",    lvl:1,  ing:[{ code:"T1_WOOD",  qty:5 },  { code:"T1_FIBER", qty:3 }] },
    { result:"MAGE_T1_CHEST",     lvl:1,  ing:[{ code:"T1_FIBER", qty:12 }] },
    { result:"MAGE_T1_HELMET",    lvl:1,  ing:[{ code:"T1_FIBER", qty:8 },  { code:"T1_WOOD",  qty:2 }] },
    { result:"MAGE_T1_BOOTS",     lvl:1,  ing:[{ code:"T1_FIBER", qty:7 },  { code:"T1_HIDE",  qty:2 }] },
    { result:"MAGE_T1_GLOVES",    lvl:1,  ing:[{ code:"T1_FIBER", qty:6 }] },
    // MAGE T2 (FIXED: T2_FIBER, not T3_FIBER)
    { result:"MAGE_T2_WEAPON",    lvl:13, ing:[{ code:"T2_WOOD",  qty:8 },  { code:"T2_FIBER", qty:5 }] },
    { result:"MAGE_T2_CHEST",     lvl:13, ing:[{ code:"T2_FIBER", qty:15 }] },
    { result:"MAGE_T2_HELMET",    lvl:13, ing:[{ code:"T2_FIBER", qty:10 }, { code:"T2_WOOD",  qty:2 }] },
    { result:"MAGE_T2_BOOTS",     lvl:13, ing:[{ code:"T2_FIBER", qty:8 },  { code:"T2_HIDE",  qty:3 }] },
    { result:"MAGE_T2_GLOVES",    lvl:13, ing:[{ code:"T2_FIBER", qty:8 }] },
    // MAGE T3
    { result:"MAGE_T3_WEAPON",    lvl:25, ing:[{ code:"T3_WOOD",  qty:10 }, { code:"T3_FIBER", qty:8 }] },
    { result:"MAGE_T3_CHEST",     lvl:25, ing:[{ code:"T3_FIBER", qty:20 }, { code:"T3_FISH",  qty:3 }] },
    { result:"MAGE_T3_HELMET",    lvl:25, ing:[{ code:"T3_FIBER", qty:14 }, { code:"T3_WOOD",  qty:3 }] },
    { result:"MAGE_T3_BOOTS",     lvl:25, ing:[{ code:"T3_FIBER", qty:12 }, { code:"T3_HIDE",  qty:4 }] },
    { result:"MAGE_T3_GLOVES",    lvl:25, ing:[{ code:"T3_FIBER", qty:10 }] },
    // MAGE T4
    { result:"MAGE_T4_WEAPON",    lvl:37, ing:[{ code:"T4_WOOD",  qty:12 }, { code:"T4_FIBER", qty:10 }, { code:"GOLD_ORE", qty:5 }] },
    { result:"MAGE_T4_CHEST",     lvl:37, ing:[{ code:"T4_FIBER", qty:25 }, { code:"T4_FISH",  qty:4 }] },
    { result:"MAGE_T4_HELMET",    lvl:37, ing:[{ code:"T4_FIBER", qty:18 }, { code:"T4_WOOD",  qty:4 }] },
    { result:"MAGE_T4_BOOTS",     lvl:37, ing:[{ code:"T4_FIBER", qty:15 }, { code:"T4_HIDE",  qty:5 }] },
    { result:"MAGE_T4_GLOVES",    lvl:37, ing:[{ code:"T4_FIBER", qty:14 }] },
    // MAGE T5
    { result:"MAGE_T5_WEAPON",    lvl:50, ing:[{ code:"T5_WOOD",  qty:15 }, { code:"T5_FIBER", qty:15 }, { code:"MITHRIL_ORE", qty:5 }] },
    { result:"MAGE_T5_CHEST",     lvl:50, ing:[{ code:"T5_FIBER", qty:30 }, { code:"T5_FISH",  qty:5 }] },
    { result:"MAGE_T5_HELMET",    lvl:50, ing:[{ code:"T5_FIBER", qty:22 }, { code:"T5_WOOD",  qty:5 }] },
    { result:"MAGE_T5_BOOTS",     lvl:50, ing:[{ code:"T5_FIBER", qty:18 }, { code:"T5_HIDE",  qty:6 }] },
    { result:"MAGE_T5_GLOVES",    lvl:50, ing:[{ code:"T5_FIBER", qty:16 }] },
    // ACCESSORIES T1-T5
    { result:"ACC_CAPE_T1",     lvl:5,  ing:[{ code:"T1_HIDE",    qty:6 },  { code:"T1_FIBER",    qty:4 }] },
    { result:"ACC_NECKLACE_T1", lvl:5,  ing:[{ code:"T1_FIBER",   qty:8 }] },
    { result:"ACC_RING_T1",     lvl:5,  ing:[{ code:"T1_WOOD",    qty:5 }] },
    { result:"ACC_CAPE_T2",     lvl:17, ing:[{ code:"T2_HIDE",    qty:8 },  { code:"T2_FIBER",    qty:5 }] },
    { result:"ACC_NECKLACE_T2", lvl:17, ing:[{ code:"T2_FIBER",   qty:12 }, { code:"TIN_ORE",     qty:3 }] },
    { result:"ACC_RING_T2",     lvl:17, ing:[{ code:"TIN_ORE",    qty:5 },  { code:"T2_WOOD",     qty:3 }] },
    { result:"ACC_CAPE_T3",     lvl:29, ing:[{ code:"T3_HIDE",    qty:10 }, { code:"T3_FIBER",    qty:6 }] },
    { result:"ACC_NECKLACE_T3", lvl:29, ing:[{ code:"T3_FIBER",   qty:15 }, { code:"COPPER_ORE",  qty:5 }] },
    { result:"ACC_RING_T3",     lvl:29, ing:[{ code:"COPPER_ORE", qty:8 },  { code:"T3_FISH",     qty:2 }] },
    { result:"ACC_CAPE_T4",     lvl:41, ing:[{ code:"T4_HIDE",    qty:14 }, { code:"T4_FIBER",    qty:8 }] },
    { result:"ACC_NECKLACE_T4", lvl:41, ing:[{ code:"T4_FIBER",   qty:20 }, { code:"GOLD_ORE",    qty:8 }] },
    { result:"ACC_RING_T4",     lvl:41, ing:[{ code:"GOLD_ORE",   qty:12 }, { code:"T4_FISH",     qty:3 }] },
    { result:"ACC_CAPE_T5",     lvl:50, ing:[{ code:"T5_HIDE",    qty:18 }, { code:"T5_FIBER",    qty:10 }] },
    { result:"ACC_NECKLACE_T5", lvl:50, ing:[{ code:"T5_FIBER",   qty:25 }, { code:"MITHRIL_ORE", qty:8 }] },
    { result:"ACC_RING_T5",     lvl:50, ing:[{ code:"MITHRIL_ORE",qty:15 }, { code:"T5_FISH",     qty:5 }] },
  ];
  for (const r of recipes) {
    const cr = await prisma.craftingRecipe.create({ data:{ resultItemCode:r.result, levelReq:r.lvl } });
    for (const i of r.ing) await prisma.recipeIngredient.create({ data:{ recipeId:cr.id, itemCode:i.code, quantity:i.qty } });
  }

  // ── WORLD ZONES ───────────────────
  console.log("🗺️ Seeding World Zones...");
  const zones = [
    {
      name: "Valoria Outskirts",
      minDepth: 0,
      maxDepth: 100,
      dangerMultiplier: 1.0,
      expMultiplier: 1.0,
      dropChanceMultiplier: 1.0,
      commonNodeTypes: ["WOOD", "FISHING"],
      excludedNodeTypes: ["MITHRIL_ORE", "GOLD_ORE"]
    },
    {
      name: "Whispering Woods",
      minDepth: 101,
      maxDepth: 300,
      dangerMultiplier: 1.2,
      expMultiplier: 1.2,
      dropChanceMultiplier: 1.1,
      commonNodeTypes: ["WOOD", "FIBER"],
      excludedNodeTypes: ["MITHRIL_ORE"]
    },
    {
      name: "Deepstone Caves",
      minDepth: 301,
      maxDepth: 600,
      dangerMultiplier: 1.5,
      expMultiplier: 1.5,
      dropChanceMultiplier: 1.3,
      commonNodeTypes: ["ORE"],
      excludedNodeTypes: ["WOOD"]
    },
    {
      name: "Scorched Wastes",
      minDepth: 601,
      maxDepth: 900,
      dangerMultiplier: 2.0,
      expMultiplier: 2.0,
      dropChanceMultiplier: 1.6,
      commonNodeTypes: ["ORE", "FIBER"],
      excludedNodeTypes: ["WOOD"]
    },
    {
      name: "Dragon's Lair",
      minDepth: 901,
      maxDepth: 99999,
      dangerMultiplier: 3.0,
      expMultiplier: 3.0,
      dropChanceMultiplier: 2.2,
      commonNodeTypes: ["ORE"],
      excludedNodeTypes: ["WOOD", "FISHING"]
    }
  ];

  for (const z of zones) {
    await prisma.zone.upsert({
      where: { name: z.name },
      update: z,
      create: z
    });
  }

  console.log("✅ COMPLETE — Materials:25 | Equipment:75 | Accessories:15 | Mythicals:17 | Monsters:20 | Dungeons:4 | Nodes:20 | Recipes:93 | Zones:5");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
