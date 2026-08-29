import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import {
  ChangePasswordBody,
  CreateStoreBody,
  CreateUserBody,
  GetUserParams,
  ListAdminStoresQueryParams,
  ListStoresQueryParams,
  ListUsersQueryParams,
  LoginBody,
  SignupBody,
  UpsertRatingBody,
} from "@workspace/api-zod";
import { db, ratings, stores, users, type Store, type User } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { createToken, hashPassword, publicUser, verifyPassword } from "../lib/security";

const router: IRouter = Router();
const passwordRule = z
  .string()
  .min(8, "Password must be 8–16 characters")
  .max(16, "Password must be 8–16 characters")
  .regex(/[A-Z]/, "Password needs at least one uppercase letter")
  .regex(/[^A-Za-z0-9]/, "Password needs at least one special character");
const emailRule = z.string().email("Enter a valid email address");

function respond(res: Response, data: unknown, message?: string, status = 200) {
  return res.status(status).json({ success: true, data, ...(message ? { message } : {}) });
}

function parseBody<T>(schema: z.ZodType<T>, body: unknown) {
  return schema.parse(body);
}

function pagination(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

function storeRatingFields() {
  return {
    id: stores.id,
    name: stores.name,
    email: stores.email,
    address: stores.address,
    ownerId: stores.ownerId,
    ownerName: users.name,
    overallRating: sql<number>`coalesce(avg(${ratings.rating}), 0)`,
    ratingCount: count(ratings.id),
    createdAt: stores.createdAt,
  };
}

async function getStoreWithRating(storeId: number) {
  const [store] = await db
    .select(storeRatingFields())
    .from(stores)
    .leftJoin(users, eq(stores.ownerId, users.id))
    .leftJoin(ratings, eq(ratings.storeId, stores.id))
    .where(eq(stores.id, storeId))
    .groupBy(stores.id, users.name)
    .limit(1);
  return store
    ? {
        ...store,
        overallRating: Number(store.overallRating ?? 0),
        ratingCount: Number(store.ratingCount ?? 0),
      }
    : null;
}

router.post("/auth/signup", async (req, res, next) => {
  try {
    const input = parseBody(SignupBody, req.body);
    emailRule.parse(input.email);
    passwordRule.parse(input.password);
    const passwordHash = await hashPassword(input.password);
    const [user] = await db
      .insert(users)
      .values({ name: input.name.trim(), email: input.email.toLowerCase().trim(), address: input.address.trim(), passwordHash, role: "NORMAL_USER" })
      .returning();
    const safe = publicUser(user);
    return respond(res, { token: createToken(safe), user: safe }, "Welcome to StoreRate", 201);
  } catch (error) {
    if (isUniqueError(error)) return res.status(400).json({ success: false, message: "An account with that email already exists" });
    return next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const input = parseBody(LoginBody, req.body);
    emailRule.parse(input.email);
    const [user] = await db.select().from(users).where(eq(users.email, input.email.toLowerCase().trim())).limit(1);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Email or password is incorrect" });
    }
    const safe = publicUser(user);
    return respond(res, { token: createToken(safe), user: safe }, "Signed in");
  } catch (error) {
    return next(error);
  }
});

router.get("/auth/me", requireAuth, (req, res) => respond(res, publicUser(req.user!)));

