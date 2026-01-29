import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { HardHat, Mail, Lock, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";
import * as z from "zod";

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
        toast({
          title: "Please wait",
          description: `Too many failed attempts. Try again in ${seconds}s.`,
          variant: "destructive",
        });
        return;
      }

      if (!isLogin) {
        const lower = password.trim().toLowerCase();
        if (COMMON_PASSWORDS.includes(lower) || lower.includes("password")) {
          toast({
            title: "Weak password",
            description: "Please choose a stronger password (avoid common passwords).",
            variant: "destructive",
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

      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-construction-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-construction-slate border border-construction-steel/30 rounded-xl p-8 shadow-construction">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="SOMPROPERTY" className="h-20 w-20 mb-4" />
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <HardHat className="text-construction-orange" />
              SOMPROPERTY
            </h1>
            <p className="text-construction-concrete mt-2">Project Management System</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-construction-concrete" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-construction-dark border-construction-steel text-white pl-10"
                  placeholder="Enter the email"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-construction-concrete" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-construction-dark border-construction-steel text-white pl-10 pr-10"
                  placeholder="••••••••"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-construction-concrete hover:text-white transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading || checkingBootstrap}
              className="w-full bg-gradient-hero hover:opacity-90 text-white font-bold"
            >
              {checkingBootstrap
                ? "Checking..."
                : loading
                  ? "Processing..."
                  : isLogin
                    ? "Login"
                    : "Create Admin"}
            </Button>
          </form>

          {!adminExists && !checkingBootstrap && (
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full mt-4 text-construction-concrete hover:text-construction-orange transition"
            >
              {isLogin ? "No admin yet? Create the first admin" : "Have an account? Log in"}
            </button>
          )}

          {adminExists && !checkingBootstrap && (
            <p className="mt-4 text-center text-sm text-construction-concrete">
              Admin already initialized — login only.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
