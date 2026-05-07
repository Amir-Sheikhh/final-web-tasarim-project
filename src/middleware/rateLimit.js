import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { appConfig } from "../config.js";

function buildLimiter(windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
    message: {
      error: message
    }
  });
}

export const authLimiter = buildLimiter(
  appConfig.rateLimit.authWindowMs,
  appConfig.rateLimit.authMax,
  "Cok fazla giris denemesi yapildi. Lutfen biraz sonra tekrar deneyin."
);

export const readLimiter = buildLimiter(
  appConfig.rateLimit.readWindowMs,
  appConfig.rateLimit.readMax,
  "Okuma limiti gecildi. Lutfen biraz sonra tekrar deneyin."
);

export const writeLimiter = buildLimiter(
  appConfig.rateLimit.writeWindowMs,
  appConfig.rateLimit.writeMax,
  "Yazma limiti gecildi. Lutfen biraz sonra tekrar deneyin."
);
