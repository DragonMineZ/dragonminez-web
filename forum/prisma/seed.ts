import { PrismaClient } from "../src/generated/client/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const categories = [
  { slug: "announcements", postRole: "admin" },
  { slug: "servers", kind: "servers" },
  { slug: "guides", postRole: "staff" },
  { slug: "suggestions", kind: "suggestions" },
  { slug: "bug-reports", kind: "bugs" },
];

const users = [
  { discordId: "dev-admin", username: "Admin", role: "admin" },
  { discordId: "dev-mod", username: "Moderator", role: "mod" },
  { discordId: "dev-member", username: "Member", role: "member" },
];

const threads = [
  { cat: "announcements", by: "dev-admin", pinned: true, title: "Welcome to the DragonMineZ forum", body: "# Welcome\n\nThis is the **official** forum. Be kind and read the rules." },
  {
    cat: "announcements", by: "dev-admin", title: "DragonMineZ v2.2 and beyond",
    body: "During the showcase we gave a first look at what is coming: new races, a new dimension and the biggest config overhaul so far.\n\nFrom a rebuilt combat system to server tools that need no code, we keep looking for new ways to bring the mod to players everywhere. And with v2.2 we go big.\n\nThis is everything we announced!",
    extra: { subtitle: "Catch up on everything that is coming to DragonMineZ", cover: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200" },
  },
  { cat: "suggestions", by: "dev-member", title: "A training room with adjustable gravity", body: "It would be great to have a room where you can set the gravity yourself and train at your own pace." },
  { cat: "suggestions", by: "dev-member", title: "More hair styles for Saiyans", body: "A few more spiky styles would be awesome.", extra: { status: "planned" } },
  { cat: "bug-reports", by: "dev-member", title: "Crash when opening the stats menu", body: "**Mod version:** 2.2.0\n\n**Minecraft / Forge:** 1.20.1 / Forge 47.3.0\n\n### What happened\nThe game closes as soon as I open the stats menu.\n\n### Steps to reproduce\n1. Create a character\n2. Press the stats key", extra: { status: "confirmed" } },
  { cat: "guides", by: "dev-mod", title: "How to install the mod", body: "1. Install Forge 1.20.1\n2. Drop the jar in `mods`\n3. Launch the game" },
];

const servers = [
  { by: "dev-mod", name: "Capsule Corp SMP", address: "play.capsulecorp.example", version: "1.20.1", language: "en", status: "approved", description: "A friendly survival server with quests, dragon balls and custom events every weekend." },
  { by: "dev-member", name: "Planeta Namekusei", address: "mc.namekusei.example:25570", version: "1.20.1", language: "es", status: "approved", description: "Servidor en español con raids, torneos y una comunidad muy activa todos los días." },
  { by: "dev-member", name: "Kame House PvP", address: "pvp.kamehouse.example", version: "1.20.1", language: "pt", status: "pending", description: "Servidor de PvP em português com arenas, rankings e torneios semanais." },
];

async function main() {
  for (const [position, c] of categories.entries()) {
    const data = { position, postRole: c.postRole ?? "member", kind: c.kind ?? "discussion" };
    await prisma.category.upsert({ where: { slug: c.slug }, update: data, create: { slug: c.slug, ...data } });
  }
  const cat = Object.fromEntries((await prisma.category.findMany()).map((c) => [c.slug, c.id]));

  const user = {};
  for (const u of users) {
    user[u.discordId] = await prisma.user.upsert({ where: { discordId: u.discordId }, update: {}, create: u });
  }

  // Sample community roles: the member gets Builder, the moderator Translator.
  const sampleRoles = [
    { name: "Builder", color: "#22c55e", to: "dev-member" },
    { name: "Translator", color: "#3b82f6", to: "dev-mod" },
  ];
  for (const r of sampleRoles) {
    const role = await prisma.communityRole.upsert({ where: { name: r.name }, update: {}, create: { name: r.name, color: r.color } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user[r.to].id, roleId: role.id } },
      update: {},
      create: { userId: user[r.to].id, roleId: role.id },
    });
  }

  async function createThread(categorySlug, discordId, title, body, extra = {}) {
    const exists = await prisma.thread.findFirst({ where: { categoryId: cat[categorySlug], title } });
    if (exists) return exists;
    return prisma.thread.create({
      data: {
        categoryId: cat[categorySlug],
        authorId: user[discordId].id,
        title,
        ...extra,
        posts: { create: { authorId: user[discordId].id, body } },
      },
    });
  }

  for (const t of threads) {
    await createThread(t.cat, t.by, t.title, t.body, { pinned: t.pinned ?? false, ...t.extra });
  }

  for (const s of servers) {
    if (await prisma.server.findFirst({ where: { name: s.name } })) continue;
    const thread = await createThread("servers", s.by, s.name, s.description);
    await prisma.server.create({
      data: {
        ownerId: user[s.by].id,
        threadId: thread.id,
        name: s.name,
        address: s.address,
        version: s.version,
        language: s.language,
        description: s.description,
        status: s.status,
      },
    });
  }
  console.log("Seed done");
}

main().finally(() => prisma.$disconnect());
