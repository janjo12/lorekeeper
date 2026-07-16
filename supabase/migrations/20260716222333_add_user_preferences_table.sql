drop table if exists public.profile cascade;

create table public.profile (
    user_id uuid primary key
        references auth.users(id) on delete cascade,

    username text not null unique,

    last_campaign_id bigint
        references public.campaign(id) on delete set null,

    theme_setting text not null default 'light'
);

alter table public.profile enable row level security;