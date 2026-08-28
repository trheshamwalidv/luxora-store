import { asc, desc, eq, inArray, sql } from "drizzle-orm";import { drizzle } from "drizzle-orm/mysql2";import { createPool } from "mysql2";
import {
  campaigns,
  collections,
  InsertUser,
  productImages,
  products,
  productVariants,
  storeSettings,
  users,
  orders,
  orderItems,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import {
  DEFAULT_CAMPAIGNS,
  DEFAULT_COLLECTIONS,
  DEFAULT_PRODUCTS,
  DEFAULT_SETTINGS,
  type StorefrontCampaign,
  type StorefrontCollection,
  type StorefrontProduct,
  type StorefrontSettings,
} from "./catalogDefaults";

let _db: ReturnType<typeof drizzle> | null = null;
let ordersReady: Promise<void> | null = null;

type CreateOrderInput = {
  customerName: string;
  phone: string;
  address: string;
  notes?: string | null;
  items: Array<{ productId: string; variantId: string; quantity: number }>;
};

async function ensureOrderTables(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  if (!ordersReady) {
    ordersReady = db.execute(sql`CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_number VARCHAR(32) NOT NULL UNIQUE,
      customer_name VARCHAR(160) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      address TEXT NOT NULL,
      notes TEXT NULL,
      payment_method ENUM('cod') NOT NULL DEFAULT 'cod',
      order_status ENUM('new','confirmed','preparing','shipped','completed','cancelled') NOT NULL DEFAULT 'new',
      total_cents INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX orders_status_idx (order_status),
      INDEX orders_created_idx (created_at)
    )`).then(() => db.execute(sql`CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id VARCHAR(180) NOT NULL,
      product_name VARCHAR(160) NOT NULL,
      product_slug VARCHAR(160) NOT NULL,
      variant_id VARCHAR(180) NOT NULL,
      variant_label VARCHAR(96) NOT NULL,
      quantity INT NOT NULL,
      unit_price_cents INT NOT NULL,
      image_url TEXT NULL,
      INDEX order_items_order_idx (order_id)
    )` )).then(() => undefined).catch(error => {
      ordersReady = null;
      throw error;
    });
  }
  await ordersReady;
}


// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = createPool({ uri: process.env.DATABASE_URL, ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true }, waitForConnections: true, connectionLimit: 2, queueLimit: 0 });_db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

function toStorefrontSettings(value: typeof storeSettings.$inferSelect): StorefrontSettings {
  return {
    brandName: value.brandName,
    wordmark: value.wordmark,
    tagline: value.tagline,
    description: value.description,
    currency: value.currency,
    locale: value.locale,
    primaryColor: value.primaryColor,
    surfaceColor: value.surfaceColor,
    heroTitle: value.heroTitle,
    heroSubtitle: value.heroSubtitle,
    heroImageUrl: value.heroImageUrl,
    heroCtaLabel: value.heroCtaLabel,
    announcementText: value.announcementText,
    shopifyConnectionStatus: value.shopifyConnectionStatus,
    shopifyStoreDomain: value.shopifyStoreDomain,
  };
}

export async function getStorefrontSettings(): Promise<StorefrontSettings> {
  const db = await getDb();
  if (!db) return DEFAULT_SETTINGS;
  const [value] = await db.select().from(storeSettings).limit(1);
  return value ? toStorefrontSettings(value) : DEFAULT_SETTINGS;
}

export async function saveStorefrontSettings(input: Partial<StorefrontSettings>): Promise<StorefrontSettings> {
  const db = await getDb();
  if (!db) return { ...DEFAULT_SETTINGS, ...input };
  const [existing] = await db.select().from(storeSettings).limit(1);
  const values = {
    brandName: input.brandName ?? existing?.brandName ?? DEFAULT_SETTINGS.brandName,
    wordmark: input.wordmark ?? existing?.wordmark ?? DEFAULT_SETTINGS.wordmark,
    tagline: input.tagline ?? existing?.tagline ?? DEFAULT_SETTINGS.tagline,
    description: input.description ?? existing?.description ?? DEFAULT_SETTINGS.description,
    currency: input.currency ?? existing?.currency ?? DEFAULT_SETTINGS.currency,
    locale: input.locale ?? existing?.locale ?? DEFAULT_SETTINGS.locale,
    primaryColor: input.primaryColor ?? existing?.primaryColor ?? DEFAULT_SETTINGS.primaryColor,
    surfaceColor: input.surfaceColor ?? existing?.surfaceColor ?? DEFAULT_SETTINGS.surfaceColor,
    heroTitle: input.heroTitle ?? existing?.heroTitle ?? DEFAULT_SETTINGS.heroTitle,
    heroSubtitle: input.heroSubtitle ?? existing?.heroSubtitle ?? DEFAULT_SETTINGS.heroSubtitle,
    heroImageUrl: input.heroImageUrl ?? existing?.heroImageUrl ?? DEFAULT_SETTINGS.heroImageUrl ?? null,
    heroCtaLabel: input.heroCtaLabel ?? existing?.heroCtaLabel ?? DEFAULT_SETTINGS.heroCtaLabel,
    announcementText: input.announcementText ?? existing?.announcementText ?? DEFAULT_SETTINGS.announcementText,
    shopifyConnectionStatus: input.shopifyConnectionStatus ?? existing?.shopifyConnectionStatus ?? DEFAULT_SETTINGS.shopifyConnectionStatus,
    shopifyStoreDomain: input.shopifyStoreDomain ?? existing?.shopifyStoreDomain ?? null,
  };
  if (existing) {
    await db.update(storeSettings).set(values).where(eq(storeSettings.id, existing.id));
  } else {
    await db.insert(storeSettings).values(values);
  }
  return getStorefrontSettings();
}

export async function getPublishedCollections(): Promise<StorefrontCollection[]> {
  const db = await getDb();
  if (!db) return DEFAULT_COLLECTIONS;
  const rows = await db.select().from(collections).where(eq(collections.isPublished, true)).orderBy(asc(collections.sortOrder));
  if (!rows.length) return DEFAULT_COLLECTIONS;
  return rows.map(row => ({
    id: String(row.id), slug: row.slug, title: row.title, kicker: row.kicker, description: row.description,
    imageUrl: row.imageUrl, category: row.category,
  }));
}

export async function getPublishedCampaigns(): Promise<StorefrontCampaign[]> {
  const db = await getDb();
  if (!db) return DEFAULT_CAMPAIGNS;
  const rows = await db.select().from(campaigns).where(eq(campaigns.isPublished, true)).orderBy(asc(campaigns.sortOrder));
  if (!rows.length) return DEFAULT_CAMPAIGNS;
  return rows.map(row => ({
    id: String(row.id), slug: row.slug, type: row.type, title: row.title, kicker: row.kicker,
    description: row.description, imageUrl: row.imageUrl, ctaLabel: row.ctaLabel,
  }));
}

export async function getPublishedProducts(): Promise<StorefrontProduct[]> {
  const db = await getDb();
  if (!db) return DEFAULT_PRODUCTS;
  const rows = await db.select().from(products).where(eq(products.status, "published")).orderBy(asc(products.createdAt));
  if (!rows.length) return DEFAULT_PRODUCTS;
  const productIds = rows.map(row => row.id);
  const [images, variants] = await Promise.all([
    db.select().from(productImages).where(inArray(productImages.productId, productIds)).orderBy(asc(productImages.sortOrder)),
    db.select().from(productVariants).where(inArray(productVariants.productId, productIds)),
  ]);
  return rows.map(row => ({
    id: String(row.id),
    collectionId: row.collectionId ? String(row.collectionId) : undefined,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle ?? undefined,
    description: row.description,
    category: row.category,
    gender: row.gender,
    priceCents: row.priceCents,
    compareAtCents: row.compareAtCents,
    badge: row.badge,
    material: row.material,
    isFeatured: row.isFeatured,
    source: row.shopifyProductId ? "shopify" : "local",
    shopifyProductId: row.shopifyProductId,
    images: images.filter(image => image.productId === row.id).map(image => ({ id: String(image.id), url: image.imageUrl, alt: image.altText })),
    variants: variants.filter(variant => variant.productId === row.id).map(variant => ({
      id: variant.shopifyVariantId ?? String(variant.id), shopifyVariantId: variant.shopifyVariantId, sku: variant.sku, colorName: variant.colorName, colorHex: variant.colorHex,
      size: variant.size, stockQuantity: variant.stockQuantity, isAvailable: variant.isAvailable,
    })),
  }));
}

export async function createStoreOrder(input: CreateOrderInput) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await ensureOrderTables(db);
  if (!input.items.length) throw new Error("السلة فارغة.");
  const products = await getPublishedProducts();
  const resolved = input.items.map(item => {
    const product = products.find(candidate => candidate.id === item.productId);
    const variant = product?.variants.find(candidate => candidate.id === item.variantId);
    if (!product || !variant) throw new Error("أحد المنتجات لم يعد متاحًا.");
    if (!variant.isAvailable || variant.stockQuantity < item.quantity) throw new Error("الكمية المتاحة من " + product.name + " غير كافية.");
    return { item, product, variant };
  });
  const totalCents = resolved.reduce((sum, entry) => sum + entry.product.priceCents * entry.item.quantity, 0);
  const orderNumber = "LX-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  const inserted = await db.insert(orders).values({ orderNumber, customerName: input.customerName.trim(), phone: input.phone.trim(), address: input.address.trim(), notes: input.notes?.trim() || null, paymentMethod: "cod", status: "new", totalCents }).$returningId();
  const orderId = inserted[0]?.id;
  if (!orderId) throw new Error("تعذر إنشاء رقم الطلب.");
  await db.insert(orderItems).values(resolved.map(({ item, product, variant }) => ({ orderId, productId: product.id, productName: product.name, productSlug: product.slug, variantId: variant.id, variantLabel: variant.colorName + " / " + variant.size, quantity: item.quantity, unitPriceCents: product.priceCents, imageUrl: product.images[0]?.url ?? null })));
  return { id: orderId, orderNumber, totalCents };
}