router.post("/auth/change-password", requireAuth, async (req, res, next) => {
  try {
    const input = parseBody(ChangePasswordBody, req.body);
    passwordRule.parse(input.newPassword);
    const matches = await verifyPassword(input.currentPassword, req.user!.passwordHash);
    if (!matches) return res.status(400).json({ success: false, message: "Current password is incorrect" });
    await db.update(users).set({ passwordHash: await hashPassword(input.newPassword) }).where(eq(users.id, req.user!.id));
    return respond(res, { message: "Password updated successfully" });
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/summary", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const [[userTotal], [storeTotal], [ratingTotal]] = await Promise.all([
      db.select({ total: count() }).from(users),
      db.select({ total: count() }).from(stores),
      db.select({ total: count() }).from(ratings),
    ]);
    return respond(res, { totalUsers: Number(userTotal.total), totalStores: Number(storeTotal.total), totalRatings: Number(ratingTotal.total) });
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/users", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const query = ListUsersQueryParams.parse(req.query);
    const conditions = query.search
      ? or(ilike(users.name, `%${query.search}%`), ilike(users.email, `%${query.search}%`), ilike(users.address, `%${query.search}%`))
      : undefined;
    const filter = query.role ? (conditions ? and(conditions, eq(users.role, query.role)) : eq(users.role, query.role)) : conditions;
    const sortFields = { name: users.name, email: users.email, address: users.address, role: users.role, createdAt: users.createdAt };
    const sortField = sortFields[query.sort as keyof typeof sortFields] ?? users.name;
    const [items, [{ total }]] = await Promise.all([
      db.select({ id: users.id, name: users.name, email: users.email, address: users.address, role: users.role, createdAt: users.createdAt })
        .from(users).where(filter).orderBy(query.order === "desc" ? desc(sortField) : asc(sortField))
        .limit(query.pageSize).offset((query.page - 1) * query.pageSize),
      db.select({ total: count() }).from(users).where(filter),
    ]);
    return respond(res, { items, pagination: pagination(query.page, query.pageSize, Number(total)) });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/users", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const input = parseBody(CreateUserBody, req.body);
    emailRule.parse(input.email);
    passwordRule.parse(input.password);
    const [user] = await db.insert(users).values({
      name: input.name.trim(), email: input.email.toLowerCase().trim(), address: input.address.trim(),
      passwordHash: await hashPassword(input.password), role: input.role,
    }).returning();
    return respond(res, publicUser(user), "User added", 201);
  } catch (error) {
    if (isUniqueError(error)) return res.status(400).json({ success: false, message: "An account with that email already exists" });
    return next(error);
  }
});

router.get("/admin/users/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { id } = GetUserParams.parse(req.params);
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    let storeAverageRating: number | null = null;
    if (user.role === "STORE_OWNER") {
      const [summary] = await db.select({ average: sql<number>`avg(${ratings.rating})` }).from(stores).leftJoin(ratings, eq(ratings.storeId, stores.id)).where(eq(stores.ownerId, user.id));
      storeAverageRating = summary?.average == null ? null : Number(summary.average);
    }
    return respond(res, { ...publicUser(user), storeAverageRating });
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/stores", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const query = ListAdminStoresQueryParams.parse(req.query);
    const filter = query.search ? or(ilike(stores.name, `%${query.search}%`), ilike(stores.email, `%${query.search}%`), ilike(stores.address, `%${query.search}%`)) : undefined;
    const sortFields = { name: stores.name, email: stores.email, address: stores.address, createdAt: stores.createdAt };
    const sortField = sortFields[query.sort as keyof typeof sortFields] ?? stores.name;
    const base = db.select(storeRatingFields()).from(stores).leftJoin(users, eq(stores.ownerId, users.id)).leftJoin(ratings, eq(ratings.storeId, stores.id)).where(filter).groupBy(stores.id, users.name);
    const [items, [{ total }]] = await Promise.all([
      base.orderBy(query.order === "desc" ? desc(sortField) : asc(sortField)).limit(query.pageSize).offset((query.page - 1) * query.pageSize),
      db.select({ total: count() }).from(stores).where(filter),
    ]);
    return respond(res, { items: items.map((item) => ({ ...item, overallRating: Number(item.overallRating ?? 0), ratingCount: Number(item.ratingCount ?? 0) })), pagination: pagination(query.page, query.pageSize, Number(total)) });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/stores", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const input = parseBody(CreateStoreBody, req.body);
    emailRule.parse(input.email);
    if (input.ownerId != null) {
      const [owner] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, input.ownerId)).limit(1);
      if (!owner || owner.role !== "STORE_OWNER") return res.status(400).json({ success: false, message: "Store owner must be an existing Store Owner account" });
    }
    const [store] = await db.insert(stores).values({ name: input.name.trim(), email: input.email.toLowerCase().trim(), address: input.address.trim(), ownerId: input.ownerId ?? null }).returning();
    return respond(res, await getStoreWithRating(store.id), "Store added", 201);
  } catch (error) {
    return next(error);
  }
});

