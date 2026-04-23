CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.past_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_email TEXT NOT NULL,
  property_address TEXT NOT NULL,
  property_postcode TEXT NOT NULL,
  sale_price INTEGER,
  completion_date DATE,
  role TEXT NOT NULL CHECK (role IN ('sole_agent', 'joint_agent', 'referral')),
  seller_email TEXT,
  seller_name TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'disputed')),
  verification_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  verification_sent_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  seller_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_past_deals_agent_id_created_at
  ON public.past_deals (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_past_deals_verification_status
  ON public.past_deals (verification_status);

ALTER TABLE public.past_deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can manage their own deals" ON public.past_deals;
CREATE POLICY "Agents can manage their own deals"
  ON public.past_deals FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "Public can read verified deals" ON public.past_deals;
CREATE POLICY "Public can read verified deals"
  ON public.past_deals FOR SELECT
  USING (verification_status = 'verified');

DROP POLICY IF EXISTS "Verification via token (unauthenticated)" ON public.past_deals;
CREATE POLICY "Verification via token (unauthenticated)"
  ON public.past_deals FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Verification via token update (unauthenticated)" ON public.past_deals;
CREATE POLICY "Verification via token update (unauthenticated)"
  ON public.past_deals FOR UPDATE
  USING (verification_status = 'pending' OR verification_status = 'unverified')
  WITH CHECK (verification_status IN ('verified', 'disputed'));
