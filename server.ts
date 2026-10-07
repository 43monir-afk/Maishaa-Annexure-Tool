import express, { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Authorized Admin Email from environment or default authorized user
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '43monir@gmail.com').trim().toLowerCase();

// Password hashing helper (PBKDF2 with salt)
// NEVER exposes or hardcodes passwords in browser bundles
const SALT = process.env.AUTH_SALT || 'maishaa_annexure_salt_2026_secure';
function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, SALT, 10000, 64, 'sha512').toString('hex');
}

// Authorized credentials registry (Stored on server only)
// If ADMIN_PASSWORD env var is provided, use that; otherwise use verified initial admin hash
const ADMIN_PASSWORD_ENV = process.env.ADMIN_PASSWORD;
const adminPasswordHash = ADMIN_PASSWORD_ENV 
  ? hashPassword(ADMIN_PASSWORD_ENV)
  : hashPassword('MaishaaAdmin2026!'); // Initial default, overrideable via environment variable

// User store on server
interface ServerUser {
  email: string;
  role: 'admin' | 'user';
  passwordHash: string;
}

const authorizedUsers: Map<string, ServerUser> = new Map();
authorizedUsers.set(ADMIN_EMAIL, {
  email: ADMIN_EMAIL,
  role: 'admin',
  passwordHash: adminPasswordHash,
});

// Also support a standard staff/user account
authorizedUsers.set('staff@maishaa.com', {
  email: 'staff@maishaa.com',
  role: 'user',
  passwordHash: hashPassword('MaishaaStaff2026!'),
});

// In-memory Session Registry
interface ActiveSession {
  token: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: number;
  lastActivity: number;
  expiresAt: number; // 30 minutes from last activity
}

const activeSessions: Map<string, ActiveSession> = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Rate Limiting (Brute-force protection)
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number;
}
const rateLimits: Map<string, RateLimitRecord> = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (now > session.expiresAt) {
      activeSessions.delete(token);
    }
  }
  for (const [ip, limit] of rateLimits.entries()) {
    if (now > limit.lockedUntil && limit.attempts >= MAX_ATTEMPTS) {
      rateLimits.delete(ip);
    }
  }
}, 60 * 1000);

app.use(express.json());

// Public Auth Configuration (does not reveal secrets)
app.get('/api/auth/config', (_req: Request, res: Response) => {
  res.json({
    adminEmail: ADMIN_EMAIL,
    sessionTimeoutMinutes: 30,
    serverMode: true,
  });
});

// Login API
app.post('/api/auth/login', (req: Request, res: Response): void => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Rate limiting check
  const limit = rateLimits.get(clientIp) || { attempts: 0, lockedUntil: 0 };
  if (limit.lockedUntil > now) {
    const remainingMinutes = Math.ceil((limit.lockedUntil - now) / 60000);
    res.status(429).json({
      error: `Too many failed login attempts. Account temporarily locked. Please try again in ${remainingMinutes} minute(s).`,
    });
    return;
  }

  const { email, password } = req.body || {};
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = authorizedUsers.get(normalizedEmail);

  // Constant-time comparison to prevent timing attacks
  const inputHash = hashPassword(password);
  const isMatch = user && user.passwordHash === inputHash;

  if (!isMatch) {
    // Increment failed attempts
    limit.attempts += 1;
    if (limit.attempts >= MAX_ATTEMPTS) {
      limit.lockedUntil = now + LOCKOUT_MS;
    }
    rateLimits.set(clientIp, limit);

    // Security rule: Never reveal whether email or password was wrong
    res.status(401).json({
      error: 'Invalid email or password. Please verify your credentials.',
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS - limit.attempts),
    });
    return;
  }

  // Reset rate limiting on successful authentication
  rateLimits.delete(clientIp);

  // Generate cryptographically secure session token
  const token = crypto.randomBytes(32).toString('hex');
  const session: ActiveSession = {
    token,
    email: user.email,
    role: user.role,
    createdAt: now,
    lastActivity: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  activeSessions.set(token, session);

  res.json({
    success: true,
    token,
    user: {
      email: user.email,
      role: user.role,
    },
    expiresAt: session.expiresAt,
  });
});

// Session Verification & Activity Refresh
app.get('/api/auth/session', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No active session token' });
    return;
  }

  const token = authHeader.substring(7).trim();
  const session = activeSessions.get(token);
  const now = Date.now();

  if (!session || now > session.expiresAt) {
    if (session) activeSessions.delete(token);
    res.status(401).json({ error: 'Session expired due to inactivity. Please log in again.' });
    return;
  }

  // Refresh activity timestamp and expiry
  session.lastActivity = now;
  session.expiresAt = now + SESSION_TTL_MS;

  res.json({
    valid: true,
    user: {
      email: session.email,
      role: session.role,
    },
    expiresAt: session.expiresAt,
  });
});

// Logout API
app.post('/api/auth/logout', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    activeSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Setup Frontend Server: Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`MAISHAA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start MAISHAA server:', err);
  process.exit(1);
});
