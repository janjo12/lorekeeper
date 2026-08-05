create table public.profile_ai_api (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profile(id) on delete cascade,
  name text not null,
  provider text not null,
  base_url text,
  encrypted_api_key text not null,
  key_last_four text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profile_ai_api_name_length check (char_length(name) between 1 and 80),
  constraint profile_ai_api_provider_length check (char_length(provider) between 1 and 50),
  constraint profile_ai_api_key_suffix_length check (char_length(key_last_four) between 1 and 4),
  unique (profile_id, name)
);

create unique index profile_ai_api_one_default
on public.profile_ai_api(profile_id) where is_default;

alter table public.profile_ai_api enable row level security;

-- The application uses service-role calls through the server-only data layer.
-- These RPCs serialize default selection by locking the owning profile row.
create or replace function public.create_profile_ai_api(
  requesting_user_id uuid,
  api_name text,
  api_provider text,
  api_base_url text,
  encrypted_key text,
  key_suffix text,
  make_default boolean default false
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
declare should_default boolean;
begin
  perform 1 from public.profile where id = requesting_user_id for update;
  if not found then raise exception 'Profile does not exist'; end if;

  should_default := make_default or not exists (
    select 1 from public.profile_ai_api where profile_id = requesting_user_id
  );
  if should_default then
    update public.profile_ai_api set is_default = false where profile_id = requesting_user_id;
  end if;

  insert into public.profile_ai_api(profile_id, name, provider, base_url, encrypted_api_key, key_last_four, is_default)
  values (requesting_user_id, api_name, api_provider, nullif(api_base_url, ''), encrypted_key, key_suffix, should_default)
  returning id into new_id;
  return new_id;
end; $$;

create or replace function public.set_default_profile_ai_api(requesting_user_id uuid, requested_api_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.profile where id = requesting_user_id for update;
  if not exists (select 1 from public.profile_ai_api where id = requested_api_id and profile_id = requesting_user_id) then
    raise exception 'API credential does not exist';
  end if;
  update public.profile_ai_api set is_default = (id = requested_api_id) where profile_id = requesting_user_id;
end; $$;

create or replace function public.delete_profile_ai_api(requesting_user_id uuid, requested_api_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare removed_default boolean;
begin
  perform 1 from public.profile where id = requesting_user_id for update;
  delete from public.profile_ai_api
  where id = requested_api_id and profile_id = requesting_user_id
  returning is_default into removed_default;
  if not found then raise exception 'API credential does not exist'; end if;
  if removed_default then
    update public.profile_ai_api set is_default = true
    where id = (select id from public.profile_ai_api where profile_id = requesting_user_id order by created_at, id limit 1);
  end if;
end; $$;

revoke all on table public.profile_ai_api from public, anon, authenticated;
revoke execute on function public.create_profile_ai_api(uuid, text, text, text, text, text, boolean), public.set_default_profile_ai_api(uuid, uuid), public.delete_profile_ai_api(uuid, uuid) from public, anon, authenticated;
grant all on table public.profile_ai_api to service_role;
grant execute on function public.create_profile_ai_api(uuid, text, text, text, text, text, boolean), public.set_default_profile_ai_api(uuid, uuid), public.delete_profile_ai_api(uuid, uuid) to service_role;
