create table public.entity_co_owner (
  entity_id uuid not null references public.entity(id) on delete cascade,
  profile_id uuid not null references public.profile(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entity_id, profile_id)
);

alter table public.entity_co_owner enable row level security;

create policy "Campaign members can view entity co-owners"
on public.entity_co_owner for select
using (
  exists (
    select 1 from public.entity e
    where e.id = entity_id and public.can_access_campaign(auth.uid(), e.campaign_id)
  )
);

create or replace function public.can_manage_entity_content(
  requesting_user_id uuid,
  requested_entity_id uuid
)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entity e
    join public.campaign c on c.id = e.campaign_id
    where e.id = requested_entity_id and (
      c.user_id = requesting_user_id
      or exists (
        select 1 from public.entity_co_owner eco
        where eco.entity_id = e.id and eco.profile_id = requesting_user_id
      )
    )
  );
$$;

create or replace function public.set_entity_co_owners(
  requesting_user_id uuid,
  requested_entity_id uuid,
  co_owner_profile_ids uuid[] default '{}'::uuid[]
)
returns void language plpgsql security definer set search_path = '' as $$
declare requested_campaign_id uuid;
begin
  select e.campaign_id into requested_campaign_id
  from public.entity e join public.campaign c on c.id = e.campaign_id
  where e.id = requested_entity_id and c.user_id = requesting_user_id;

  if requested_campaign_id is null then
    raise exception 'Only the campaign GM can change entity co-owners';
  end if;
  if exists (
    select 1 from unnest(co_owner_profile_ids) selected(profile_id)
    where not exists (
      select 1 from public.campaign_player cp
      where cp.campaign_id = requested_campaign_id and cp.user_id = selected.profile_id
    )
  ) then
    raise exception 'Every co-owner must already be a player in this campaign';
  end if;

  delete from public.entity_co_owner where entity_id = requested_entity_id;
  insert into public.entity_co_owner(entity_id, profile_id)
  select requested_entity_id, selected.profile_id
  from (select distinct unnest(co_owner_profile_ids) profile_id) selected;
end;
$$;

