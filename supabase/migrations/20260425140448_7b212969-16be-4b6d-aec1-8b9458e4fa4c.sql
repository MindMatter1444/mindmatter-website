CREATE TABLE public.contact_email_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_email_rate_limit_ip_created
  ON public.contact_email_rate_limit (ip_hash, created_at DESC);

ALTER TABLE public.contact_email_rate_limit ENABLE ROW LEVEL SECURITY;

-- Only admins can read; the edge function uses the service role and bypasses RLS.
CREATE POLICY "Admins can view rate limit log"
  ON public.contact_email_rate_limit
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));