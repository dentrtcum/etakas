if (process.env.NODE_ENV === "production") {
  throw new Error("Seed cannot run in production.");
}

import { syntheticSeedData } from "@/jobs/seed-data";

console.log(
  `Synthetic seed preview: ${syntheticSeedData.organizations.length} organizations, ${syntheticSeedData.products.length} products, ${syntheticSeedData.users.length} users.`
);
