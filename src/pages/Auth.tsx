import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { HardHat, Mail, Lock, Eye, EyeOff } from "lucide-react";
import logoDark from "@/assets/logo-dark.png";
import authHero from "@/assets/auth-hero.png";
import * as z from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

const COMMON_PASSWORDS = [
  "password",
  "password123",
  "123456",
  "12345678",
  "qwerty",
  "letmein",
  "admin",
  "welcome",
  "iloveyou",
  "monkey",
];

const AUTH_GUARD_STORAGE_KEY = "somproperty_auth_guard_v1";

type AuthGuardState = {
  attempts: number;
  lockedUntil: number; // epoch ms
  lastFailureAt: number; // epoch ms
};

function readAuthGuardState(email: string): AuthGuardState {
  try {
    const raw = localStorage.getItem(AUTH_GUARD_STORAGE_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, AuthGuardState>) : {};
    return obj[email] ?? { attempts: 0, lockedUntil: 0, lastFailureAt: 0 };
  } catch {
    return { attempts: 0, lockedUntil: 0, lastFailureAt: 0 };
  }
}

function writeAuthGuardState(email: string, state: AuthGuardState) {
  try {
    const raw = localStorage.getItem(AUTH_GUARD_STORAGE_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, AuthGuardState>) : {};
    obj[email] = state;
    localStorage.setItem(AUTH_GUARD_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

function clearAuthGuardState(email: string) {
  writeAuthGuardState(email, { attempts: 0, lockedUntil: 0, lastFailureAt: 0 });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(null);
  const [checkingBootstrap, setCheckingBootstrap] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean>(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // If already authenticated, never keep the user on /auth.
  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) navigate("/dashboard", { replace: true });
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) navigate("/dashboard", { replace: true });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const authSchema = useMemo(
    () =>
      z.object({
        email: z.string().trim().email("Invalid email"),
        password: z
          .string()
          .min(12, "Password must be at least 12 characters")
          .max(72, "Password is too long")
          .refine((v) => /[a-z]/.test(v), "Add at least one lowercase letter")
          .refine((v) => /[A-Z]/.test(v), "Add at least one uppercase letter")
          .refine((v) => /\d/.test(v), "Add at least one number")
          .refine((v) => /[^A-Za-z0-9]/.test(v), "Add at least one symbol"),
        // Note: common password check is done in code (below) so we can craft a friendlier message.
      }),
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("admin-exists");
        if (error) throw error;
        const exists = Boolean((data as any)?.adminExists);
        if (!mounted) return;
        setAdminExists(exists);
        // If an admin already exists, always show login only.
        if (exists) setIsLogin(true);
      } catch {
        // Fail closed: if we can't determine, default to login-only.
        if (mounted) {
          setAdminExists(true);
          setIsLogin(true);
        }
      } finally {
        if (mounted) setCheckingBootstrap(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      const parsed = authSchema.safeParse({ email, password });
      if (!parsed.success) {
        toast({
          title: "Invalid input",
          description: parsed.error.issues[0]?.message,
          variant: "destructive",
        });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const guard = readAuthGuardState(normalizedEmail);
      const now = Date.now();
      if (guard.lockedUntil > now) {
        const seconds = Math.ceil((guard.lockedUntil - now) / 1000);
          setFormError({
            title: "Too many attempts",
            message: `Too many failed attempts. Try again in ${seconds}s.`,
          });
        return;
      }

      if (!isLogin) {
        const lower = password.trim().toLowerCase();
        if (COMMON_PASSWORDS.includes(lower) || lower.includes("password")) {
          setFormError({
            title: "Weak password",
            message: "Please choose a stronger password (avoid common passwords).",
          });
          return;
        }
      }

      // Basic brute-force friction (client-side): small delay that increases with failures.
      if (guard.attempts > 0) {
        await sleep(Math.min(1000, 200 + guard.attempts * 150));
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // If the system has no admin yet (fresh install or previous failed bootstrap),
        // promote the first successful login to admin.
        const { data: existsData, error: existsError } = await supabase.functions.invoke("admin-exists");
        if (existsError) throw existsError;
        const exists = Boolean((existsData as any)?.adminExists);
        if (!exists) {
          const { error: bootstrapError } = await supabase.functions.invoke("bootstrap-admin");
          if (bootstrapError) throw bootstrapError;
        }

        toast({
          title: "Welcome back",
          description: "Successfully logged in.",
        });
        clearAuthGuardState(normalizedEmail);
        navigate("/dashboard");
      } else {
        if (adminExists) {
          toast({
            title: "Signup disabled",
            description: "An admin account already exists. Please log in.",
            variant: "destructive",
          });
          setIsLogin(true);
          return;
        }

        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;

        if (!data.user) throw new Error("Signup succeeded but no user returned");

        // Bootstrap the first admin using a privileged backend function.
        const { error: bootstrapError } = await supabase.functions.invoke("bootstrap-admin");
        if (bootstrapError) throw bootstrapError;

        // Log in immediately after bootstrapping.
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;

        toast({
          title: "Admin initialized",
          description: "Your admin account is ready.",
        });
        clearAuthGuardState(normalizedEmail);
        navigate("/dashboard");
      }
    } catch (error: any) {
      // Update local guard state for login attempts.
      const normalizedEmail = email.trim().toLowerCase();
      const prev = readAuthGuardState(normalizedEmail);
      const now = Date.now();

      // Reset attempts if last failure was long ago
      const windowMs = 10 * 60 * 1000; // 10 minutes
      const withinWindow = prev.lastFailureAt && now - prev.lastFailureAt <= windowMs;
      const attempts = withinWindow ? prev.attempts + 1 : 1;
      const lockAfter = 5;
      const lockedUntil = attempts >= lockAfter ? now + 5 * 60 * 1000 : 0; // 5 minutes

      writeAuthGuardState(normalizedEmail, { attempts, lockedUntil, lastFailureAt: now });

      const rawMsg = String(error?.message || "Authentication failed");
      const msg = rawMsg.toLowerCase();

      if (msg.includes("invalid login credentials") || msg.includes("invalid") || msg.includes("credentials")) {
        setFormError({
          title: "Incorrect email or password",
          message: "Please check your email and password and try again.",
        });
      } else if (msg.includes("email not confirmed") || msg.includes("confirm") || msg.includes("not confirmed")) {
        setFormError({
          title: "Email not confirmed",
          message: "Please open your inbox and confirm your email address before logging in.",
        });
      } else {
        setFormError({ title: "Login failed", message: rawMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center">
        <div className="w-full overflow-hidden rounded-[2.75rem] border border-border/70 bg-card/90 shadow-[0_24px_80px_-56px_hsl(var(--foreground)/0.25)] backdrop-blur">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left: form */}
            <div className="p-8 sm:p-12">
              <div className="flex items-center gap-3">
                <img
                  src={logoDark}
                  alt="SOMPROPERTY logo"
                  className="h-10 w-10 rounded-xl object-contain"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">SOMPROPERTY</p>
                  <p className="text-xs text-muted-foreground">Construction OS</p>
                </div>
              </div>

              <div className="mt-10">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">Welcome Back</h1>
                <p className="mt-2 text-sm text-muted-foreground">Let’s login to grab amazing deal</p>
              </div>

              <div className="mt-8 space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center bg-background"
                  disabled
                >
                  Continue with Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center bg-background"
                  disabled
                >
                  Continue with Facebook
                </Button>
              </div>

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">Or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {formError && (
                  <Alert variant="destructive">
                    <AlertTitle>{formError.title}</AlertTitle>
                    <AlertDescription>{formError.message}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="email" className="text-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      required
                      className="pl-10"
                      placeholder="Enter the email"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      required
                      className="pl-10 pr-10"
                      placeholder="••••••••"
                      autoComplete={isLogin ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox />
                    Remember me
                  </label>
                  <button
                    type="button"
                    className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <Button type="submit" disabled={loading || checkingBootstrap} className="w-full font-semibold">
                  {checkingBootstrap
                    ? "Checking..."
                    : loading
                      ? "Processing..."
                      : isLogin
                        ? "Login"
                        : "Create Admin"}
                </Button>
              </form>

              <div className="mt-6">
                {!adminExists && !checkingBootstrap ? (
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="w-full text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {isLogin ? "Don’t have an account? Sign Up" : "Have an account? Log in"}
                  </button>
                ) : adminExists && !checkingBootstrap ? (
                  <p className="text-center text-sm text-muted-foreground">Admin already initialized — login only.</p>
                ) : null}
              </div>
            </div>

            {/* Right: image panel */}
            <div className="relative hidden lg:block p-8">
              <div className="relative h-full min-h-[640px] overflow-hidden rounded-[2.75rem] bg-gradient-hero shadow-[0_24px_80px_-56px_hsl(var(--foreground)/0.28)]">
                <img
                  src={authHero}
                  alt="Abstract 3D brand illustration"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                <div className="absolute left-6 right-6 top-6">
                  <p className="text-right text-sm font-medium text-foreground/90">
                    Browse thousands of properties to buy, sell,
                    <br />
                    or rent with trusted agents.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
