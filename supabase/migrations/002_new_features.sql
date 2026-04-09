-- 002: New features - notifications, after-hours, pause/resume, webhooks

-- SMS notification fields on organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS notification_phone text,
  ADD COLUMN IF NOT EXISTS sms_notifications_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_paused boolean DEFAULT false;

-- After-hours settings on agents
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS after_hours_greeting text,
  ADD COLUMN IF NOT EXISTS after_hours_behaviour text DEFAULT 'message',
  ADD COLUMN IF NOT EXISTS after_hours_transfer_number text;

-- Webhooks table for Zapier / automation integrations
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own webhooks"
  ON webhooks FOR ALL
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Admins can manage all webhooks"
  ON webhooks FOR ALL
  USING (public.get_user_role() = 'admin');

CREATE INDEX IF NOT EXISTS idx_webhooks_organization_id ON webhooks(organization_id);
