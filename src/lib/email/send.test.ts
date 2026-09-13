import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const smtp = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  close: vi.fn()
}));
vi.mock("nodemailer", () => ({ default: { createTransport: smtp.createTransport } }));
vi.mock("@/lib/db/client", () => ({ getDb: vi.fn() }));

import { isEmailConfigured, requireEmailConfigured, sendSecurityEmail } from "./send";

const email = {
  to: "recipient@example.com",
  subject: "Etakas giriş kodunuz",
  text: "Yalnızca test iletisi",
  idempotencyKey: "login-unit-test"
};

function configureGmail() {
  vi.stubEnv("EMAIL_PROVIDER", "gmail");
  vi.stubEnv("GMAIL_USER", "sender@gmail.com");
  vi.stubEnv("GMAIL_APP_PASSWORD", "abcd efgh ijkl mnop");
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of [
    "EMAIL_PROVIDER",
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
    "EMAIL_FROM",
    "RESEND_API_KEY"
  ]) {
    vi.stubEnv(key, "");
  }
  smtp.createTransport.mockReturnValue({ sendMail: smtp.sendMail, close: smtp.close });
  smtp.sendMail.mockResolvedValue({ accepted: [email.to], rejected: [] });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("security email", () => {
  it("checks Gmail configuration without contacting a provider", () => {
    configureGmail();
    expect(requireEmailConfigured()).toEqual({
      provider: "gmail",
      user: "sender@gmail.com",
      appPassword: "abcdefghijklmnop"
    });
    expect(smtp.createTransport).not.toHaveBeenCalled();
  });

  it("rejects missing credentials, non-Gmail senders and mismatched From", () => {
    expect(isEmailConfigured()).toBe(false);
    configureGmail();
    vi.stubEnv("EMAIL_FROM", "someone-else@gmail.com");
    expect(isEmailConfigured()).toBe(false);
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("GMAIL_USER", "sender@example.com");
    expect(isEmailConfigured()).toBe(false);
    vi.stubEnv("GMAIL_USER", "sender@gmail.com");
    vi.stubEnv("GMAIL_APP_PASSWORD", "ordinary-password");
    expect(isEmailConfigured()).toBe(false);
  });

  it("uses fixed Gmail TLS settings and binds the envelope sender", async () => {
    configureGmail();
    await sendSecurityEmail(email);
    expect(smtp.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        tls: expect.objectContaining({ rejectUnauthorized: true, minVersion: "TLSv1.2" }),
        disableFileAccess: true,
        disableUrlAccess: true,
        logger: false,
        debug: false
      })
    );
    expect(smtp.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { name: "Etakas", address: "sender@gmail.com" },
        envelope: { from: "sender@gmail.com", to: [email.to] }
      })
    );
    expect(smtp.close).toHaveBeenCalledOnce();
  });

  it("rejects header injection before a network connection", async () => {
    configureGmail();
    await expect(
      sendSecurityEmail({ ...email, subject: "Subject\r\nBcc: leaked@example.com" })
    ).rejects.toThrow("SERVICE_UNAVAILABLE");
    await expect(
      sendSecurityEmail({ ...email, to: "recipient@example.com\r\nBcc: leaked@example.com" })
    ).rejects.toThrow("SERVICE_UNAVAILABLE");
    expect(smtp.createTransport).not.toHaveBeenCalled();
  });

  it("replaces SMTP details with a safe error and closes transport", async () => {
    configureGmail();
    smtp.sendMail.mockRejectedValueOnce(new Error("Credentials and recipient leaked by SMTP"));
    await expect(sendSecurityEmail(email)).rejects.toThrow(/^SERVICE_UNAVAILABLE$/);
    expect(smtp.close).toHaveBeenCalledOnce();
  });

  it("does not accept SMTP rejection as successful delivery", async () => {
    configureGmail();
    smtp.sendMail.mockResolvedValueOnce({ accepted: [], rejected: [email.to] });
    await expect(sendSecurityEmail(email)).rejects.toThrow("SERVICE_UNAVAILABLE");
  });

  it("uses Resend only when its sender and API configuration are valid", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "unit-test-key");
    vi.stubEnv("EMAIL_FROM", "accounts@example.com");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendSecurityEmail(email);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({ "Idempotency-Key": email.idempotencyKey })
      })
    );
    expect(smtp.createTransport).not.toHaveBeenCalled();
    vi.stubEnv("RESEND_API_KEY", "key\r\nextra-header");
    expect(isEmailConfigured()).toBe(false);
  });
});
