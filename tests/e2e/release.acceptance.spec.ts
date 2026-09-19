import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl !== "postgresql://acceptance@127.0.0.1:55439/acceptance_test") {
  throw new Error("Browser acceptance tests require the dedicated local acceptance_test database.");
}
const sql = postgres(databaseUrl, { max: 1 });
const sessionToken = randomBytes(32).toString("base64url");
let conversationId = "";
let messageId = "";
const browserErrors = new WeakMap<object, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

test.beforeAll(async () => {
  const userId = randomUUID();
  const senderUserId = randomUUID();
  const orgId = randomUUID();
  const senderOrgId = randomUUID();
  conversationId = randomUUID();
  messageId = randomUUID();
  await sql.begin(async tx => {
    await tx`insert into users (id,email,name,email_verified) values
      (${userId},${`${userId}@example.invalid`},'Browser fixture',true),
      (${senderUserId},${`${senderUserId}@example.invalid`},'Sender fixture',true)`;
    await tx`insert into organizations (id,type,status,legal_name_encrypted,public_alias,province,district,credit_limit_kurus,credit_upper_limit_kurus) values
      (${orgId},'PHARMACY','APPROVED','fixture','Acceptance Pharmacy','Kars','Merkez',100000,200000),
      (${senderOrgId},'PHARMACY','APPROVED','fixture','Sender Pharmacy','Kars','Merkez',100000,200000)`;
    await tx`insert into organization_members (organization_id,user_id,role) values
      (${orgId},${userId},'ORGANIZATION_OWNER'),(${senderOrgId},${senderUserId},'ORGANIZATION_OWNER')`;
    await tx`insert into ledger_accounts (organization_id) values (${orgId}),(${senderOrgId})`;
    await tx`insert into sessions (user_id,token_hash,expires_at,auth_version,email_verified_at)
      values (${userId},${createHash("sha256").update(sessionToken).digest("base64url")},now()+interval '1 day',0,now())`;
    await tx`insert into conversations (id,first_organization_id,second_organization_id)
      values (${conversationId},${orgId < senderOrgId ? orgId : senderOrgId},${orgId < senderOrgId ? senderOrgId : orgId})`;
    await tx`insert into conversation_messages (id,conversation_id,sender_organization_id,sender_user_id,body)
      values (${messageId},${conversationId},${senderOrgId},${senderUserId},'Acceptance browser message')`;
    await tx`insert into notifications (user_id,organization_id,type,title,body,message_id)
      values (${userId},${orgId},'NEW_MESSAGE','New message','Open the message',${messageId}),
             (${userId},${orgId},'ADMIN_DECISION','Limit decision','Acceptance notification',null)`;
  });
});

test.afterAll(async () => { await sql.end(); });

test("public pages render with legal and authentication navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Giriş Yap" })).toBeVisible();
  await expect(page.getByRole("link", { name: /S\.S\.S\.|Sıkça sorulan sorular/ }).first()).toBeVisible();
  await page.goto("/hukuki");
  await expect(page.getByRole("heading", { level: 1, name: "Koşullar ve gizlilik" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Internal Server Error");
});

test("organization session is isolated, badges update, and logout returns to UI", async ({ context, page }) => {
  await context.addCookies([{ name: "e_takas_session", value: sessionToken, url: "http://127.0.0.1:3011", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/panel");
  await expect(page.getByRole("heading", { name: "Genel bakış" })).toBeVisible();
  await expect(page.getByLabel("1 okunmamış mesaj")).toBeVisible();
  await expect(page.getByLabel("2 okunmamış bildirim")).toBeVisible();
  await page.goto(`/mesajlar?conversation=${conversationId}`);
  await expect(page.getByText("Acceptance browser message")).toBeVisible();
  await expect(page.getByLabel("1 okunmamış mesaj")).toHaveCount(0);
  await expect(page.getByLabel("1 okunmamış bildirim")).toBeVisible();
  await page.goto("/admin36100");
  await expect(page).toHaveURL(/\/giris\?next=%2Fadmin36100|\/giris\?next=\/admin36100/);
  await page.goto("/panel");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/\/giris$/);
  await expect(page.getByRole("heading", { level: 1, name: "Giriş yap" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("INVALID_ORIGIN");
});
