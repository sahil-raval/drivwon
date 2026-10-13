import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { OAuth2Client } from "google-auth-library";
import { pool } from "../db";

type WorkspaceIdentity = {
  email: string;
  name: string;
  picture?: string;
};

declare module "express-session" {
  interface SessionData {
    oauthState?: string;
    adminAuthenticated?: boolean;
    adminPasswordVersion?: string;
    workspaceUser?: WorkspaceIdentity;
    googleTokensEncrypted?: string;
  }
}

export const workspaceConfig = {
  get databaseReady() {
    return Boolean(pool);
  },
  get adminReady() {
    return Boolean(pool && process.env.SESSION_SECRET && (process.env.DRIVWON_ADMIN_PASSWORD?.length ?? 0) >= 16);
  },
  get oauthReady() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.SESSION_SECRET && (process.env.GOOGLE_ALLOWED_EMAILS || process.env.GOOGLE_ALLOWED_DOMAINS));
  },
};

const loginFailures = new Map<string, { count: number; startedAt: number }>();
const loginWindowMs = 15 * 60 * 1000;
const maxLoginAttempts = 5;

export function attachWorkspaceSessions(app: Express) {
  const secret = process.env.SESSION_SECRET;
  if (!pool || !secret) {
    console.warn("[auth] Workspace sessions are disabled until DATABASE_URL and SESSION_SECRET are configured.");
    return;
  }
  const PgSession = connectPgSimple(session);
  app.set("trust proxy", 1);
  app.use(session({
    name: "drivwon.sid",
    store: new PgSession({
      pool,
      tableName: "drivwon_user_sessions",
      createTableIfMissing: true,
      pruneSessionInterval: 15 * 60,
    }),
    secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    },
  }));
}

function callbackUrl(req: Request) {
  return process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
}

function createOAuthClient(req: Request) {
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, callbackUrl(req));
}

function configurationReady() {
  return workspaceConfig.adminReady;
}

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function currentAdminPasswordVersion() {
  const sessionSecret = process.env.SESSION_SECRET;
  const password = process.env.DRIVWON_ADMIN_PASSWORD;
  if (!sessionSecret || !password) return "";
  return createHmac("sha256", sessionSecret).update(password).digest("hex");
}

function isAdminAuthenticated(req: Request) {
  const expectedVersion = currentAdminPasswordVersion();
  const storedVersion = req.session?.adminPasswordVersion ?? "";
  return Boolean(expectedVersion && req.session?.adminAuthenticated && safeCompare(storedVersion, expectedVersion));
}