router.get("/stores", requireAuth, requireRole("NORMAL_USER"), async (req, res, next) => {
  try {
    const query = ListStoresQueryParams.parse(req.query);
    const filter = query.search ? or(ilike(stores.name, `%${query.search}%`), ilike(stores.address, `%${query.search}%`)) : undefined;
    const base = db.select(storeRatingFields()).from(stores).leftJoin(users, eq(stores.ownerId, users.id)).leftJoin(ratings, eq(ratings.storeId, stores.id)).where(filter).groupBy(stores.id, users.name);
    const [items, [{ total }]] = await Promise.all([
      base.orderBy(asc(stores.name)).limit(query.pageSize).offset((query.page - 1) * query.pageSize),
      db.select({ total: count() }).from(stores).where(filter),
    ]);
    const myRatings = items.length ? await db.select({ storeId: ratings.storeId, rating: ratings.rating }).from(ratings).where(and(eq(ratings.userId, req.user!.id), sql`${ratings.storeId} in (${sql.join(items.map((item) => sql`${item.id}`), sql`, `)})`)) : [];
    const myRatingMap = new Map(myRatings.map((rating) => [rating.storeId, rating.rating]));
    return respond(res, { items: items.map((item) => ({ ...item, overallRating: Number(item.overallRating ?? 0), ratingCount: Number(item.ratingCount ?? 0), myRating: myRatingMap.get(item.id) ?? null })), pagination: pagination(query.page, query.pageSize, Number(total)) });
  } catch (error) {
    return next(error);
  }
});

router.post("/ratings", requireAuth, requireRole("NORMAL_USER"), async (req, res, next) => {
  try {
    const input = parseBody(UpsertRatingBody, req.body);
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return res.status(400).json({ success: false, message: "Rating must be a whole number from 1 to 5" });
    const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, input.storeId)).limit(1);
    if (!store) return res.status(400).json({ success: false, message: "Store not found" });
    const [rating] = await db.insert(ratings).values({ userId: req.user!.id, storeId: input.storeId, rating: input.rating, updatedAt: new Date() })
      .onConflictDoUpdate({ target: [ratings.userId, ratings.storeId], set: { rating: input.rating, updatedAt: new Date() } }).returning();
    return respond(res, rating, "Your rating was saved");
  } catch (error) {
    return next(error);
  }
});

router.get("/owner/dashboard", requireAuth, requireRole("STORE_OWNER"), async (req, res, next) => {
  try {
    const [store] = await db.select({ id: stores.id }).from(stores).where(eq(stores.ownerId, req.user!.id)).limit(1);
    if (!store) return res.status(404).json({ success: false, message: "No store is assigned to this account yet" });
    const [storeDetails, ownerRatings] = await Promise.all([
      getStoreWithRating(store.id),
      db.select({ userId: users.id, userName: users.name, rating: ratings.rating, createdAt: ratings.createdAt }).from(ratings).innerJoin(users, eq(ratings.userId, users.id)).where(eq(ratings.storeId, store.id)).orderBy(desc(ratings.createdAt)),
    ]);
    return respond(res, { store: storeDetails, ratings: ownerRatings });
  } catch (error) {
    return next(error);
  }
});

router.get("/users/profile", requireAuth, (req, res) => respond(res, publicUser(req.user!)));

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}

export default router;