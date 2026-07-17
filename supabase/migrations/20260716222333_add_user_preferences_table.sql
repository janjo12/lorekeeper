-- Extend the Auth-linked profile created by the previous migration. Recreating
-- it here would remove its policies and break the auth.users profile trigger.
alter table public.profile
  add column if not exists last_campaign_id uuid
    references public.campaign(id) on delete set null,
  add column if not exists theme_setting text not null default 'parchment';