export async function getAdminOrders() {
  const db = await getDb();
  if (!db) return [];
  await ensureOrderTables(db);
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  if (!rows.length) return [];
  const ids = rows.map(row => row.id);
  const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, ids));
  return rows.map(row => ({ ...row, items: items.filter(item => item.orderId === row.id) }));
}

export async function updateOrderStatus(id: number, status: "new" | "confirmed" | "preparing" | "shipped" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await ensureOrderTables(db);
  await db.update(orders).set({ status }).where(eq(orders.id, id));
  const [row] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return row ?? null;
}

export async function deleteStoreOrder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await ensureOrderTables(db);
  const [existing] = await db.select({ id: orders.id, orderNumber: orders.orderNumber }).from(orders).where(eq(orders.id, id)).limit(1);
  if (!existing) throw new Error("الطلب غير موجود.");
  await db.delete(orderItems).where(eq(orderItems.orderId, id));
  await db.delete(orders).where(eq(orders.id, id));
  return { success: true, orderNumber: existing.orderNumber } as const;
}

export async function getStorefrontSnapshot() {
  try {
    const db = await getDb();
    const [settings, collectionList, productList, campaignList, managedRows] = await Promise.all([
      getStorefrontSettings(), getPublishedCollections(), getPublishedProducts(), getPublishedCampaigns(),
      db ? db.select({ id: products.id }).from(products).limit(1) : Promise.resolve([]),
    ]);
    return { settings, collections: collectionList, products: productList, campaigns: campaignList, catalogSource: managedRows.length ? "managed" : "fallback" as const };
  } catch (error) {
    console.error("[Catalog] Failed to load managed storefront; using defaults:", error);
    return {
      settings: DEFAULT_SETTINGS,
      collections: DEFAULT_COLLECTIONS,
      products: DEFAULT_PRODUCTS,
      campaigns: DEFAULT_CAMPAIGNS,
      catalogSource: "fallback" as const,
    };
  }
}

