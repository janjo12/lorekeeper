-- Create a public profile whenever Supabase Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profile (id, username)
  values (new.id, lower(trim(new.raw_user_meta_data ->> 'username')));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for Auth users created before this trigger existed.
insert into public.profile (id, username, created_at)
select id, lower(trim(raw_user_meta_data ->> 'username')), created_at
from auth.users
where nullif(trim(raw_user_meta_data ->> 'username'), '') is not null
on conflict (id) do nothing;

-- The previous DROP TABLE ... CASCADE removed these foreign-key constraints.
alter table public.campaign
  drop constraint if exists campaign_user_id_fkey,
  add constraint campaign_user_id_fkey foreign key (user_id) references public.profile(id) on delete cascade;
alter table public.campaign_player
  drop constraint if exists campaign_player_user_id_fkey,
  add constraint campaign_player_user_id_fkey foreign key (user_id) references public.profile(id) on delete cascade;
alter table public.category
  drop constraint if exists category_user_id_fkey,
  add constraint category_user_id_fkey foreign key (user_id) references public.profile(id) on delete cascade;
alter table public.textbox_knowledge
  drop constraint if exists textbox_knowledge_user_id_fkey,
  add constraint textbox_knowledge_user_id_fkey foreign key (user_id) references public.profile(id) on delete cascade;
alter table public.image_knowledge
  drop constraint if exists image_knowledge_user_id_fkey,
  add constraint image_knowledge_user_id_fkey foreign key (user_id) references public.profile(id) on delete cascade;
alter table public.tag
  drop constraint if exists tag_user_id_fkey,
  add constraint tag_user_id_fkey foreign key (user_id) references public.profile(id) on delete cascade;
