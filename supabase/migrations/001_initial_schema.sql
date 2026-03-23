-- Organizations (businesses using our service)
create table organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  industry text,
  twilio_number text unique,
  forwarding_number text,
  elevenlabs_agent_id text,
  timezone text default 'Australia/Sydney',
  google_refresh_token text,
  google_connected boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text default 'client' check (role in ('admin', 'client')),
  organization_id uuid references organizations(id),
  created_at timestamp with time zone default now()
);

-- Agents (AI receptionist config)
create table agents (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  name text default 'Amy',
  elevenlabs_agent_id text unique,
  voice_id text not null,
  greeting text not null,
  system_prompt text not null,
  faqs jsonb default '[]',
  escalation_number text,
  business_hours jsonb,
  is_active boolean default true,
  language text default 'en',
  max_call_duration integer default 300,
  webhook_url text,
  call_recording boolean default true,
  voice_settings jsonb,
  knowledge_items jsonb default '[]',
  interruptible boolean default true,
  timezone text default 'Australia/Sydney',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Calls (call history)
create table calls (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  agent_id uuid references agents(id) not null,
  twilio_call_sid text unique not null,
  elevenlabs_conversation_id text,
  caller_number text not null,
  status text default 'ringing' check (status in ('ringing', 'in_progress', 'completed', 'failed', 'transferred')),
  duration integer default 0,
  transcript jsonb,
  summary text,
  recording_url text,
  lead_data jsonb,
  appointment_booked boolean default false,
  created_at timestamp with time zone default now()
);

-- Subscriptions (Stripe billing)
create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations(id) on delete cascade unique not null,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  plan text default 'essential' check (plan in ('essential', 'complete', 'enterprise')),
  status text default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled')),
  minutes_included integer not null,
  minutes_used integer default 0,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Row Level Security
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table agents enable row level security;
alter table calls enable row level security;
alter table subscriptions enable row level security;

-- Policies (users can only see their own org data)
create policy "Users can view own organization"
  on organizations for select
  using (id = (select organization_id from profiles where id = auth.uid()));

create policy "Users can update own organization"
  on organizations for update
  using (id = (select organization_id from profiles where id = auth.uid()));

create policy "Users can view own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid());

create policy "Users can view own agents"
  on agents for select
  using (organization_id = (select organization_id from profiles where id = auth.uid()));

create policy "Users can insert own agents"
  on agents for insert
  with check (organization_id = (select organization_id from profiles where id = auth.uid()));

create policy "Users can update own agents"
  on agents for update
  using (organization_id = (select organization_id from profiles where id = auth.uid()));

create policy "Users can delete own agents"
  on agents for delete
  using (organization_id = (select organization_id from profiles where id = auth.uid()));

create policy "Users can view own calls"
  on calls for select
  using (organization_id = (select organization_id from profiles where id = auth.uid()));

create policy "Users can view own subscription"
  on subscriptions for select
  using (organization_id = (select organization_id from profiles where id = auth.uid()));

-- Admin policies (admins see everything)
create policy "Admins can manage all organizations"
  on organizations for all
  using ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admins can manage all profiles"
  on profiles for all
  using ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admins can manage all agents"
  on agents for all
  using ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admins can manage all calls"
  on calls for all
  using ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admins can manage all subscriptions"
  on subscriptions for all
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Service role bypass for webhooks (service role bypasses RLS by default)

-- Indexes for performance
create index idx_calls_organization_id on calls(organization_id);
create index idx_calls_created_at on calls(created_at desc);
create index idx_calls_twilio_call_sid on calls(twilio_call_sid);
create index idx_agents_organization_id on agents(organization_id);
create index idx_profiles_organization_id on profiles(organization_id);
create index idx_organizations_twilio_number on organizations(twilio_number);

-- Function to auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_organizations_updated_at
  before update on organizations
  for each row execute function update_updated_at_column();

create trigger update_agents_updated_at
  before update on agents
  for each row execute function update_updated_at_column();

create trigger update_subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at_column();

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