export async function getAdminOverview() {
  const db = await getDb();
  if (!db) {
    return { settings: DEFAULT_SETTINGS, products: DEFAULT_PRODUCTS, collections: DEFAULT_COLLECTIONS, campaigns: DEFAULT_CAMPAIGNS };
  }
  const [settings, productRows, collectionRows, campaignRows] = await Promise.all([
    getStorefrontSettings(), db.select().from(products).orderBy(asc(products.createdAt)),
    db.select().from(collections).orderBy(asc(collections.sortOrder)), db.select().from(campaigns).orderBy(asc(campaigns.sortOrder)),
  ]);
  const publishedProducts = await getPublishedProducts();
  return {
    settings,
    products: productRows.length ? publishedProducts : DEFAULT_PRODUCTS,
    collections: collectionRows.length ? collectionRows.map(row => ({ id: String(row.id), slug: row.slug, title: row.title, kicker: row.kicker, description: row.description, imageUrl: row.imageUrl, category: row.category })) : DEFAULT_COLLECTIONS,
    campaigns: campaignRows.length ? campaignRows.map(row => ({ id: String(row.id), slug: row.slug, type: row.type, title: row.title, kicker: row.kicker, description: row.description, imageUrl: row.imageUrl, ctaLabel: row.ctaLabel })) : DEFAULT_CAMPAIGNS,
  };
}
