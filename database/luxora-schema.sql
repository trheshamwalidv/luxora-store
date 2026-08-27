-- LUXORA standalone TiDB/MySQL schema.
-- Generated from drizzle migrations 0000, 0001 and 0002.
-- Run only against the dedicated `luxora-store` TiDB resource.

CREATE DATABASE IF NOT EXISTS `luxora`;
USE `luxora`;

CREATE TABLE `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `users_id` PRIMARY KEY(`id`),
  CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

CREATE TABLE `campaign_products` (
  `id` int AUTO_INCREMENT NOT NULL,
  `campaign_id` int NOT NULL,
  `product_id` int NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  CONSTRAINT `campaign_products_id` PRIMARY KEY(`id`)
);

CREATE TABLE `campaigns` (
  `id` int AUTO_INCREMENT NOT NULL,
  `slug` varchar(120) NOT NULL,
  `campaign_type` enum('drop','lookbook','offer') NOT NULL,
  `title` varchar(160) NOT NULL,
  `kicker` varchar(80),
  `description` text NOT NULL,
  `image_url` text,
  `cta_label` varchar(48) NOT NULL DEFAULT 'اكتشف المجموعة',
  `is_published` boolean NOT NULL DEFAULT false,
  `starts_at` timestamp,
  `ends_at` timestamp,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `campaigns_id` PRIMARY KEY(`id`),
  CONSTRAINT `campaigns_slug_unique` UNIQUE(`slug`)
);

CREATE TABLE `collections` (
  `id` int AUTO_INCREMENT NOT NULL,
  `slug` varchar(120) NOT NULL,
  `title` varchar(120) NOT NULL,
  `kicker` varchar(80),
  `description` text NOT NULL,
  `image_url` text,
  `collection_category` enum('sneakers','gym','streetwear','featured') NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_published` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `collections_id` PRIMARY KEY(`id`),
  CONSTRAINT `collections_slug_unique` UNIQUE(`slug`)
);

CREATE TABLE `product_images` (
  `id` int AUTO_INCREMENT NOT NULL,
  `product_id` int NOT NULL,
  `image_url` text NOT NULL,
  `alt_text` varchar(180) NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `product_images_id` PRIMARY KEY(`id`)
);

CREATE TABLE `product_variants` (
  `id` int AUTO_INCREMENT NOT NULL,
  `product_id` int NOT NULL,
  `sku` varchar(96) NOT NULL,
  `color_name` varchar(72) NOT NULL,
  `color_hex` varchar(16) NOT NULL,
  `size` varchar(24) NOT NULL,
  `stock_quantity` int NOT NULL DEFAULT 0,
  `price_cents` int,
  `is_available` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `product_variants_id` PRIMARY KEY(`id`),
  CONSTRAINT `product_variants_sku_unique` UNIQUE(`sku`)
);

CREATE TABLE `products` (
  `id` int AUTO_INCREMENT NOT NULL,
  `collection_id` int,
  `slug` varchar(160) NOT NULL,
  `name` varchar(160) NOT NULL,
  `subtitle` varchar(180),
  `description` text NOT NULL,
  `product_category` enum('sneakers','gym','streetwear') NOT NULL,
  `product_gender` enum('men','women','unisex') NOT NULL DEFAULT 'unisex',
  `price_cents` int NOT NULL,
  `compare_at_cents` int,
  `badge` varchar(48),
  `material` varchar(160),
  `product_status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `is_featured` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `products_id` PRIMARY KEY(`id`),
  CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);

CREATE TABLE `store_settings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `brand_name` varchar(80) NOT NULL,
  `wordmark` varchar(18) NOT NULL,
  `tagline` varchar(160) NOT NULL,
  `description` text NOT NULL,
  `currency` varchar(8) NOT NULL DEFAULT 'EGP',
  `locale` varchar(8) NOT NULL DEFAULT 'ar',
  `primary_color` varchar(16) NOT NULL DEFAULT '#D9FF2F',
  `surface_color` varchar(16) NOT NULL DEFAULT '#101010',
  `hero_title` varchar(160) NOT NULL,
  `hero_subtitle` text NOT NULL,
  `hero_image_url` text,
  `hero_cta_label` varchar(48) NOT NULL DEFAULT 'تسوّق الآن',
  `announcement_text` varchar(180) NOT NULL DEFAULT 'شحن مجاني للطلبات فوق 2,500 ج.م',
  `shopify_store_domain` varchar(180),
  `shopify_connection_status` enum('not_connected','ready','connected') NOT NULL DEFAULT 'not_connected',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `store_settings_id` PRIMARY KEY(`id`)
);

CREATE INDEX `campaign_products_campaign_idx` ON `campaign_products` (`campaign_id`);
CREATE INDEX `campaign_products_product_idx` ON `campaign_products` (`product_id`);
CREATE INDEX `campaigns_type_idx` ON `campaigns` (`campaign_type`);
CREATE INDEX `campaigns_published_idx` ON `campaigns` (`is_published`);
CREATE INDEX `collections_category_idx` ON `collections` (`collection_category`);
CREATE INDEX `product_images_product_idx` ON `product_images` (`product_id`);
CREATE INDEX `variants_product_idx` ON `product_variants` (`product_id`);
CREATE INDEX `variants_size_idx` ON `product_variants` (`size`);
CREATE INDEX `products_category_idx` ON `products` (`product_category`);
CREATE INDEX `products_collection_idx` ON `products` (`collection_id`);
CREATE INDEX `products_status_idx` ON `products` (`product_status`);

ALTER TABLE `product_variants` ADD `shopify_variant_id` varchar(180);
ALTER TABLE `products` ADD `shopify_product_id` varchar(180);
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_shopify_variant_id_unique` UNIQUE(`shopify_variant_id`);
ALTER TABLE `products` ADD CONSTRAINT `products_shopify_product_id_unique` UNIQUE(`shopify_product_id`);