create or replace function public.update_entity_details(
  requesting_user_id uuid, requested_entity_id uuid, entity_name text,
  requested_category_id uuid default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare current_campaign_id uuid; current_category_id uuid; campaign_owner_id uuid;
begin
  select e.campaign_id, e.category_id, c.user_id
  into current_campaign_id, current_category_id, campaign_owner_id
  from public.entity e join public.campaign c on c.id = e.campaign_id
  where e.id = requested_entity_id;

  if campaign_owner_id = requesting_user_id then
    if requested_category_id is not null and not exists (
      select 1 from public.category category
      where category.id = requested_category_id and category.campaign_id = current_campaign_id
    ) then raise exception 'Category does not belong to this campaign'; end if;
    update public.entity set name = entity_name, category_id = requested_category_id
    where id = requested_entity_id;
  elsif exists (
    select 1 from public.entity_co_owner eco
    where eco.entity_id = requested_entity_id and eco.profile_id = requesting_user_id
  ) then
    if requested_category_id is distinct from current_category_id then
      raise exception 'Entity co-owners cannot change the category';
    end if;
    update public.entity set name = entity_name where id = requested_entity_id;
  else
    raise exception 'You do not have permission to update this entity';
  end if;
end;
$$;

create or replace function public.add_entity_textbox(requesting_user_id uuid, requested_entity_id uuid, textbox_name text, textbox_content text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_manage_entity_content(requesting_user_id, requested_entity_id) then
    raise exception 'You do not have permission to add content to this entity';
  end if;
  insert into public.entity_textbox(name, textbox_content, entity_id)
  values (textbox_name, textbox_content, requested_entity_id);
end; $$;

create or replace function public.add_entity_image(
  requesting_user_id uuid, requested_entity_id uuid, image_name text,
  requested_storage_path text, requested_mime_type text,
  requested_file_size bigint, requested_original_filename text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_manage_entity_content(requesting_user_id, requested_entity_id) then
    raise exception 'You do not have permission to add content to this entity';
  end if;
  insert into public.entity_image(name, storage_path, mime_type, file_size, original_filename, entity_id)
  values (image_name, requested_storage_path, requested_mime_type, requested_file_size, requested_original_filename, requested_entity_id);
end; $$;

create or replace function public.update_entity_content(requesting_user_id uuid, requested_content_id uuid, content_type text, content_name text, content_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare requested_entity_id uuid;
begin
  if content_type = 'textbox' then
    select x.entity_id into requested_entity_id from public.entity_textbox x where x.id = requested_content_id;
  elsif content_type = 'image' then
    select x.entity_id into requested_entity_id from public.entity_image x where x.id = requested_content_id;
  else raise exception 'Invalid content type'; end if;
  if not public.can_manage_entity_content(requesting_user_id, requested_entity_id) then
    raise exception 'You do not have permission to edit this content';
  end if;
  if content_type = 'textbox' then
    update public.entity_textbox set name = content_name, textbox_content = content_value where id = requested_content_id;
  else
    update public.entity_image set name = content_name where id = requested_content_id;
  end if;
end; $$;

create or replace function public.delete_entity_content(requesting_user_id uuid, requested_content_id uuid, content_type text)
returns text language plpgsql security definer set search_path = '' as $$
declare requested_entity_id uuid; deleted_storage_path text;
begin
  if content_type = 'textbox' then
    select x.entity_id into requested_entity_id from public.entity_textbox x where x.id = requested_content_id;
  elsif content_type = 'image' then
    select x.entity_id into requested_entity_id from public.entity_image x where x.id = requested_content_id;
  else raise exception 'Invalid content type'; end if;
  if not public.can_manage_entity_content(requesting_user_id, requested_entity_id) then
    raise exception 'You do not have permission to delete this content';
  end if;
  if content_type = 'textbox' then
    delete from public.entity_textbox where id = requested_content_id;
  else
    delete from public.entity_image where id = requested_content_id returning storage_path into deleted_storage_path;
  end if;
  return deleted_storage_path;
end; $$;

create or replace function public.set_entity_content_reveal(requesting_user_id uuid, requested_content_id uuid, content_type text, reveal_to_all boolean, revealed_profile_ids uuid[] default '{}'::uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare requested_entity_id uuid; requested_campaign_id uuid;
begin
  if content_type = 'textbox' then
    select x.entity_id, e.campaign_id into requested_entity_id, requested_campaign_id from public.entity_textbox x join public.entity e on e.id = x.entity_id where x.id = requested_content_id;
  elsif content_type = 'image' then
    select x.entity_id, e.campaign_id into requested_entity_id, requested_campaign_id from public.entity_image x join public.entity e on e.id = x.entity_id where x.id = requested_content_id;
  else raise exception 'Invalid content type'; end if;
  if not public.can_manage_entity_content(requesting_user_id, requested_entity_id) then
    raise exception 'You do not have permission to change reveals for this content';
  end if;
  if content_type = 'textbox' then
    delete from public.textbox_revealed where entity_textbox_id = requested_content_id;
    if reveal_to_all then insert into public.textbox_revealed(entity_textbox_id, profile_id) values (requested_content_id, null);
    else insert into public.textbox_revealed(entity_textbox_id, profile_id) select requested_content_id, cp.user_id from public.campaign_player cp where cp.campaign_id = requested_campaign_id and cp.user_id = any(revealed_profile_ids); end if;
  else
    delete from public.image_revealed where entity_image_id = requested_content_id;
    if reveal_to_all then insert into public.image_revealed(entity_image_id, profile_id) values (requested_content_id, null);
    else insert into public.image_revealed(entity_image_id, profile_id) select requested_content_id, cp.user_id from public.campaign_player cp where cp.campaign_id = requested_campaign_id and cp.user_id = any(revealed_profile_ids); end if;
  end if;
end; $$;

create or replace function public.get_campaign_lore(requesting_user_id uuid, requested_campaign_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with recursive selected_campaign as (
    select c.* from public.campaign c where c.id = requested_campaign_id and
      (c.user_id = requesting_user_id or exists (select 1 from public.campaign_player cp where cp.campaign_id = c.id and cp.user_id = requesting_user_id))
  ), visible_textboxes as (
    select t.* from public.entity_textbox t join public.entity e on e.id = t.entity_id join selected_campaign c on c.id = e.campaign_id
    where c.user_id = requesting_user_id or public.can_manage_entity_content(requesting_user_id, e.id) or exists (select 1 from public.textbox_revealed r where r.entity_textbox_id = t.id and (r.profile_id is null or r.profile_id = requesting_user_id))
  ), visible_images as (
    select i.* from public.entity_image i join public.entity e on e.id = i.entity_id join selected_campaign c on c.id = e.campaign_id
    where c.user_id = requesting_user_id or public.can_manage_entity_content(requesting_user_id, e.id) or exists (select 1 from public.image_revealed r where r.entity_image_id = i.id and (r.profile_id is null or r.profile_id = requesting_user_id))
  ), visible_entities as (
    select e.* from public.entity e join selected_campaign c on c.id = e.campaign_id
    where c.user_id = requesting_user_id or public.can_manage_entity_content(requesting_user_id, e.id) or exists (select 1 from visible_textboxes t where t.entity_id = e.id) or exists (select 1 from visible_images i where i.entity_id = e.id)
  ), visible_category_tree as (
    select category.* from public.category category where category.id in (select category_id from visible_entities where category_id is not null)
    union select parent.* from public.category parent join visible_category_tree child on child.parent_category_id = parent.id
  )
  select jsonb_build_object(
    'campaign', jsonb_build_object('id', c.id, 'name', c.name, 'user_id', c.user_id),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', category.id, 'name', category.name, 'parent_category_id', category.parent_category_id) order by category.name) from public.category category where category.campaign_id = c.id and (c.user_id = requesting_user_id or category.id in (select id from visible_category_tree))), '[]'::jsonb),
    'entities', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'category_id', e.category_id) order by e.name) from visible_entities e), '[]'::jsonb),
    'visibility_manifest', jsonb_build_object(
      'textbox_ids', coalesce((select jsonb_agg(id) from visible_textboxes), '[]'::jsonb),
      'image_ids', coalesce((select jsonb_agg(id) from visible_images), '[]'::jsonb),
      'tag_keys', coalesce((select jsonb_agg(et.tag_id::text || ':' || et.entity_id::text) from public.entity_tag et join visible_entities e on e.id = et.entity_id), '[]'::jsonb)
    )
  ) from selected_campaign c;
$$;

create or replace function public.get_entity_view(requesting_user_id uuid, requested_entity_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'entity', jsonb_build_object('id', e.id, 'name', e.name, 'category_id', e.category_id, 'campaign_id', e.campaign_id),
    'campaign', jsonb_build_object('id', c.id, 'name', c.name, 'user_id', c.user_id),
    'is_co_owner', exists(select 1 from public.entity_co_owner eco where eco.entity_id = e.id and eco.profile_id = requesting_user_id),
    'co_owners', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username) order by p.username) from public.entity_co_owner eco join public.profile p on p.id = eco.profile_id where eco.entity_id = e.id), '[]'::jsonb),
    'campaign_players', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username) order by p.username) from public.campaign_player cp join public.profile p on p.id = cp.user_id where cp.campaign_id = c.id), '[]'::jsonb),
    'textboxes', coalesce((select jsonb_agg(to_jsonb(t) || jsonb_build_object('revealed_to_all', exists(select 1 from public.textbox_revealed r where r.entity_textbox_id = t.id and r.profile_id is null), 'revealed_profile_ids', coalesce((select jsonb_agg(r.profile_id) from public.textbox_revealed r where r.entity_textbox_id = t.id and r.profile_id is not null), '[]'::jsonb)) order by t.name) from public.entity_textbox t where t.entity_id = e.id and (public.can_manage_entity_content(requesting_user_id, e.id) or exists(select 1 from public.textbox_revealed r where r.entity_textbox_id = t.id and (r.profile_id is null or r.profile_id = requesting_user_id)))), '[]'::jsonb),
    'images', coalesce((select jsonb_agg(to_jsonb(i) || jsonb_build_object('revealed_to_all', exists(select 1 from public.image_revealed r where r.entity_image_id = i.id and r.profile_id is null), 'revealed_profile_ids', coalesce((select jsonb_agg(r.profile_id) from public.image_revealed r where r.entity_image_id = i.id and r.profile_id is not null), '[]'::jsonb)) order by i.name) from public.entity_image i where i.entity_id = e.id and (public.can_manage_entity_content(requesting_user_id, e.id) or exists(select 1 from public.image_revealed r where r.entity_image_id = i.id and (r.profile_id is null or r.profile_id = requesting_user_id)))), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(jsonb_build_object('id', tag.id, 'name', tag.name) order by tag.name) from public.entity_tag et join public.tag on tag.id = et.tag_id where et.entity_id = e.id), '[]'::jsonb),
    'available_tags', case when c.user_id = requesting_user_id then coalesce((select jsonb_agg(jsonb_build_object('id', tag.id, 'name', tag.name) order by tag.name) from public.tag where tag.user_id = requesting_user_id), '[]'::jsonb) else '[]'::jsonb end,
    'comments', coalesce((select jsonb_agg(jsonb_build_object('id', comment.id, 'content', comment.content, 'created_at', comment.created_at, 'username', profile.username) order by comment.created_at desc) from public.comment join public.profile on profile.id = comment.user_id where comment.entity_id = e.id), '[]'::jsonb)
  ) from public.entity e join public.campaign c on c.id = e.campaign_id
  where e.id = requested_entity_id and public.can_access_campaign(requesting_user_id, e.campaign_id);
$$;

revoke all on table public.entity_co_owner from public, anon, authenticated;
grant select on table public.entity_co_owner to authenticated;
revoke execute on function public.can_manage_entity_content(uuid, uuid), public.set_entity_co_owners(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.can_manage_entity_content(uuid, uuid), public.set_entity_co_owners(uuid, uuid, uuid[]) to service_role;
