import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import { z } from "zod";
import { SecurityError } from "@/lib/security/request-guards";

type EmailConfiguration =
  | { provider: "gmail"; user: string; appPassword: string }
  | { provider: "resend"; apiKey: string; from: string };

type SecurityEmail = {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
};

const mailboxSchema = z.string().trim().email().max(320);

/** Checks configuration only; never connects to a provider or sends a message. */
export function requireEmailConfigured(): EmailConfiguration {
  const provider = process.env.EMAIL_PROVIDER || "resend";
  if (provider === "gmail") {
    const result = mailboxSchema.safeParse(process.env.GMAIL_USER);
    const user = result.success ? result.data.toLowerCase() : "";
    const appPassword = (process.env.GMAIL_APP_PASSWORD || "").replace(/ /g, "");
    const optionalFrom = process.env.EMAIL_FROM?.trim().toLowerCase();
    if (
      !user ||
      !/@(?:gmail|googlemail)\.com$/.test(user) ||
      !/^[a-z]{16}$/i.test(appPassword) ||
      (optionalFrom && optionalFrom !== user)
    ) {
      throw new SecurityError("SERVICE_UNAVAILABLE", 503);
    }
    return { provider, user, appPassword };
  }
  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM?.trim();
    const address = from?.match(/^[^<>\r\n]+<([^<>\r\n]+)>$/)?.[1] || from;
    if (
      !apiKey ||
      /[\r\n]/.test(apiKey) ||
      !from ||
      from.length > 400 ||
      /[\r\n]/.test(from) ||
      !mailboxSchema.safeParse(address).success
    ) {
      throw new SecurityError("SERVICE_UNAVAILABLE", 503);
    }
    return { provider, apiKey, from };
  }
  throw new SecurityError("SERVICE_UNAVAILABLE", 503);
}

export function isEmailConfigured() {
  try {
    requireEmailConfigured();
    return true;
  } catch {
    return false;
  }
}

async function sendWithGmail(
  config: Extract<EmailConfiguration, { provider: "gmail" }>,
  email: SecurityEmail
) {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: config.user, pass: config.appPassword },
    tls: { servername: "smtp.gmail.com", minVersion: "TLSv1.2", rejectUnauthorized: true },
    dnsTimeout: 5000,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
    pool: false,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true
  });
  try {
    // SMTP does not guarantee idempotency. A stable Message-ID only assists mail clients.
    const messageId = createHash("sha256")
      .update(`${config.user}:${email.idempotencyKey}`)
      .digest("hex");
    const result = await transport.sendMail({
      from: { name: "Etakas", address: config.user },
      to: [{ address: email.to, name: "" }],
      envelope: { from: config.user, to: [email.to] },
      subject: email.subject,
      text: email.text,
      messageId: `<${messageId}@${config.user.split("@")[1]}>`,
      headers: { "Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "All" }
    });
    if (result.accepted.length !== 1 || result.rejected.length > 0) {
      throw new SecurityError("SERVICE_UNAVAILABLE", 503);
    }
  } catch {
    // Never expose SMTP errors, recipients, credentials, codes, or reset links.
    throw new SecurityError("SERVICE_UNAVAILABLE", 503);
  } finally {
    transport.close();
  }
}

export async function sendSecurityEmail(email: SecurityEmail) {
  const config = requireEmailConfigured();
  const recipient = mailboxSchema.safeParse(email.to);
  if (
    !recipient.success ||
    !email.subject ||
    email.subject.length > 200 ||
    /[\r\n]/.test(email.subject) ||
    !email.text ||
    email.text.length > 20000 ||
    !/^[a-zA-Z0-9_-]{1,200}$/.test(email.idempotencyKey)
  ) {
    throw new SecurityError("SERVICE_UNAVAILABLE", 503);
  }
  const message = { ...email, to: recipient.data };
  if (config.provider === "gmail") return sendWithGmail(config, message);

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey
      },
      body: JSON.stringify({
        from: config.from,
        to: [message.to],
        subject: message.subject,
        text: message.text
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    throw new SecurityError("SERVICE_UNAVAILABLE", 503);
  }
  // Never log provider response bodies: they can contain recipient details.
  if (!response.ok) throw new SecurityError("SERVICE_UNAVAILABLE", 503);
}
