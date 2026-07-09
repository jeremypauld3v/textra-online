import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js"; // Note: .js extension for ESM

export async function authRoutes(server: FastifyInstance) {
  server.post("/register", async (request, reply) => {
    const { email, password, characterName } = request.body as any;

    if (!email || !password || !characterName) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return reply.status(400).send({ error: "Email already registered" });
      }

      const existingChar = await prisma.character.findUnique({ where: { name: characterName } });
      if (existingChar) {
        return reply.status(400).send({ error: "Character name already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user and their first character in a transaction
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          characters: {
            create: {
              name: characterName,
            },
          },
        },
        include: { characters: true },
      });

      const character = newUser.characters[0];
      if (!character) {
        return reply.status(500).send({ error: "Failed to create character" });
      }
      
      // Generate JWT Token for immediate login
      const token = server.jwt.sign({ 
        userId: newUser.id, 
        characterId: character.id,
        email: newUser.email 
      });

      return reply.send({ 
        success: true, 
        message: "Registration successful",
        token,
        characterId: character.id,
        userId: newUser.id
      });
    } catch (err: any) {
      server.log.error(err);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  });

  server.post("/login", async (request, reply) => {
    const { email, password } = request.body as any;

    if (!email || !password) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    try {
      const user = await prisma.user.findUnique({ 
        where: { email },
        include: { characters: { select: { id: true, isBanned: true, banReason: true } } }
      });

      if (!user) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      // Check if any of the user's characters are banned
      const bannedChar = user.characters.find(c => c.isBanned);
      if (bannedChar) {
        return reply.status(403).send({
          error: "ACCOUNT_BANNED",
          message: bannedChar.banReason || "Your account has been banned.",
        });
      }

      const characterId = user.characters[0]?.id;

      // Generate JWT Token
      const token = server.jwt.sign({ 
        userId: user.id, 
        characterId,
        email: user.email 
      });

      return reply.send({ token, characterId, userId: user.id, isAdmin: user.isAdmin, message: "Login successful" });
    } catch (err: any) {
      server.log.error(err);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  });
}
