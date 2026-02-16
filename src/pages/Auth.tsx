import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ShieldAlert } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COMMON_TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Toronto', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo',
  'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland',
  'Africa/Cairo', 'Africa/Johannesburg',
];

function getAllTimezones(): string[] {
  try {
    const intl = Intl as any;
    if (intl.supportedValuesOf) return intl.supportedValuesOf('timeZone');
    return COMMON_TIMEZONES;
  } catch { return COMMON_TIMEZONES; }
}

function guessUserTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
  catch { return 'UTC'; }
}

const COMMON_PASSWORDS = ['password', 'password1', '12345678', 'qwerty123', 'abc12345', 'letmein1', 'welcome1', 'admin123', 'iloveyou', 'monkey123'];

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState(guessUserTimezone());
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [blockedMinutes, setBlockedMinutes] = useState(0);

  const timezones = useMemo(() => getAllTimezones(), []);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 10) errors.push('At least 10 characters');
    if (!/[A-Z]/.test(pwd)) errors.push('At least one uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('At least one lowercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('At least one number');
    if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('At least one special character');
    if (/(.)\1{2,}/.test(pwd)) errors.push('No 3+ repeating characters');
    if (COMMON_PASSWORDS.some(cp => pwd.toLowerCase().includes(cp))) errors.push('Must not contain common passwords');
    if (email && pwd.toLowerCase().includes(email.split('@')[0].toLowerCase()) && email.split('@')[0].length > 2) errors.push('Must not contain your email username');
    return errors;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (!isLogin && val.length > 0) {
      setPasswordErrors(validatePassword(val));
    } else {
      setPasswordErrors([]);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Don't auto-redirect; login handler manages 2FA flow
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const verified = sessionStorage.getItem('2fa_verified');
        if (verified === 'true') {
          navigate('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkLoginAttempts = async (): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke('login-attempts', {
        body: { action: 'check', email: email.toLowerCase() },
      });
      if (response.data?.blocked) {
        setBlocked(true);
        setBlockedMinutes(response.data.remainingMinutes || 15);
        return false;
      }
      setBlocked(false);
      return true;
    } catch {
      // If the check fails, allow the attempt
      return true;
    }
  };

  const logLoginAttempt = async (success: boolean) => {
    try {
      await supabase.functions.invoke('login-attempts', {
        body: { action: 'log', email: email.toLowerCase(), success },
      });
    } catch {
      // Non-critical, don't block the flow
    }
  };

  const check2FARequired = async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('user_2fa')
        .select('is_enabled')
        .eq('user_id', userId)
        .maybeSingle();
      return data?.is_enabled === true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Check rate limiting
        const allowed = await checkLoginAttempts();
        if (!allowed) {
          toast.error(`Too many failed attempts. Try again in ${blockedMinutes} minutes.`);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          await logLoginAttempt(false);
          throw error;
        }

        await logLoginAttempt(true);

        // Check if 2FA is required
        if (data.user) {
          const has2FA = await check2FARequired(data.user.id);
          if (has2FA) {
            // Already set up — just ask for OTP
            navigate(`/auth/verify-2fa?uid=${data.user.id}`);
          } else {
            // First time — show QR setup
            navigate(`/auth/verify-2fa?uid=${data.user.id}&setup=true`);
          }
          return;
        }
      } else {
        const errors = validatePassword(password);
        if (errors.length > 0) {
          setPasswordErrors(errors);
          toast.error('Please fix password requirements');
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, timezone }
          }
        });
        if (error) throw error;

        if (data.user) {
          await supabase
            .from('profiles')
            .update({ timezone })
            .eq('user_id', data.user.id);
        }

        toast.success('Account created successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const PASSWORD_RULES = [
    'At least 10 characters', 'At least one uppercase letter',
    'At least one lowercase letter', 'At least one number',
    'At least one special character', 'No 3+ repeating characters',
    'Must not contain common passwords', 'Must not contain your email username',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-lg p-8">
        <div className="flex justify-center mb-8">
          <img
            src="/images/klarity-logo-full.png"
            alt="KlaRity by Infosec Ventures"
            className="h-20 w-auto logo-dark-mode-adjust"
          />
        </div>

        {/* Login/Sign Up Toggle */}
        <div className="flex bg-muted rounded-lg p-1 mb-8">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setBlocked(false); }}
            className={`flex-1 py-3 text-sm font-medium rounded-md transition-all ${
              isLogin
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setBlocked(false); }}
            className={`flex-1 py-3 text-sm font-medium rounded-md transition-all ${
              !isLogin
                ? 'bg-card text-foreground shadow-sm'
                : 'text-[hsl(0,72%,51%)] hover:text-[hsl(0,72%,45%)]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Blocked Warning */}
        {blocked && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">
              Too many failed login attempts. Please try again in {blockedMinutes} minute{blockedMinutes !== 1 ? 's' : ''}.
            </p>
          </div>
        )}

        {isLogin ? (
          <form method="post" action="/auth" onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-12 rounded-lg border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-label="Current password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                required
                minLength={1}
                className="h-12 rounded-lg border-border"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-lg text-base font-medium bg-[hsl(0,72%,51%)] hover:bg-[hsl(0,72%,45%)] text-white"
              disabled={loading || blocked}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
        ) : (
          <form method="post" action="/auth" onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="signup-fullname" className="text-sm font-medium">Full Name</Label>
              <Input
                id="signup-fullname"
                name="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                className="h-12 rounded-lg border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
              <Input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="username email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-12 rounded-lg border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
              <Input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                aria-label="New password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                required
                minLength={10}
                className="h-12 rounded-lg border-border"
              />
              {password.length > 0 && (
                <ul className="text-xs space-y-0.5 mt-1">
                  {PASSWORD_RULES.map(rule => {
                    const passed = !passwordErrors.includes(rule);
                    return (
                      <li key={rule} className={passed ? 'text-rag-green' : 'text-destructive'}>
                        {passed ? '✓' : '✗'} {rule}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm font-medium">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="h-12 rounded-lg border-border">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {timezones.map(tz => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-lg text-base font-medium bg-[hsl(0,72%,51%)] hover:bg-[hsl(0,72%,45%)] text-white"
              disabled={loading || blocked}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
