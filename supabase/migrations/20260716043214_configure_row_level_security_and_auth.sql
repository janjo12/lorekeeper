drop table if exists public.users cascade;

create table public.profile (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profile enable row level security;
alter table public.campaign enable row level security;
alter table public.campaign_player enable row level security;
alter table public.category enable row level security;
alter table public.entity enable row level security;
alter table public.entity_textbox enable row level security;
alter table public.entity_image enable row level security;
alter table public.textbox_knowledge enable row level security;
alter table public.image_knowledge enable row level security;
alter table public.tag enable row level security;
alter table public.entity_tag enable row level security;


create table public.comment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.comment enable row level security;

create policy "Users can view their own profile"
on public.profile
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profile
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);