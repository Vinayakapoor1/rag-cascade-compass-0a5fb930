
-- Table: login_attempts (tracks failed/successful login attempts for rate limiting)
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  ip_fingerprint text
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow anon inserts (pre-auth, edge function uses service role anyway)
-- No direct client access needed; edge functions use service role key
CREATE POLICY "Service role only for login_attempts"
  ON public.login_attempts
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Table: user_2fa (stores TOTP secrets for two-factor authentication)
CREATE TABLE public.user_2fa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  totp_secret text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;

-- Users can read their own 2FA settings
CREATE POLICY "Users can view own 2fa"
  ON public.user_2fa
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own 2FA settings
CREATE POLICY "Users can update own 2fa"
  ON public.user_2fa
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own 2FA row
CREATE POLICY "Users can insert own 2fa"
  ON public.user_2fa
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all 2FA settings
CREATE POLICY "Admins can view all 2fa"
  ON public.user_2fa
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Create index for fast login attempt lookups
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);
