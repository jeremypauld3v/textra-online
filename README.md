# **Game Design Document & Technical Specification**

## **1\. Project Overview**

- **Genre:** Mobile Text-Based 2D MMORPG / Auto-Battler
- **Platform:** React Native (Expo Go \- strictly no custom native code)
- **Theme:** Fantasy RPG (Gathering, Crafting, Dungeons, PvP)
- **Visual Style:** UI-heavy, text-driven, 2D sprite placeholders, Dark/Light Mode support.

## ---

**2\. Tech Stack & Architecture**

### **Frontend (Mobile App)**

- **Framework:** React Native (via Expo Go)
- **Styling:** NativeWind (Tailwind CSS for React Native) with Dark/Light mode support.
- **State Management:** Zustand (for client-side inventory, stats, and UI state).

### **Backend (Server & Multiplayer)**

- **API Framework:** Fastify.js (for high-throughput REST endpoints).
- **Database:** PostgreSQL (relational database for strict transactional integrity).
- **ORM:** Prisma (for type-safe database access and schema management).
- **Real-time Communication:** WebSockets (for chat, 1:1 trades, and live PvP/PvE encounters).
- **Caching/Matchmaking:** Redis (for real-time tracking of player locations, encounters, and sessions).
- **Background Jobs:** BullMQ via Redis (for secure, server-side processing of travel timers).
- **Authentication:** JWT (JSON Web Tokens).

## ---

**3\. User Interface & Navigation**

### **3.1 Authentication Screen**

- **Inputs:** Email, Password.
- **Actions:** Sign In, Sign Up.
- **Toggles:** Dark/Light Mode.

### **3.2 Main Bottom Navigation**

- **Inventory:** Grid or list displaying all looted items, categorized (e.g., Equipment, Consumables, Materials).
- **Character:** Displays current level (Cap: 100), EXP, and core stats (STR, AGI, DEX, LUK, INT). Includes UI for stat point allocation.
- **Adventure:** The World Map and exploration hub.
- **Social:** 1:1 Friends list, Direct Messaging, World Chat, and 1:1 Trade requests.
- **Marketplace:** Global asynchronous trading system (buy/sell listings).
- **Crafting:** UI to combine materials into gear using item templates.

## ---

**4\. Core Gameplay Loop: Adventure & Map**

### **4.1 Zones & Distance Scaling**

The map consists of interconnected nodes branching outward from a Main City.

- **Safe Zones (Distance 0-2):** Includes the Main City and adjacent areas. PvP is disabled.
- **Danger Zones (Distance 3+):** Open PvP is enabled.
- **Distance Scaling:** The farther a player travels from the Main City, the higher the rarity and value of encountered loot and gathering nodes.

### **4.2 Travel Mechanic**

- Selecting a map destination triggers a server-validated real-time timer (e.g., 5:00 minutes).
- The UI displays a looping 2D placeholder sprite representing the character walking.
- During this timer, the server actively pushes random encounters to the client.

### **4.3 The Encounter System**

When an encounter is triggered, progress pauses pending player input.

#### **Gathering Encounters**

- **Types:** Skinning, Fiber, Ore, Fishing.
- **Flow:** Prompt shows node details (e.g., "Rare Ore 20x").
- **Actions:** \[Gather\] or \[Skip\].
- **Mechanic:** Unlimited gathering (no energy system), encouraging active grinding. Higher tier nodes appear in further zones.

#### **PvE (Player vs Environment)**

- **Flow:** Prompt shows mob details.
- **Actions:** \[Attack\] or \[Skip\].
- **Combat:** Auto-battler simulation. The UI displays health bars and alternating text logs of damage. Loot and EXP are awarded upon victory.

#### **Dungeons**

- **Flow:** Prompt shows dungeon entrance.
- **Actions:** \[Enter\] or \[Skip\].
- **Mechanics:** \* No \[Skip\] or escape option once inside.
  - Consists of sequential auto-battles against mobs.
  - Player health resets to 100% after each defeated mob.
  - RNG chance to encounter a Treasure Chest room between combat rooms.
  - Concludes with a Final Boss yielding high-tier loot.

#### **PvP (Player vs Player)**

- **Trigger:** Danger Zones (Distance 3+) only. Matches players currently traveling in the same zone.
- **Combat:** Auto-battler simulation.
- **Actions:** \[Fight\] or \[Flee\].
  - **Flee Mechanic:** Success rate of escaping a PvP encounter is calculated based on the player's AGI (Agility) stat versus the opponent's stats.
- **Death Penalties (Full Loot & Trash Rate):** \* The defeated player drops their inventory/loot.
  - **Trash Rate System:** A percentage of the dropped items is permanently destroyed by the server. The victorious player loots the remaining surviving items.

## ---

**5\. RPG Systems & Economy**

### **5.1 Tag & Rarity System**

Applied to equipment, materials, and gathering nodes:

1. Common
2. Uncommon
3. Rare
4. Legendary
5. Mythical

### **5.2 Leveling & Equipment Constraints**

- **Max Level:** 100\.
- **Equip Requirements:** Gear is restricted by player level (e.g., "Rare Sword of \[Name\]" requires Level 50).

### **5.3 Crafting System**

- Crafting is governed by **Item Templates**.
- **RNG Generation:** Templates define stat ranges rather than fixed numbers (e.g., Base Damage: 20-25, Speed: 2.5-3.5).
- Upon crafting, the backend rolls the final stats within the template's specified range.

### **5.4 Economy & NPCs**

- **NPC Merchants:** Located in the Main City for purchasing starter gear, potions, and basic necessities.
- **Trading:** Real-time 1:1 secure item/gold trading between players via WebSockets.
- **Marketplace:** Global auction house for asynchronous trading.
- **Gold Sink:** All Marketplace transactions incur a permanent 5% tax deducted from the final sale price to regulate server inflation.
