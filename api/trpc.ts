import { createApp } from "../server/app";

// Handles the root batch endpoint `/api/trpc`; nested procedures are handled
// by `api/trpc/[...trpc].ts`.
export default createApp();
