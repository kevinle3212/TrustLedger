// Barrel module for shared TrustLedger frontend types. Import from `@/types`;
// the alias is wired in `src/tsconfig.json` and stays inside the Vercel project
// root so production builds receive the same files local and CI builds use.
//
// @example
// import type { Contract, Dispute, Rating } from "@/types";

export type * from "./common";
export type * from "./contract";
export type * from "./dispute";
export type * from "./rating";
