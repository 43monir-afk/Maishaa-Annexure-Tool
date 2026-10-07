export interface AuthUser {
  email: string;
  role: 'admin' | 'user';
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

const SESSION_KEY = 'maishaa_auth_session_v1';
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

class AuthService {
  private currentSession: AuthSession | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<(session: AuthSession | null) => void> = new Set();
  private expirationListeners: Set<() => void> = new Set();

  constructor() {
    this.restoreSession();
    this.setupInactivityListeners();
  }

  // Restore session from sessionStorage (never plaintext password)
  private restoreSession(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed: AuthSession = JSON.parse(raw);
        if (parsed && parsed.expiresAt && Date.now() < parsed.expiresAt) {
          this.currentSession = parsed;
          this.resetInactivityTimer();
        } else {
          sessionStorage.removeItem(SESSION_KEY);
          this.currentSession = null;
        }
      }
    } catch {
      this.currentSession = null;
    }
  }

  // Reset inactivity timer when user interacts with application
  private setupInactivityListeners(): void {
    if (typeof window === 'undefined') return;

    const activityEvents = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => {
      if (this.currentSession) {
        this.resetInactivityTimer();
      }
    };

    // Throttle listener to avoid high frequency calls
    let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
    const throttledHandler = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          handleActivity();
          throttleTimeout = null;
        }, 1000);
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, throttledHandler, { passive: true });
    });
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    if (!this.currentSession) return;

    // Auto-logout after 30 minutes of zero activity
    this.inactivityTimer = setTimeout(() => {
      this.handleSessionExpired();
    }, INACTIVITY_TIMEOUT_MS);
  }

  private handleSessionExpired(): void {
    this.logout();
    this.expirationListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in expiration listener:', err);
      }
    });
  }

  public onSessionExpired(callback: () => void): () => void {
    this.expirationListeners.add(callback);
    return () => this.expirationListeners.delete(callback);
  }

  public subscribe(callback: (session: AuthSession | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentSession);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.currentSession);
      } catch (err) {
        console.error('Error in session subscriber:', err);
      }
    });
  }

  public async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Invalid email or password. Please verify your credentials.',
        };
      }

      const session: AuthSession = {
        token: data.token,
        user: data.user,
        expiresAt: data.expiresAt || Date.now() + INACTIVITY_TIMEOUT_MS,
      };

      this.currentSession = session;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      this.resetInactivityTimer();
      this.notify();

      return { success: true };
    } catch {
      // In case backend is completely offline (e.g., pure static Blogger preview),
      // we gracefully report error or indicate backend connectivity requirement.
      return {
        success: false,
        error: 'Unable to reach authentication server. Please check your network connection.',
      };
    }
  }

  public async logout(): Promise<void> {
    const token = this.currentSession?.token;
    this.currentSession = null;
    sessionStorage.removeItem(SESSION_KEY);

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    this.notify();

    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Silently catch server communication issues on logout
      }
    }
  }

  public getSession(): AuthSession | null {
    if (this.currentSession && Date.now() > this.currentSession.expiresAt) {
      this.logout();
      return null;
    }
    return this.currentSession;
  }

  public getUser(): AuthUser | null {
    const session = this.getSession();
    return session ? session.user : null;
  }

  public isAuthenticated(): boolean {
    return this.getSession() !== null;
  }

  public isAdmin(): boolean {
    const user = this.getUser();
    return user !== null && user.role === 'admin';
  }
}

export const authService = new AuthService();
