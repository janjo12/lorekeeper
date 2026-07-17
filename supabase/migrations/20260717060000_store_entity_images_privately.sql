-- Entity images live in a private Storage bucket. The application database keeps
-- only the object path and metadata; file operations use the Storage API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entity-images',
  'entity-images',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.entity_image rename column image_url to storage_path;
alter table public.entity_image
  add column mime_type text not null default 'application/octet-stream',
  add column file_size bigint not null default 0 check (file_size >= 0),
  add column original_filename text not null default 'image';

drop function if exists public.add_entity_image(uuid, uuid, text, text);
create function public.add_entity_image(
  requesting_user_id uuid,
  requested_entity_id uuid,
  image_name text,
  requested_storage_path text,
  requested_mime_type text,
  requested_file_size bigint,
  requested_original_filename text
)
returns void language plpgsql security definer set search_path = '' as $$
declare campaign_id uuid;
begin
  select e.campaign_id into campaign_id
  from public.entity e where e.id = requested_entity_id;
  if not exists (
    select 1 from public.campaign c
    where c.id = campaign_id and c.user_id = requesting_user_id
  ) then raise exception 'Only the campaign GM can add images'; end if;

  insert into public.entity_image(
    name, storage_path, mime_type, file_size, original_filename, entity_id
  ) values (
    image_name, requested_storage_path, requested_mime_type,
    requested_file_size, requested_original_filename, requested_entity_id
  );
end; $$;

create or replace function public.update_entity_content(requesting_user_id uuid, requested_content_id uuid, content_type text, content_name text, content_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare campaign_id uuid;
begin
  if content_type = 'textbox' then
    select e.campaign_id into campaign_id from public.entity_textbox x join public.entity e on e.id = x.entity_id where x.id = requested_content_id;
    if not public.can_access_campaign(requesting_user_id, campaign_id) then raise exception 'Content access denied'; end if;
    update public.entity_textbox set name = content_name, textbox_content = content_value where id = requested_content_id;
  elsif content_type = 'image' then
    select e.campaign_id into campaign_id from public.entity_image x join public.entity e on e.id = x.entity_id where x.id = requested_content_id;
    if not exists (select 1 from public.campaign where id = campaign_id and user_id = requesting_user_id) then raise exception 'Only the campaign GM can edit images'; end if;
    update public.entity_image set name = content_name where id = requested_content_id;
  else raise exception 'Invalid content type';
  end if;
end; $$;

drop function if exists public.delete_entity_content(uuid, uuid, text);
create function public.delete_entity_content(requesting_user_id uuid, requested_content_id uuid, content_type text)
returns text language plpgsql security definer set search_path = '' as $$
declare campaign_id uuid; deleted_storage_path text;
begin
  if content_type = 'textbox' then
    select e.campaign_id into campaign_id from public.entity_textbox x join public.entity e on e.id = x.entity_id where x.id = requested_content_id;
    if not exists (select 1 from public.campaign where id = campaign_id and user_id = requesting_user_id) then raise exception 'Only the campaign GM can delete content'; end if;
    delete from public.entity_textbox where id = requested_content_id;
  elsif content_type = 'image' then
    select e.campaign_id into campaign_id from public.entity_image x join public.entity e on e.id = x.entity_id where x.id = requested_content_id;
    if not exists (select 1 from public.campaign where id = campaign_id and user_id = requesting_user_id) then raise exception 'Only the campaign GM can delete content'; end if;
    delete from public.entity_image where id = requested_content_id returning storage_path into deleted_storage_path;
  else raise exception 'Invalid content type';
  end if;
  return deleted_storage_path;
end; $$;

revoke execute on function public.add_entity_image(uuid, uuid, text, text, text, bigint, text), public.delete_entity_content(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.add_entity_image(uuid, uuid, text, text, text, bigint, text), public.delete_entity_content(uuid, uuid, text) to service_role;