function loginAddress(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function getLoginFailure(address: string) {
  const now = Date.now();
  const previous = loginFailures.get(address);
  if (!previous || now - previous.startedAt >= loginWindowMs) {
    loginFailures.set(address, { count: 0, startedAt: now });
    return 0;
  }
  return previous.count;
}

function recordLoginFailure(address: string) {
  const count = getLoginFailure(address) + 1;
  loginFailures.set(address, { count, startedAt: Date.now() });
  if (loginFailures.size > 5000) {
    for (const [key, value] of loginFailures) {
      if (Date.now() - value.startedAt >= loginWindowMs) loginFailures.delete(key);
    }
  }
  return count;
}

function passwordMatches(input: string) {
  const configured = process.env.DRIVWON_ADMIN_PASSWORD ?? "";
  if (!configured || input.length > 512) return false;
  const salt = process.env.SESSION_SECRET ?? "";
  if (!salt) return false;
  const inputHash = scryptSync(input, salt, 32);
  const configuredHash = scryptSync(configured, salt, 32);
  return timingSafeEqual(inputHash, configuredHash);
}

function isAllowedEmail(email: string) {
  const normalized = email.toLowerCase().trim();
  const exact = (process.env.GOOGLE_ALLOWED_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const domains = (process.env.GOOGLE_ALLOWED_DOMAINS ?? "").split(",").map((value) => value.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
  return exact.includes(normalized) || domains.some((domain) => normalized.endsWith(`@${domain}`));
}

function setNoStore(res: Response) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
}

function encryptTokens(tokens: object) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Session encryption is not configured.");
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(secret, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [salt.toString("base64url"), iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptTokens(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Session encryption is not configured.");
  const [saltValue, ivValue, tagValue, ciphertextValue] = value.split(".");
  if (!saltValue || !ivValue || !tagValue || !ciphertextValue) throw new Error("Stored Google connection is invalid. Sign in again.");
  const salt = Buffer.from(saltValue, "base64url");
  const key = scryptSync(secret, salt, 32);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/status", (req, res) => {
    setNoStore(res);
    const authenticated = isAdminAuthenticated(req);
    res.json({
      configured: configurationReady(),
      driveOAuthConfigured: workspaceConfig.oauthReady,
      driveConnected: Boolean(authenticated && req.session?.googleTokensEncrypted),
      user: authenticated ? req.session?.workspaceUser ?? { email: "Admin access", name: "Drivwon admin" } : null,
    });
  });

  app.post("/api/auth/login", async (req, res, next) => {
    setNoStore(res);
    if (!configurationReady() || !req.session) {
      return res.status(503).json({ error: "Private workspace setup is incomplete. Configure its server secrets and database first." });
    }
    const origin = req.get("origin");
    try {
      if (!origin || new URL(origin).host !== req.get("host")) {
        return res.status(403).json({ error: "Sign-in request was not from this website." });
      }
    } catch {
      return res.status(403).json({ error: "Sign-in request was not from this website." });
    }
    const address = loginAddress(req);
    const failures = getLoginFailure(address);
    if (failures >= maxLoginAttempts) {
      res.setHeader("Retry-After", String(Math.ceil((loginWindowMs - (Date.now() - loginFailures.get(address)!.startedAt)) / 1000)));
      return res.status(429).json({ error: "Too many sign-in attempts. Please wait 15 minutes and try again." });
    }
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!passwordMatches(password)) {
      recordLoginFailure(address);
      return res.status(401).json({ error: "The password was not accepted." });
    }
    loginFailures.delete(address);
    try {
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((error) => error ? reject(error) : resolve());
      });
      req.session.adminAuthenticated = true;
      req.session.adminPasswordVersion = currentAdminPasswordVersion();
      await new Promise<void>((resolve, reject) => {
        req.session.save((error) => error ? reject(error) : resolve());
      });
      res.json({ authenticated: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/auth/google", (req, res, next) => {
    if (!isAdminAuthenticated(req)) return res.status(401).redirect("/drivwon/der?error=sign-in-required");
    if (!workspaceConfig.oauthReady || !req.session) {
      return res.status(503).redirect("/drivwon/der?drive-setup=required");
    }
    const state = randomBytes(32).toString("hex");
    req.session.oauthState = state;
    req.session.save((error) => {
      if (error) return next(error);
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
      url.searchParams.set("redirect_uri", callbackUrl(req));
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", ["openid", "email", "profile", "https://www.googleapis.com/auth/drive.file"].join(" "));
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("prompt", "consent");
      url.searchParams.set("include_granted_scopes", "true");
      url.searchParams.set("state", state);
      res.redirect(url.toString());
    });
  });

  app.get("/api/auth/google/callback", async (req, res, next) => {
    try {
      if (!isAdminAuthenticated(req)) return res.status(401).redirect("/drivwon/der?error=sign-in-required");
      if (!workspaceConfig.oauthReady || !req.session) return res.status(503).redirect("/drivwon/der?drive-setup=required");
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const returnedState = typeof req.query.state === "string" ? req.query.state : "";
      const expectedState = req.session.oauthState ?? "";
      delete req.session.oauthState;
      if (!code || !returnedState || !expectedState || !safeCompare(returnedState, expectedState)) {
        return res.status(400).redirect("/drivwon/der?error=invalid-oauth-state");
      }

      const client = createOAuthClient(req);
      const { tokens } = await client.getToken(code);
      if (!tokens.id_token) return res.status(401).redirect("/drivwon/der?error=missing-google-identity");
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
      const profile = ticket.getPayload();
      const email = profile?.email?.toLowerCase().trim();
      if (!email || !profile?.email_verified || !isAllowedEmail(email)) {
        return res.status(403).redirect("/drivwon/der?error=team-access-required");
      }

      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((error) => error ? reject(error) : resolve());
      });
      req.session.adminAuthenticated = true;
      req.session.adminPasswordVersion = currentAdminPasswordVersion();
      req.session.workspaceUser = {
        email,
        name: profile.name || email,
        picture: profile.picture,
      };
      req.session.googleTokensEncrypted = encryptTokens(tokens);
      await new Promise<void>((resolve, reject) => {
        req.session.save((error) => error ? reject(error) : resolve());
      });
      res.redirect("/drivwon/der");
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout", (req, res, next) => {
    if (!req.session) return res.status(204).end();
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie("drivwon.sid", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
      res.status(204).end();
    });
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  setNoStore(res);
  if (!configurationReady()) return res.status(503).json({ error: "Workspace setup is incomplete. Configure the server environment first." });
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: "Enter the private workspace password to continue." });
  next();
}

export function requireDriveUser(req: Request, res: Response, next: NextFunction) {
  requireAdmin(req, res, (error) => {
    if (error) return next(error);
    if (!req.session?.workspaceUser || !req.session.googleTokensEncrypted) {
      return res.status(401).json({ error: "Connect an approved Google account to use Drive." });
    }
    next();
  });
}

export async function getDriveAccessToken(req: Request) {
  if (!req.session?.googleTokensEncrypted) {
    throw Object.assign(new Error("Reconnect Google and grant Drive file access."), { status: 401 });
  }
  const client = createOAuthClient(req);
  const credentials = decryptTokens(req.session.googleTokensEncrypted);
  if (!credentials.refresh_token) throw Object.assign(new Error("Reconnect Google and grant Drive file access."), { status: 401 });
  client.setCredentials(credentials);
  const { token } = await client.getAccessToken();
  if (!token) throw Object.assign(new Error("Google Drive access could not be refreshed. Sign in again."), { status: 401 });
  req.session.googleTokensEncrypted = encryptTokens(client.credentials);
  await new Promise<void>((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
  return token;
}
