import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { desc, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { titckSkrsProducts } from "@/lib/db/schema";

const productSchema = z.object({
  gtin: z.string().regex(/^\d{8,14}$/),
  name: z.string().min(1).max(240),
  atcCode: z.string().max(32).nullable(),
  atcName: z.string().max(240).nullable(),
  manufacturer: z.string().max(240).nullable(),
  prescriptionType: z.string().max(120).nullable(),
  status: z.string().min(1).max(40),
  description: z.string().nullable(),
  isEssential: z.boolean(),
  isPediatricEssential: z.boolean(),
  isNewbornEssential: z.boolean(),
  activeSince: z.string().date().nullable()
});

const snapshotSchema = z.object({
  source: z.literal("TİTCK SKRS E-Reçete İlaç ve Diğer Farmasötik Ürünler Listesi"),
  publishedAt: z.string().date(),
  sourceDocumentUrl: z.string().url().startsWith("https://titck.gov.tr/"),
  // An official active-products export contains thousands of rows. Refuse a
  // suspiciously small snapshot so a malformed file cannot empty production.
  products: z.array(productSchema).min(1_000).max(50_000)
});

const snapshotPath = process.argv[2];
if (!snapshotPath) {
  throw new Error("Usage: npm run db:import-titck -- <normalized-snapshot.json>");
}

const snapshot = snapshotSchema.parse(
  JSON.parse(await readFile(resolve(snapshotPath), "utf8")) as unknown
);
const uniqueGtins = new Set(snapshot.products.map((product) => product.gtin));
if (uniqueGtins.size !== snapshot.products.length) {
  throw new Error("The normalized TİTCK snapshot contains duplicate barcodes.");
}

const db = getDb();
const importedAt = new Date();
const batchSize = 500;
const result = await db.transaction(async (tx) => {
  const [latestImport] = await tx
    .select({ sourcePublishedAt: titckSkrsProducts.sourcePublishedAt })
    .from(titckSkrsProducts)
    .orderBy(desc(titckSkrsProducts.sourcePublishedAt))
    .limit(1);
  if (latestImport && latestImport.sourcePublishedAt > snapshot.publishedAt) {
    throw new Error(
      `Refusing to replace the newer ${latestImport.sourcePublishedAt} TİTCK snapshot with ${snapshot.publishedAt}.`
    );
  }

  for (let offset = 0; offset < snapshot.products.length; offset += batchSize) {
    const batch = snapshot.products.slice(offset, offset + batchSize);
    await tx
      .insert(titckSkrsProducts)
      .values(
        batch.map((product) => ({
          ...product,
          sourcePublishedAt: snapshot.publishedAt,
          sourceDocumentUrl: snapshot.sourceDocumentUrl,
          importedAt
        }))
      )
      .onConflictDoUpdate({
        target: titckSkrsProducts.gtin,
        set: {
          name: sql`excluded.name`,
          atcCode: sql`excluded.atc_code`,
          atcName: sql`excluded.atc_name`,
          manufacturer: sql`excluded.manufacturer`,
          prescriptionType: sql`excluded.prescription_type`,
          status: sql`excluded.status`,
          description: sql`excluded.description`,
          isEssential: sql`excluded.is_essential`,
          isPediatricEssential: sql`excluded.is_pediatric_essential`,
          isNewbornEssential: sql`excluded.is_newborn_essential`,
          activeSince: sql`excluded.active_since`,
          sourcePublishedAt: sql`excluded.source_published_at`,
          sourceDocumentUrl: sql`excluded.source_document_url`,
          importedAt: sql`excluded.imported_at`
        }
      });
  }

  const removed = await tx
    .delete(titckSkrsProducts)
    .where(ne(titckSkrsProducts.sourcePublishedAt, snapshot.publishedAt))
    .returning({ gtin: titckSkrsProducts.gtin });
  return { removed: removed.length };
});

console.log(
  JSON.stringify({
    imported: snapshot.products.length,
    removed: result.removed,
    publishedAt: snapshot.publishedAt,
    sourceDocumentUrl: snapshot.sourceDocumentUrl
  })
);
