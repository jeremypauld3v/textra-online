import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
async function main() {
    const email = "admin@spritehero.online";
    const password = "password";
    const characterName = "GameMaster";
    console.log(`🤖 Checking if admin user '${email}' exists...`);
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });
    if (existingUser) {
        console.log(`✔️ Admin user '${email}' already exists. Updating to admin status...`);
        await prisma.user.update({
            where: { email },
            data: { isAdmin: true }
        });
        console.log("🎉 Admin status updated successfully!");
        return;
    }
    console.log("➕ Creating new admin account...");
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            isAdmin: true,
            characters: {
                create: {
                    name: characterName,
                }
            }
        }
    });
    console.log(`🎉 Admin user created successfully!\n📧 Email: ${email}\n🔑 Password: ${password}\n🛡️ Character Name: ${characterName}`);
}
main()
    .catch((e) => {
    console.error("❌ Failed to create admin:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=createAdmin.js.map