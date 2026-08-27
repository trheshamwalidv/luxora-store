export type ShopifyConnectionStatus = "not_connected" | "ready" | "connected";

export type ShopifyBridgeConfig = {
  storeDomain?: string | null;
  status: ShopifyConnectionStatus;
};

export type ShopifyCheckoutRequest = {
  variantId: string;
  quantity: number;
};

export type ShopifyBridge = {
  mode: "blocked" | "ready_for_connection" | "connected";
  canCheckout: boolean;
  requirements: string[];
  createCheckout: (lines: ShopifyCheckoutRequest[]) => Promise<{ checkoutUrl: string }>;
};

/**
 * عازل تجارة مستقل: تُستبدل دالة createCheckout بطلب Shopify Storefront API
 * بعد ربط متجر حقيقي عبر التكامل المخصص. لا تُرسل أي بيانات قبل هذا الربط.
 */
export function createShopifyBridge(config: ShopifyBridgeConfig): ShopifyBridge {
  const isConnected = config.status === "connected" && Boolean(config.storeDomain);
  const requirements = isConnected
    ? []
    : ["Shopify store domain", "Storefront access token", "Storefront API version"];
  return {
    mode: isConnected ? "connected" : config.status === "ready" ? "ready_for_connection" : "blocked",
    canCheckout: isConnected,
    requirements,
    async createCheckout(lines) {
      if (!isConnected) {
        throw new Error("Shopify غير متصل بعد؛ لا يمكن بدء الدفع قبل ربط متجر حقيقي.");
      }
      if (!lines.length) throw new Error("أضف منتجًا واحدًا على الأقل للسلة.");
      // نقطة الاستبدال الرسمية عند تفعيل Shopify: إرسال lines إلى Storefront Cart API
      // ثم إعادة cart.checkoutUrl إلى واجهة المتجر.
      throw new Error("يتطلب إعداد Shopify Storefront API لإكمال عملية الدفع.");
    },
  };
}
