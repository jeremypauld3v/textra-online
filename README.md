# **SpriteHero Online - Mobile Auto-Battler MMORPG**

## **1. Project Overview**

- **Genre:** Mobile Text-Based 2D MMORPG / Auto-Battler
- **Platform:** React Native (via Expo)
- **Theme:** Fantasy RPG (Gathering, Crafting, Dungeons, PvP)
- **Visual Style:** UI-heavy, text-driven, 2D sprite visualizers, Grounded battle platforms.

---

## **2. Tech Stack & Architecture**

### **Frontend (Mobile App)**
- **Framework:** React Native (via Expo)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State Management:** Zustand (for real-time event-driven character status, inventory, and stats).

### **Backend (Server & Multiplayer)**
- **API Framework:** Fastify.js (high-throughput REST endpoints).
- **Database:** PostgreSQL (for strict transactional integrity).
- **ORM:** Prisma (type-safe database client and migrations).
- **Real-time Communication:** WebSockets via Socket.io (real-time chat, direct trade, live status syncing, and PvP matching).
- **Background Jobs:** BullMQ via Redis (secure, server-side processing of travel pulses and camp healing).
- **Authentication:** JWT (JSON Web Tokens).

### **Admin Portal (Management Dashboard)**
- **Framework:** React + Vite (Tailwind CSS, Lucide icons).
- **Features:** Live server announcements, inventory editing, recipe/dungeon editing, and beast/monster template management.

---

## **3. Core Gameplay Systems**

### **3.1 Real-Time WebSocket Syncing**
- The game has **zero background polling**.
- When traveling or resting at camp, the server travel worker updates character stats and automatically broadcasts a `character_updated` socket payload to the client, triggering instant UI updates.

### **3.2 Combat Overhaul (Class Active Skills)**
Combat is calculated server-side based on the player's stats and their equipped weapon's prefix (determining their class):
- **Warrior** (*Shield / Sword*): Triggers **Shield Slam** (scales with DEF, stuns the monster) and **Berserk** (boosts ATK by 50% when HP is below 30%).
- **Archer** (*Bow*): Triggers **Double Shot** (fires two arrows in succession) and **Evade** (prepares dodge to force next monster attack to miss).
- **Mage** (*Staff*): Triggers **Fireball** (massive magic strike scaling with INT) and **Rejuvenate** (mana channels to heal self when HP falls below 40%).

### **3.3 Battle Speed Controls**
- In the combat arena screen, players can select a **1x, 2x, or 4x Speed Multiplier**.
- This scales combat logs, hit animation shifts, floating damage text, haptic frequencies, and end-of-battle rewards for faster grinding.

### **3.4 Entity Sprite Registry**
- The database schema supports binding custom sprite URLs/paths to monsters, items, and resource templates.
- The Admin Portal features a **Sprite Configuration Section** allowing creators to specify *idle*, *walk/run*, and *attack* sprite asset paths.

---

## **4. Getting Started & Setup**

Follow these instructions to run the SpriteHero Online server and client locally.

### **Prerequisites**
- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Postgres/Redis database containers)

### **Step 1: Start Database Containers**
Launch the PostgreSQL and Redis containers using Docker Compose from the root workspace directory:
```bash
docker compose up -d
```

### **Step 2: Initialize the Backend Server**
1. Navigate to the backend directory and configure the environment variables:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Prisma database migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Run the seed script to populate the world metadata, items, and dungeons:
   ```bash
   npx prisma db seed
   ```
5. Start the Fastify development server:
   ```bash
   npm run dev
   ```

### **Step 3: Run the Expo Mobile Frontend**
1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
2. Start the Expo builder:
   ```bash
   npm run dev
   ```

### **Step 4: Launch the Admin Dashboard**
1. Navigate to the admin directory and install dependencies:
   ```bash
   cd ../admin
   npm install
   ```
2. Start the Vite server:
   ```bash
   npm run dev
   ```
   *Access the admin portal at `http://localhost:5173`. Default credentials: `admin@spritehero.online` / `password`.*
