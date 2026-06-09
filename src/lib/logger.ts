import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "password",
      "token",
      "authorization",
      "secret",
      "*.password",
      "*.token",
      "*.authorization",
      "*.serialNumber",
      "*.taxNumber"
    ],
    censor: "[redacted]"
  }
});
