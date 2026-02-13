import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

export default function Verify2FA() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState(false);

  const userId = searchParams.get('uid');
  const setup = searchParams.get('setup') === 'true';

  useEffect(() => {
    if (!userId) {
      navigate('/auth');
      return;
    }
    if (setup) {
      initSetup();
    }
  }, [userId, setup]);

  const initSetup = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const response = await supabase.functions.invoke('setup-2fa', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);

      const data = response.data;
      if (data.already_enabled) {
        setIsSetup(false);
        return;
      }

      setQrUrl(data.qr_url);
      setSecret(data.secret);
      setIsSetup(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to setup 2FA');
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('verify-2fa', {
        body: {
          user_id: userId,
          code,
          action: isSetup ? 'activate' : 'verify',
        },
      });

      if (response.error) throw new Error(response.error.message);

      const data = response.data;
      if (!data.verified) {
        toast.error(data.error || 'Invalid code');
        setCode('');
        return;
      }

      if (isSetup) {
        toast.success('2FA activated successfully!');
      } else {
        toast.success('Verification successful');
      }

      // Store 2FA verified flag in session storage
      sessionStorage.setItem('2fa_verified', 'true');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/images/klarity-logo-full.png"
            alt="KlaRity by Infosec Ventures"
            className="h-16 w-auto logo-dark-mode-adjust"
          />
        </div>

        <div className="text-center mb-6">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
          {isSetup ? (
            <p className="text-sm text-muted-foreground mt-2">
              Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">
              Enter the 6-digit code from your authenticator app.
            </p>
          )}
        </div>

        {/* QR Code for setup */}
        {isSetup && qrUrl && (
          <div className="flex flex-col items-center mb-6">
            <img src={qrUrl} alt="2FA QR Code" className="w-48 h-48 rounded-lg border" />
            {secret && (
              <div className="mt-3 text-center">
                <p className="text-xs text-muted-foreground">Manual entry key:</p>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded select-all">
                  {secret}
                </code>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Download:{' '}
              <a
                href="https://itunes.apple.com/app/google-authenticator/id388497605?mt=8"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                iOS
              </a>{' '}
              |{' '}
              <a
                href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Android
              </a>
            </p>
          </div>
        )}

        {/* OTP Input */}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          onClick={handleVerify}
          className="w-full h-12 rounded-lg text-base font-medium bg-[hsl(0,72%,51%)] hover:bg-[hsl(0,72%,45%)] text-white"
          disabled={loading || code.length !== 6}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSetup ? 'Activate 2FA' : 'Verify & Proceed'}
        </Button>

        <button
          type="button"
          onClick={() => navigate('/auth')}
          className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground text-center"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
