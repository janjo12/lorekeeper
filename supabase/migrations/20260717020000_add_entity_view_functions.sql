alter table public.comment
  add column if not exists entity_id uuid references public.entity(id) on delete cascade;

create index if not exists comment_entity_id_idx on public.comment(entity_id);

create or replace function public.can_access_campaign(requesting_user_id uuid, requested_campaign_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.campaign c
    where c.id = requested_campaign_id and (
      c.user_id = requesting_user_id or exists (
        select 1 from public.campaign_player cp
        where cp.campaign_id = c.id and cp.user_id = requesting_user_id
      )
    )
  );
$$;

create or replace function public.get_entity_view(requesting_user_id uuid, requested_entity_id uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'entity', jsonb_build_object('id', e.id, 'name', e.name, 'category_id', e.category_id, 'campaign_id', e.campaign_id),
    'campaign', jsonb_build_object('id', c.id, 'name', c.name),
    'textboxes', coalesce((select jsonb_agg(to_jsonb(t) order by t.name) from public.entity_textbox t where t.entity_id = e.id), '[]'::jsonb),
    'images', coalesce((select jsonb_agg(to_jsonb(i) order by i.name) from public.entity_image i where i.entity_id = e.id), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(jsonb_build_object('id', tag.id, 'name', tag.name) order by tag.name) from public.entity_tag et join public.tag on tag.id = et.tag_id where et.entity_id = e.id), '[]'::jsonb),
    'available_tags', coalesce((select jsonb_agg(jsonb_build_object('id', tag.id, 'name', tag.name) order by tag.name) from public.tag where tag.user_id = requesting_user_id), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(jsonb_build_object('id', comment.id, 'content', comment.content, 'created_at', comment.created_at, 'username', profile.username) order by comment.created_at desc) from public.comment join public.profile on profile.id = comment.user_id where comment.entity_id = e.id), '[]'::jsonb)
  )
  from public.entity e join public.campaign c on c.id = e.campaign_id
  where e.id = requested_entity_id and public.can_access_campaign(requesting_user_id, e.campaign_id);
$$;

create or replace function public.update_entity_details(requesting_user_id uuid, requested_entity_id uuid, entity_name text, requested_category_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare campaign_id uuid;
begin
  select e.campaign_id into campaign_id from public.entity e where e.id = requested_entity_id;
  if not public.can_access_campaign(requesting_user_id, campaign_id) then raise exception 'Entity access denied'; end if;
  update public.entity set name = entity_name, category_id = requested_category_id where id = requested_entity_id;
end; $$;

create or replace function public.add_entity_textbox(requesting_user_id uuid, requested_entity_id uuid, textbox_name text, textbox_content text)
returns void language plpgsql security definer set search_path = '' as $$
declare campaign_id uuid;
begin
  select e.campaign_id into campaign_id from public.entity e where e.id = requested_entity_id;
  if not public.can_access_campaign(requesting_user_id, campaign_id) then raise exception 'Entity access denied'; end if;
  insert into public.entity_textbox(name, textbox_content, entity_id) values (textbox_name, textbox_content, requested_entity_id);
end; $$;

create or replace function public.add_entity_image(requesting_user_id uuid, requested_entity_id uuid, image_name text, requested_image_url text)
returns void language plpgsql security definer set search_path = '' as $$
declare campaign_id uuid;
begin
  select e.campaign_id into campaign_id from public.entity e where e.id = requested_entity_id;
  if not public.can_access_campaign(requesting_user_id, campaign_id) then raise exception 'Entity access denied'; end if;
  insert into public.entity_image(name, image_url, entity_id) values (image_name, requested_image_url, requested_entity_id);
end; $$;

create or replace function public.add_entity_tag(requesting_user_id uuid, requested_entity_id uuid, requested_tag_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare campaign_id uuid;
begin
  select e.campaign_id into campaign_id from public.entity e where e.id = requested_entity_id;
  if not public.can_access_campaign(requesting_user_id, campaign_id) then raise exception 'Entity access denied'; end if;
  insert into public.entity_tag(entity_id, tag_id) values (requested_entity_id, requested_tag_id) on conflict do nothing;
end; $$;

create or replace function public.add_entity_comment(requesting_user_id uuid, requested_entity_id uuid, comment_content text)
returns void language plpgsql security definer set search_path = '' as $$
declare campaign_id uuid;
begin
  select e.campaign_id into campaign_id from public.entity e where e.id = requested_entity_id;
  if not public.can_access_campaign(requesting_user_id, campaign_id) then raise exception 'Entity access denied'; end if;
  insert into public.comment(user_id, entity_id, content) values (requesting_user_id, requested_entity_id, comment_content);
end; $$;

revoke execute on function public.can_access_campaign(uuid, uuid), public.get_entity_view(uuid, uuid), public.update_entity_details(uuid, uuid, text, uuid), public.add_entity_textbox(uuid, uuid, text, text), public.add_entity_image(uuid, uuid, text, text), public.add_entity_tag(uuid, uuid, uuid), public.add_entity_comment(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.can_access_campaign(uuid, uuid), public.get_entity_view(uuid, uuid), public.update_entity_details(uuid, uuid, text, uuid), public.add_entity_textbox(uuid, uuid, text, text), public.add_entity_image(uuid, uuid, text, text), public.add_entity_tag(uuid, uuid, uuid), public.add_entity_comment(uuid, uuid, text) to service_role;
