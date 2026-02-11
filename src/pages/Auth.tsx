import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Africa/Cairo',
  'Africa/Johannesburg',
];

function getAllTimezones(): string[] {
  try {
    const intl = Intl as any;
    if (intl.supportedValuesOf) {
      return intl.supportedValuesOf('timeZone');
    }
    return COMMON_TIMEZONES;
  } catch {
    return COMMON_TIMEZONES;
  }
}

function guessUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState(guessUserTimezone());
  const [loading, setLoading] = useState(false);

  const timezones = useMemo(() => getAllTimezones(), []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Logged in successfully');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, timezone }
          }
        });
        if (error) throw error;
        
        // Update profile with timezone after signup
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-lg p-8">
        {/* Logo */}
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
            onClick={() => setIsLogin(true)}
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
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 text-sm font-medium rounded-md transition-all ${
              !isLogin 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-[hsl(0,72%,51%)] hover:text-[hsl(0,72%,45%)]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required={!isLogin}
                className="h-12 rounded-lg border-border"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="h-12 rounded-lg border-border"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="h-12 rounded-lg border-border"
            />
          </div>

          {!isLogin && (
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
          )}
          
          <Button 
            type="submit" 
            className="w-full h-12 rounded-lg text-base font-medium bg-[hsl(0,72%,51%)] hover:bg-[hsl(0,72%,45%)] text-white" 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLogin ? 'Login' : 'Sign Up'}
          </Button>
        </form>
      </div>
    </div>
  );
}
