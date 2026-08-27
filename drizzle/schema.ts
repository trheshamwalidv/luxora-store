import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const storeSettings = mysqlTable("store_settings", {
  id: int("id").autoincrement().primaryKey(),
  brandName: varchar("brand_name", { length: 80 }).notNull(),
  wordmark: varchar("wordmark", { length: 18 }).notNull(),
  tagline: varchar("tagline", { length: 160 }).notNull(),
  description: text("description").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("EGP"),
  locale: varchar("locale", { length: 8 }).notNull().default("ar"),
  primaryColor: varchar("primary_color", { length: 16 }).notNull().default("#D9FF2F"),
  surfaceColor: varchar("surface_color", { length: 16 }).notNull().default("#101010"),
  heroTitle: varchar("hero_title", { length: 160 }).notNull(),
  heroSubtitle: text("hero_subtitle").notNull(),
  heroImageUrl: text("hero_image_url"),
  heroCtaLabel: varchar("hero_cta_label", { length: 48 }).notNull().default("تسوّق الآن"),
  announcementText: varchar("announcement_text", { length: 180 }).notNull().default("شحن مجاني للطلبات فوق 2,500 ج.م"),
  shopifyStoreDomain: varchar("shopify_store_domain", { length: 180 }),
  shopifyConnectionStatus: mysqlEnum("shopify_connection_status", ["not_connected", "ready", "connected"]).notNull().default("not_connected"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const collections = mysqlTable("collections", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 120 }).notNull(),
  kicker: varchar("kicker", { length: 80 }),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  category: mysqlEnum("collection_category", ["sneakers", "gym", "streetwear", "featured"]).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, table => [index("collections_category_idx").on(table.category)]);

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collection_id"),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  subtitle: varchar("subtitle", { length: 180 }),
  description: text("description").notNull(),
  category: mysqlEnum("product_category", ["sneakers", "gym", "streetwear"]).notNull(),
  gender: mysqlEnum("product_gender", ["men", "women", "unisex"]).notNull().default("unisex"),
  priceCents: int("price_cents").notNull(),
  compareAtCents: int("compare_at_cents"),
  badge: varchar("badge", { length: 48 }),
  material: varchar("material", { length: 160 }),
  status: mysqlEnum("product_status", ["draft", "published", "archived"]).notNull().default("draft"),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("products_category_idx").on(table.category),
  index("products_collection_idx").on(table.collectionId),
  index("products_status_idx").on(table.status),
]);

export const productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id").notNull(),
  sku: varchar("sku", { length: 96 }).notNull().unique(),
  colorName: varchar("color_name", { length: 72 }).notNull(),
  colorHex: varchar("color_hex", { length: 16 }).notNull(),
  size: varchar("size", { length: 24 }).notNull(),
  stockQuantity: int("stock_quantity").notNull().default(0),
  priceCents: int("price_cents"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("variants_product_idx").on(table.productId),
  index("variants_size_idx").on(table.size),
]);

export const productImages = mysqlTable("product_images", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id").notNull(),
  imageUrl: text("image_url").notNull(),
  altText: varchar("alt_text", { length: 180 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => [index("product_images_product_idx").on(table.productId)]);

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  type: mysqlEnum("campaign_type", ["drop", "lookbook", "offer"]).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  kicker: varchar("kicker", { length: 80 }),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  ctaLabel: varchar("cta_label", { length: 48 }).notNull().default("اكتشف المجموعة"),
  isPublished: boolean("is_published").notNull().default(false),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("campaigns_type_idx").on(table.type),
  index("campaigns_published_idx").on(table.isPublished),
]);

export const campaignProducts = mysqlTable("campaign_products", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaign_id").notNull(),
  productId: int("product_id").notNull(),
  sortOrder: int("sort_order").notNull().default(0),
}, table => [
  index("campaign_products_campaign_idx").on(table.campaignId),
  index("campaign_products_product_idx").on(table.productId),
]);

export type StoreSettings = typeof storeSettings.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
