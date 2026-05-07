import { appConfig } from "../config.js";
import { createId, getDemoAccounts } from "../db/init.js";
import { runRead, runWrite } from "../db/query.js";
import { AppError } from "../lib/http.js";
import { removeSavedUpload, removeUploadByUrl, saveProfileImage } from "../lib/uploads.js";
import {
  accessCookieOptions,
  clearCookieOptions,
  comparePassword,
  generateOpaqueToken,
  hashPassword,
  hashToken,
  normalizeEmail,
  refreshCookieOptions,
  signAccessToken
} from "../lib/security.js";

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    headline: user.headline,
    city: user.city,
    bio: user.bio,
    color: user.color,
    profileImageUrl: user.profileImageUrl ?? null,
    profileImageMime: user.profileImageMime ?? null,
    profileImageName: user.profileImageName ?? null,
    createdAt: user.createdAt
  };
}

async function findUserByEmail(email) {
  const result = await runRead(
    `
      MATCH (user:User {email: $email})
      RETURN user { .* } AS user
      LIMIT 1
    `,
    { email }
  );

  return result.records[0]?.get("user") ?? null;
}

export async function getCurrentUser(userId) {
  const result = await runRead(
    `
      MATCH (user:User {id: $userId})
      RETURN user {
        .id,
        .name,
        .email,
        .role,
        .headline,
        .city,
        .bio,
        .color,
        .profileImageUrl,
        .profileImageMime,
        .profileImageName,
        .createdAt
      } AS user
      LIMIT 1
    `,
    { userId }
  );

  return result.records[0]?.get("user") ?? null;
}

async function createRefreshSession(user, meta = {}) {
  const refreshToken = generateOpaqueToken();
  const tokenHash = hashToken(refreshToken);
  const session = {
    id: createId("session"),
    tokenHash,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + appConfig.jwt.refreshDays * 24 * 60 * 60 * 1000).toISOString(),
    userAgent: meta.userAgent || "Unknown",
    ipAddress: meta.ipAddress || "Unknown"
  };

  await runWrite(
    `
      MATCH (user:User {id: $userId})
      CREATE (session:Session {
        id: $session.id,
        tokenHash: $session.tokenHash,
        createdAt: $session.createdAt,
        expiresAt: $session.expiresAt,
        userAgent: $session.userAgent,
        ipAddress: $session.ipAddress
      })
      CREATE (user)-[:HAS_SESSION]->(session)
    `,
    {
      userId: user.id,
      session
    }
  );

  return {
    accessToken: signAccessToken(user),
    refreshToken
  };
}

export function applyAuthCookies(res, tokens) {
  res.cookie("access_token", tokens.accessToken, accessCookieOptions());
  res.cookie("refresh_token", tokens.refreshToken, refreshCookieOptions());
}

export function clearAuthCookies(res) {
  res.clearCookie("access_token", clearCookieOptions());
  res.clearCookie("refresh_token", clearCookieOptions());
}

export async function registerUser(payload, meta = {}) {
  const email = normalizeEmail(payload.email);
  const existing = await findUserByEmail(email);

  if (existing) {
    throw new AppError("Bu e-posta zaten kullaniliyor.", 409);
  }

  const user = {
    id: createId("user"),
    name: payload.name,
    email,
    role: "member",
    headline: payload.headline,
    city: payload.city || "Unknown",
    bio: payload.bio || "Yeni kullanici.",
    color: payload.color || "#0f766e",
    profileImageUrl: null,
    profileImageMime: null,
    profileImageName: null,
    createdAt: new Date().toISOString(),
    passwordHash: await hashPassword(payload.password)
  };
  const profileImage = await saveProfileImage(payload.profileImage);

  if (profileImage) {
    user.profileImageUrl = profileImage.url;
    user.profileImageMime = profileImage.mime;
    user.profileImageName = profileImage.name;
  }

  try {
    await runWrite(
      `
        CREATE (user:User {
          id: $user.id,
          name: $user.name,
          email: $user.email,
          role: $user.role,
          headline: $user.headline,
          city: $user.city,
          bio: $user.bio,
          color: $user.color,
          createdAt: $user.createdAt,
          passwordHash: $user.passwordHash
        })
        FOREACH (_ IN CASE WHEN $user.profileImageUrl IS NULL THEN [] ELSE [1] END |
          SET user.profileImageUrl = $user.profileImageUrl,
              user.profileImageMime = $user.profileImageMime,
              user.profileImageName = $user.profileImageName
        )
      `,
      { user }
    );
  } catch (error) {
    await removeSavedUpload(profileImage);
    throw error;
  }

  const tokens = await createRefreshSession(user, meta);

  return {
    user: sanitizeUser(user),
    tokens
  };
}

