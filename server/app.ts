import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { createContext } from "./_core/context";
import { isStandaloneOwnerAuthEnabled } from "./_core/ownerAuth";
import { appRouter } from "./routers";

/**
 * API-only Express application shared by local development and Vercel Functions.
 * Static delivery is intentionally kept outside this module: Vite serves it locally
 * and Vercel serves the production build from its CDN.
 */
export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Manus OAuth and the Manus storage proxy remain available for the existing
  // development preview. The standalone deployment uses its own owner session
  // and independent media provider, so these routes are not registered there.
  if (!isStandaloneOwnerAuthEnabled()) {
    registerStorageProxy(app);
    registerOAuthRoutes(app);
  }

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}
