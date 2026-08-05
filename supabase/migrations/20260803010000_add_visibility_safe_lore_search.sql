-- Visibility-safe lightweight lore index and background search corpus.
create or replace function public.get_campaign_lore(requesting_user_id uuid, requested_campaign_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with recursive selected_campaign as (
    select c.* from public.campaign c where c.id = requested_campaign_id and
      (c.user_id = requesting_user_id or exists (select 1 from public.campaign_player cp where cp.campaign_id = c.id and cp.user_id = requesting_user_id))
  ), visible_textboxes as (
    select t.* from public.entity_textbox t join public.entity e on e.id = t.entity_id join selected_campaign c on c.id = e.campaign_id
    where c.user_id = requesting_user_id or exists (select 1 from public.textbox_revealed r where r.entity_textbox_id = t.id and (r.profile_id is null or r.profile_id = requesting_user_id))
  ), visible_images as (
    select i.* from public.entity_image i join public.entity e on e.id = i.entity_id join selected_campaign c on c.id = e.campaign_id
    where c.user_id = requesting_user_id or exists (select 1 from public.image_revealed r where r.entity_image_id = i.id and (r.profile_id is null or r.profile_id = requesting_user_id))
  ), visible_entities as (
    select e.* from public.entity e join selected_campaign c on c.id = e.campaign_id
    where c.user_id = requesting_user_id or exists (select 1 from visible_textboxes t where t.entity_id = e.id) or exists (select 1 from visible_images i where i.entity_id = e.id)
  ), visible_category_tree as (
    select category.* from public.category category where category.id in (select category_id from visible_entities where category_id is not null)
    union select parent.* from public.category parent join visible_category_tree child on child.parent_category_id = parent.id
  )
  select jsonb_build_object(
    'campaign', jsonb_build_object('id', c.id, 'name', c.name, 'user_id', c.user_id),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', category.id, 'name', category.name, 'parent_category_id', category.parent_category_id) order by category.name)
      from public.category category where category.user_id = c.user_id and (c.user_id = requesting_user_id or category.id in (select id from visible_category_tree))), '[]'::jsonb),
    'entities', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'category_id', e.category_id) order by e.name) from visible_entities e), '[]'::jsonb),
    'visibility_manifest', jsonb_build_object(
      'textbox_ids', coalesce((select jsonb_agg(id) from visible_textboxes), '[]'::jsonb),
      'image_ids', coalesce((select jsonb_agg(id) from visible_images), '[]'::jsonb),
      'tag_keys', coalesce((select jsonb_agg(et.tag_id::text || ':' || et.entity_id::text)
        from public.entity_tag et join visible_entities e on e.id = et.entity_id), '[]'::jsonb)
    )
  ) from selected_campaign c;
$$;

create or replace function public.get_campaign_search_corpus(requesting_user_id uuid, requested_campaign_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with visible as (select public.get_campaign_lore(requesting_user_id, requested_campaign_id) lore),
  visible_entity_ids as (select (item->>'id')::uuid id from visible, jsonb_array_elements(lore->'entities') item),
  visible_textbox_ids as (select value::uuid id from visible, jsonb_array_elements_text(lore->'visibility_manifest'->'textbox_ids') value),
  visible_image_ids as (select value::uuid id from visible, jsonb_array_elements_text(lore->'visibility_manifest'->'image_ids') value)
  select jsonb_build_object(
    'textboxes', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'entity_id', t.entity_id, 'name', t.name, 'text', t.textbox_content) order by t.name) from public.entity_textbox t join visible_textbox_ids v on v.id = t.id), '[]'::jsonb),
    'images', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'entity_id', i.entity_id, 'name', i.name, 'storage_path', i.storage_path) order by i.name) from public.entity_image i join visible_image_ids v on v.id = i.id), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(jsonb_build_object('id', tag.id, 'entity_id', et.entity_id, 'name', tag.name) order by tag.name) from public.entity_tag et join public.tag tag on tag.id = et.tag_id join visible_entity_ids v on v.id = et.entity_id), '[]'::jsonb)
  );
$$;

revoke execute on function public.get_campaign_search_corpus(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_campaign_search_corpus(uuid, uuid) to service_role;
