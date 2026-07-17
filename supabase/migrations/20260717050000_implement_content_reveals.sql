alter table public.textbox_knowledge rename to textbox_revealed;
alter table public.image_knowledge rename to image_revealed;

alter table public.textbox_revealed drop constraint textbox_knowledge_pkey;
alter table public.image_revealed drop constraint image_knowledge_pkey;
alter table public.textbox_revealed rename column user_id to profile_id;
alter table public.image_revealed rename column user_id to profile_id;
alter table public.textbox_revealed alter column profile_id drop not null;
alter table public.image_revealed alter column profile_id drop not null;
alter table public.textbox_revealed add column id uuid primary key default gen_random_uuid();
alter table public.image_revealed add column id uuid primary key default gen_random_uuid();
create unique index textbox_revealed_content_profile_key on public.textbox_revealed(entity_textbox_id, profile_id) nulls not distinct;
create unique index image_revealed_content_profile_key on public.image_revealed(entity_image_id, profile_id) nulls not distinct;

insert into public.textbox_revealed(entity_textbox_id, profile_id)
select id, null from public.entity_textbox where is_revealed on conflict do nothing;
insert into public.image_revealed(entity_image_id, profile_id)
select id, null from public.entity_image where is_revealed on conflict do nothing;
alter table public.entity_textbox drop column is_revealed;
alter table public.entity_image drop column is_revealed;

drop function if exists public.toggle_entity_content_reveal(uuid, uuid, text);

create or replace function public.set_entity_content_reveal(requesting_user_id uuid, requested_content_id uuid, content_type text, reveal_to_all boolean, revealed_profile_ids uuid[] default '{}'::uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare requested_campaign_id uuid;
begin
  if content_type = 'textbox' then
    select e.campaign_id into requested_campaign_id from public.entity_textbox x join public.entity e on e.id = x.entity_id where x.id = requested_content_id;
  elsif content_type = 'image' then
    select e.campaign_id into requested_campaign_id from public.entity_image x join public.entity e on e.id = x.entity_id where x.id = requested_content_id;
  else raise exception 'Invalid content type';
  end if;
  if not exists (select 1 from public.campaign where id = requested_campaign_id and user_id = requesting_user_id) then raise exception 'Only the campaign GM can change reveals'; end if;

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

create or replace function public.get_entity_view(requesting_user_id uuid, requested_entity_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'entity', jsonb_build_object('id', e.id, 'name', e.name, 'category_id', e.category_id, 'campaign_id', e.campaign_id),
    'campaign', jsonb_build_object('id', c.id, 'name', c.name, 'user_id', c.user_id),
    'campaign_players', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username) order by p.username) from public.campaign_player cp join public.profile p on p.id = cp.user_id where cp.campaign_id = c.id), '[]'::jsonb),
    'textboxes', coalesce((select jsonb_agg(to_jsonb(t) || jsonb_build_object(
      'revealed_to_all', exists(select 1 from public.textbox_revealed r where r.entity_textbox_id = t.id and r.profile_id is null),
      'revealed_profile_ids', coalesce((select jsonb_agg(r.profile_id) from public.textbox_revealed r where r.entity_textbox_id = t.id and r.profile_id is not null), '[]'::jsonb)
    ) order by t.name) from public.entity_textbox t where t.entity_id = e.id and (c.user_id = requesting_user_id or exists(select 1 from public.textbox_revealed r where r.entity_textbox_id = t.id and (r.profile_id is null or r.profile_id = requesting_user_id)))), '[]'::jsonb),
    'images', coalesce((select jsonb_agg(to_jsonb(i) || jsonb_build_object(
      'revealed_to_all', exists(select 1 from public.image_revealed r where r.entity_image_id = i.id and r.profile_id is null),
      'revealed_profile_ids', coalesce((select jsonb_agg(r.profile_id) from public.image_revealed r where r.entity_image_id = i.id and r.profile_id is not null), '[]'::jsonb)
    ) order by i.name) from public.entity_image i where i.entity_id = e.id and (c.user_id = requesting_user_id or exists(select 1 from public.image_revealed r where r.entity_image_id = i.id and (r.profile_id is null or r.profile_id = requesting_user_id)))), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(jsonb_build_object('id', tag.id, 'name', tag.name) order by tag.name) from public.entity_tag et join public.tag on tag.id = et.tag_id where et.entity_id = e.id), '[]'::jsonb),
    'available_tags', coalesce((select jsonb_agg(jsonb_build_object('id', tag.id, 'name', tag.name) order by tag.name) from public.tag where tag.user_id = requesting_user_id), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(jsonb_build_object('id', comment.id, 'content', comment.content, 'created_at', comment.created_at, 'username', profile.username) order by comment.created_at desc) from public.comment join public.profile on profile.id = comment.user_id where comment.entity_id = e.id), '[]'::jsonb)
  ) from public.entity e join public.campaign c on c.id = e.campaign_id
  where e.id = requested_entity_id and public.can_access_campaign(requesting_user_id, e.campaign_id);
$$;

revoke execute on function public.set_entity_content_reveal(uuid, uuid, text, boolean, uuid[]) from public, anon, authenticated;
grant execute on function public.set_entity_content_reveal(uuid, uuid, text, boolean, uuid[]) to service_role;
