import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL ?? "";
if (
  ![
    "postgresql://acceptance@127.0.0.1:55439/acceptance_test",
    "postgresql://acceptance@127.0.0.1:55440/acceptance_test"
  ].includes(databaseUrl)
) {
  throw new Error("Browser acceptance tests require the dedicated local acceptance_test database.");
}
const sql = postgres(databaseUrl, { max: 1 });
const sessionToken = randomBytes(32).toString("base64url");
const adminSessionToken = randomBytes(32).toString("base64url");
let conversationId = "";
let messageId = "";
let listingId = "";
let orderId = "";
let productName = "";
const browserErrors = new WeakMap<object, string[]>();

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    {
      name: "e_takas_cookie_notice",
      value: "2026-09-08",
      url: "http://127.0.0.1:3011",
      sameSite: "Lax"
    }
  ]);
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

test.beforeAll(async () => {
  const userId = randomUUID();
  const senderUserId = randomUUID();
  const adminUserId = randomUUID();
  const orgId = randomUUID();
  const senderOrgId = randomUUID();
  const productId = randomUUID();
  const batchId = randomUUID();
  conversationId = randomUUID();
  messageId = randomUUID();
  listingId = randomUUID();
  orderId = randomUUID();
  productName = `Acceptance ilacı ${productId.slice(0, 8)}`;
  await sql.begin(async (tx) => {
    await tx`insert into users (id,email,name,email_verified) values
      (${userId},${`${userId}@example.invalid`},'Browser fixture',true),
      (${senderUserId},${`${senderUserId}@example.invalid`},'Sender fixture',true),
      (${adminUserId},${`${adminUserId}@example.invalid`},'Admin fixture',true)`;
    await tx`insert into user_roles (user_id,role) values (${adminUserId},'SUPER_ADMIN')`;
    await tx`insert into organizations (id,type,status,legal_name_encrypted,public_alias,province,district,credit_limit_kurus,credit_upper_limit_kurus) values
      (${orgId},'PHARMACY','APPROVED','fixture','Acceptance Pharmacy','Kars','Merkez',100000,200000),
      (${senderOrgId},'PHARMACY','APPROVED','fixture','Sender Pharmacy','Kars','Merkez',100000,200000)`;
    await tx`insert into organization_members (organization_id,user_id,role) values
      (${orgId},${userId},'ORGANIZATION_OWNER'),(${senderOrgId},${senderUserId},'ORGANIZATION_OWNER')`;
    await tx`insert into ledger_accounts (organization_id) values (${orgId}),(${senderOrgId})`;
    await tx`insert into sessions (user_id,token_hash,expires_at,auth_version,email_verified_at)
      values
        (${userId},${createHash("sha256").update(sessionToken).digest("base64url")},now()+interval '1 day',0,now()),
        (${adminUserId},${createHash("sha256").update(adminSessionToken).digest("base64url")},now()+interval '1 day',0,now())`;
    await tx`insert into conversations (id,first_organization_id,second_organization_id)
      values (${conversationId},${orgId < senderOrgId ? orgId : senderOrgId},${orgId < senderOrgId ? senderOrgId : orgId})`;
    await tx`insert into conversation_messages (id,conversation_id,sender_organization_id,sender_user_id,body)
      values (${messageId},${conversationId},${senderOrgId},${senderUserId},'Acceptance browser message')`;
    await tx`insert into notifications (user_id,organization_id,type,title,body,message_id)
      values (${userId},${orgId},'NEW_MESSAGE','New message','Open the message',${messageId}),
             (${userId},${orgId},'ADMIN_DECISION','Limit decision','Acceptance notification',null),
             (${userId},${orgId},'ORDER_HANDOVER','Teslim bilgisi geldi','Siparişiniz için teslim bildirimi yapıldı.',null)`;
    await tx`insert into product_catalog (id,name,type,gtin,control_category)
      values (${productId},${productName},'HUMAN',${productId.replaceAll("-", "").slice(0, 14)},'STANDARD')`;
    await tx`insert into product_batches
      (id,organization_id,product_id,lot_number_encrypted,submitted_name,expiry_date,unit_reference_value_kurus,total_quantity,available_quantity,reserved_quantity,transferred_quantity)
      values (${batchId},${senderOrgId},${productId},'fixture',${productName},'2030-12-31',2500,40,20,0,4)`;
    await tx`insert into listings
      (id,seller_organization_id,batch_id,status,unit_reference_value_kurus,quantity_available,quantity_reserved,min_expiry_date)
      values (${listingId},${senderOrgId},${batchId},'ACTIVE',2500,20,0,'2030-12-31')`;
    await tx`insert into orders
      (id,buyer_organization_id,seller_organization_id,listing_id,status,total_reference_value_kurus,quantity,idempotency_key,completed_at)
      values (${orderId},${orgId},${senderOrgId},${listingId},'COMPLETED',10000,4,${`acceptance-${orderId}`},now())`;
    await tx`insert into order_items
      (order_id,listing_id,batch_id,quantity,unit_reference_value_kurus)
      values (${orderId},${listingId},${batchId},4,2500)`;
    await tx`insert into delivery_confirmations (order_id,actor_user_id,kind,note)
      values (${orderId},${senderUserId},'SELLER_HANDOVER','Acceptance delivery note')`;
  });
});