export async function loginUser(email, password, meta = {}) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new AppError("E-posta veya sifre hatali.", 401);
  }

  const matches = await comparePassword(password, user.passwordHash);

  if (!matches) {
    throw new AppError("E-posta veya sifre hatali.", 401);
  }

  const tokens = await createRefreshSession(user, meta);

  return {
    user: sanitizeUser(user),
    tokens
  };
}

export async function refreshUserSession(refreshToken, meta = {}) {
  if (!refreshToken) {
    throw new AppError("Refresh oturumu bulunamadi.", 401);
  }

  const tokenHash = hashToken(refreshToken);
  const result = await runRead(
    `
      MATCH (user:User)-[:HAS_SESSION]->(session:Session {tokenHash: $tokenHash})
      RETURN user { .* } AS user, session { .* } AS session
      LIMIT 1
    `,
    { tokenHash }
  );

  const record = result.records[0];
  const user = record?.get("user");
  const session = record?.get("session");

  if (!user || !session) {
    throw new AppError("Refresh oturumu gecersiz.", 401);
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await revokeSession(refreshToken);
    throw new AppError("Refresh oturumu suresi doldu.", 401);
  }

  await revokeSession(refreshToken);
  const tokens = await createRefreshSession(user, meta);

  return {
    user: sanitizeUser(user),
    tokens
  };
}

export async function revokeSession(refreshToken) {
  if (!refreshToken) {
    return;
  }

  await runWrite(
    `
      MATCH (:User)-[:HAS_SESSION]->(session:Session {tokenHash: $tokenHash})
      DETACH DELETE session
    `,
    { tokenHash: hashToken(refreshToken) }
  );
}

export function getPublicDemoAccounts() {
  return {
    password: appConfig.demoPassword,
    accounts: getDemoAccounts()
  };
}

export async function updateCurrentUser(userId, payload) {
  const current = await getCurrentUser(userId);

  if (!current) {
    throw new AppError("Kullanici bulunamadi.", 404);
  }

  const profileImage = await saveProfileImage(payload.profileImage);
  const removeProfileImage = Boolean(payload.removeProfileImage);
  const nextUser = {
    name: payload.name ?? current.name,
    headline: payload.headline ?? current.headline,
    city: payload.city ?? current.city,
    bio: payload.bio ?? current.bio,
    color: payload.color ?? current.color,
    updatedAt: new Date().toISOString(),
    profileImageUrl: profileImage?.url ?? null,
    profileImageMime: profileImage?.mime ?? null,
    profileImageName: profileImage?.name ?? null
  };

  try {
    const result = await runWrite(
      `
        MATCH (user:User {id: $userId})
        SET user.name = $user.name,
            user.headline = $user.headline,
            user.city = $user.city,
            user.bio = $user.bio,
            user.color = $user.color,
            user.updatedAt = $user.updatedAt
        FOREACH (_ IN CASE WHEN $setImage THEN [1] ELSE [] END |
          SET user.profileImageUrl = $user.profileImageUrl,
              user.profileImageMime = $user.profileImageMime,
              user.profileImageName = $user.profileImageName
        )
        FOREACH (_ IN CASE WHEN $clearImage THEN [1] ELSE [] END |
          REMOVE user.profileImageUrl
          REMOVE user.profileImageMime
          REMOVE user.profileImageName
        )
        RETURN user {
          .id,
          .name,
          .email,
          .role,
          .headline,
          .city,
          .bio,
          .color,
          .profileImageUrl,
          .profileImageMime,
          .profileImageName,
          .createdAt
        } AS user
      `,
      {
        userId,
        user: nextUser,
        setImage: Boolean(profileImage),
        clearImage: removeProfileImage && !profileImage
      }
    );

    if (profileImage || removeProfileImage) {
      await removeUploadByUrl(current.profileImageUrl);
    }

    return result.records[0]?.get("user") ?? null;
  } catch (error) {
    await removeSavedUpload(profileImage);
    throw error;
  }
}
