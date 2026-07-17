alter table public.entity_textbox add column if not exists is_revealed boolean not null default false;
alter table public.entity_image add column if not exists is_revealed boolean not null default false;

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
    if not public.can_access_campaign(requesting_user_id, campaign_id) then raise exception 'Content access denied'; end if;
    update public.entity_image set name = content_name, image_url = content_value where id = requested_content_id;
  else
    raise exception 'Invalid content type';
  end if;
end; $$;

create or replace function public.toggle_entity_content_reveal(requesting_user_id uuid, requested_content_id uuid, content_type text)
returns void language plpgsql security definer set search_path = '' as $$
declare campaign_id uuid;
begin
  if content_type = 'textbox' then
    select e.campaign_id into campaign_id from public.entity_textbox x join public.entity e on e.id = x.entity_id where x.id = requested_content_id;
    if not public.can_access_campaign(requesting_user_id, campaign_id) then raise exception 'Content access denied'; end if;
    update public.entity_textbox set is_revealed = not is_revealed where id = requested_content_id;
  elsif content_type = 'image' then
    select e.campaign_id into campaign_id from public.entity_image x join public.entity e on e.id = x.entity_id where x.id = requested_content_id;
    if not public.can_access_campaign(requesting_user_id, campaign_id) then raise exception 'Content access denied'; end if;
    update public.entity_image set is_revealed = not is_revealed where id = requested_content_id;
  else
    raise exception 'Invalid content type';
  end if;
end; $$;

create or replace function public.delete_entity_content(requesting_user_id uuid, requested_content_id uuid, content_type text)
returns void language plpgsql security definer set search_path = '' as $$
declare campaign_id uuid;
begin
  if content_type = 'textbox' then
    select e.campaign_id into campaign_id from public.entity_textbox x join public.entity e on e.id = x.entity_id where x.id = requested_content_id;
    if not public.can_access_campaign(requesting_user_id, campaign_id) then raise exception 'Content access denied'; end if;
    delete from public.entity_textbox where id = requested_content_id;
  elsif content_type = 'image' then
    select e.campaign_id into campaign_id from public.entity_image x join public.entity e on e.id = x.entity_id where x.id = requested_content_id;
    if not public.can_access_campaign(requesting_user_id, campaign_id) then raise exception 'Content access denied'; end if;
    delete from public.entity_image where id = requested_content_id;
  else
    raise exception 'Invalid content type';
  end if;
end; $$;

revoke execute on function public.update_entity_content(uuid, uuid, text, text, text), public.toggle_entity_content_reveal(uuid, uuid, text), public.delete_entity_content(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.update_entity_content(uuid, uuid, text, text, text), public.toggle_entity_content_reveal(uuid, uuid, text), public.delete_entity_content(uuid, uuid, text) to service_role;
