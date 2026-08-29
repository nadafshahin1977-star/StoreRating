import { eq } from "drizzle-orm";

import { db, ratings, stores, users } from "@workspace/db";
import { hashPassword } from "./lib/security";

const accounts = [
  {
    name: "StoreRate System Administrator",
    email: "admin@storerate.local",
    address: "100 Market Street, San Francisco, CA",
    role: "ADMIN" as const,
    password: "StoreRate!26",
  },
  {
    name: "Avery Johnson Store Owner",
    email: "owner@storerate.local",
    address: "44 Valencia Street, San Francisco, CA",
    role: "STORE_OWNER" as const,
    password: "StoreOwner!26",
  },
  {
    name: "Morgan Lee StoreRate Member",
    email: "member@storerate.local",
    address: "18 Mission Street, San Francisco, CA",
    role: "NORMAL_USER" as const,
    password: "MemberUser!26",
  },
];

async function findOrCreateAccount(account: (typeof accounts)[number]) {
  const [existing] = await db.select().from(users).where(eq(users.email, account.email)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(users).values({
    name: account.name,
    email: account.email,
    address: account.address,
    role: account.role,
    passwordHash: await hashPassword(account.password),
  }).returning();
  return created;
}

const admin = await findOrCreateAccount(accounts[0]);
const owner = await findOrCreateAccount(accounts[1]);
const member = await findOrCreateAccount(accounts[2]);

const [existingStore] = await db.select().from(stores).where(eq(stores.email, "hello@harborandpine.local")).limit(1);
const store = existingStore ?? (await db.insert(stores).values({
  name: "Harbor & Pine Market",
  email: "hello@harborandpine.local",
  address: "81 Embarcadero South, San Francisco, CA",
  ownerId: owner.id,
}).returning())[0];

const [secondStore] = await db.select().from(stores).where(eq(stores.email, "team@copperandclay.local")).limit(1);
const otherStore = secondStore ?? (await db.insert(stores).values({
  name: "Copper & Clay Goods",
  email: "team@copperandclay.local",
  address: "2300 Fillmore Street, San Francisco, CA",
}).returning())[0];

const [existingRating] = await db.select().from(ratings).where(eq(ratings.userId, member.id)).limit(1);
if (!existingRating) {
  await db.insert(ratings).values({ userId: member.id, storeId: store.id, rating: 5 });
  await db.insert(ratings).values({ userId: member.id, storeId: otherStore.id, rating: 4 });
}

console.log(`Seeded StoreRate. Admin: ${admin.email} / ${accounts[0].password}`);