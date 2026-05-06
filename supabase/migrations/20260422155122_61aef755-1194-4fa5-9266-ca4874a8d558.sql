CREATE TABLE public.spam_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT NOT NULL,
  time_on_form_ms INTEGER,
  honeypot_value TEXT,
  payload JSONB,
  user_agent TEXT
);

ALTER TABLE public.spam_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log spam attempts"
ON public.spam_log
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can view spam log"
ON public.spam_log
FOR SELECT
TO authenticated
USING (true);