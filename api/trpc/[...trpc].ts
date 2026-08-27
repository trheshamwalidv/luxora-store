import { createApp } from "../../server/app";

// Vercel routes every /api/trpc/* request to this API function. The Express
// application keeps the existing typed tRPC contract unchanged.
export default createApp();
