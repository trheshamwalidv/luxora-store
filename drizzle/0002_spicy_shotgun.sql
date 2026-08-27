ALTER TABLE `product_variants` ADD `shopify_variant_id` varchar(180);--> statement-breakpoint
ALTER TABLE `products` ADD `shopify_product_id` varchar(180);--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_shopify_variant_id_unique` UNIQUE(`shopify_variant_id`);--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_shopify_product_id_unique` UNIQUE(`shopify_product_id`);