test.afterAll(async () => {
  await sql.end();
});

test("public pages render with legal and authentication navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Giriş Yap" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /S\.S\.S\.|Sıkça sorulan sorular/ }).first()
  ).toBeVisible();
  await page.goto("/hukuki");
  await expect(page.getByRole("heading", { level: 1, name: "Koşullar ve gizlilik" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Internal Server Error");
});

test("organization session is isolated, badges update, and logout returns to UI", async ({
  context,
  page
}) => {
  await context.addCookies([
    {
      name: "e_takas_session",
      value: sessionToken,
      url: "http://127.0.0.1:3011",
      httpOnly: true,
      sameSite: "Lax"
    }
  ]);
  await page.goto("/panel");
  await expect(page.getByRole("dialog")).toContainText("Teslim bilgisi geldi");
  await page.getByRole("button", { name: "Okudum" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Genel bakış" })).toBeVisible();
  await expect(page.getByLabel("1 okunmamış mesaj")).toBeVisible();
  await expect(page.getByLabel("2 okunmamış bildirim")).toBeVisible();
  await page.goto(`/mesajlar?conversation=${conversationId}`);
  await expect(page.getByText("Acceptance browser message")).toBeVisible();
  await expect(page.getByLabel("1 okunmamış mesaj")).toHaveCount(0);
  await expect(page.getByLabel("1 okunmamış bildirim")).toBeVisible();

  await page.goto("/pazar-yeri");
  await page.getByRole("link", { name: "İlanı ve alım geçmişini incele" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/pazar-yeri/${listingId}$`));
  await expect(page.getByRole("heading", { level: 1, name: productName })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tamamlanan alımlar" })).toBeVisible();
  await expect(page.getByText("Acceptance Pharmacy")).toBeVisible();
  await expect(page.getByText("4 adet")).toBeVisible();

  await page.goto("/siparisler");
  await expect(page.getByRole("heading", { name: "Devam eden siparişler" })).toBeVisible();
  await page.getByText("Geçmiş siparişler", { exact: true }).click();
  await page.getByText(productName, { exact: true }).click();
  await expect(page.getByText("Acceptance Pharmacy")).toBeVisible();
  await expect(page.getByText("Sender Pharmacy")).toBeVisible();

  await page.goto("/bildirimler");
  const decisionCard = page.locator("details").filter({ hasText: "Limit decision" });
  await expect(decisionCard).toHaveAttribute("open", "");
  await decisionCard.getByRole("button", { name: "Bildirimi sil" }).click();
  await expect(decisionCard).toHaveCount(0);

  await page.goto("/admin36100");
  await expect(page).toHaveURL(/\/giris\?next=%2Fadmin36100|\/giris\?next=\/admin36100/);
  await page.goto("/panel");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/\/giris$/);
  await expect(page.getByRole("heading", { level: 1, name: "Giriş yap" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("INVALID_ORIGIN");
});

test("super admin can inspect complete order details", async ({ context, page }) => {
  await context.addCookies([
    {
      name: "e_takas_session",
      value: adminSessionToken,
      url: "http://127.0.0.1:3011",
      httpOnly: true,
      sameSite: "Lax"
    }
  ]);
  await page.goto("/admin36100?tab=orders");
  await expect(page.getByRole("heading", { level: 1, name: "İnceleme ve işlemler" })).toBeVisible();
  const orderCard = page.locator("details.panel-card").filter({ hasText: productName });
  await orderCard.locator(":scope > summary").click();
  await expect(orderCard.getByText(orderId, { exact: true })).toBeVisible();
  await expect(orderCard.getByText("Acceptance Pharmacy")).toBeVisible();
  await expect(orderCard.getByText("Sender Pharmacy")).toBeVisible();
  await orderCard.getByText("Teslim kayıtları ve itirazlar", { exact: true }).click();
  await expect(orderCard.getByText("Acceptance delivery note")).toBeVisible();
});
