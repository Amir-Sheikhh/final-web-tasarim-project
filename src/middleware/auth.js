import { AppError } from "../lib/http.js";
import { verifyAccessToken } from "../lib/security.js";

function readAccessToken(req) {
  const header = req.headers.authorization;

  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }

  return req.cookies?.access_token ?? null;
}

export function optionalAuth(req, _res, next) {
  const token = readAccessToken(req);

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role
    };
    return next();
  } catch (_error) {
    return next();
  }
}

export function requireAuth(req, _res, next) {
  const token = readAccessToken(req);

  if (!token) {
    return next(new AppError("Oturum bulunamadi.", 401));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role
    };
    return next();
  } catch (_error) {
    return next(new AppError("Gecersiz veya suresi dolmus oturum.", 401));
  }
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (req.user?.role !== role) {
      return next(new AppError("Bu islem icin yetkiniz yok.", 403));
    }

    return next();
  };
}
