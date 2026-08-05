-- Categories used to belong to a profile and therefore appeared in every
-- campaign owned by that profile. Preserve that behavior during migration by
-- copying each existing category tree into each of the owner's campaigns.
alter table public.category
  add column campaign_id uuid references public.campaign(id) on delete cascade;

alter table public.category
  drop constraint if exists category_user_id_name_key;

create temporary table category_campaign_migration_map on commit drop as
select
  category.id as old_category_id,
  campaign.id as campaign_id,
  case
    when row_number() over (partition by category.id order by campaign.id) = 1 then category.id
    else gen_random_uuid()
  end as new_category_id
from public.category category
join public.campaign campaign on campaign.user_id = category.user_id;

update public.category category
set campaign_id = mapping.campaign_id
from category_campaign_migration_map mapping
where mapping.old_category_id = category.id
  and mapping.new_category_id = category.id;

insert into public.category (id, name, parent_category_id, user_id, campaign_id)
select mapping.new_category_id, category.name, null, category.user_id, mapping.campaign_id
from category_campaign_migration_map mapping
join public.category category on category.id = mapping.old_category_id
where mapping.new_category_id <> mapping.old_category_id;

update public.category migrated
set parent_category_id = parent_mapping.new_category_id
from category_campaign_migration_map mapping
join public.category original on original.id = mapping.old_category_id
join category_campaign_migration_map parent_mapping
  on parent_mapping.old_category_id = original.parent_category_id
 and parent_mapping.campaign_id = mapping.campaign_id
where migrated.id = mapping.new_category_id;

update public.entity entity
set category_id = mapping.new_category_id
from category_campaign_migration_map mapping
where mapping.old_category_id = entity.category_id
  and mapping.campaign_id = entity.campaign_id;

-- Invalid historical cross-owner category links cannot be assigned to the
-- entity's campaign safely. Make those entities uncategorized instead.
update public.entity entity
set category_id = null
where category_id is not null
  and not exists (
    select 1 from public.category category
    where category.id = entity.category_id
      and category.campaign_id = entity.campaign_id
  );

delete from public.category where campaign_id is null;

alter table public.entity drop constraint if exists entity_category_id_fkey;
alter table public.category drop constraint if exists category_parent_category_id_fkey;
alter table public.category drop constraint if exists category_user_id_fkey;
alter table public.category drop column user_id;
alter table public.category alter column campaign_id set not null;

alter table public.category
  add constraint category_campaign_name_key unique (campaign_id, name),
  add constraint category_id_campaign_key unique (id, campaign_id),
  add constraint category_parent_campaign_fkey
    foreign key (parent_category_id, campaign_id)
    references public.category(id, campaign_id) on delete cascade;

alter table public.entity
  add constraint entity_category_campaign_fkey
    foreign key (category_id, campaign_id)
    references public.category(id, campaign_id) on delete cascade;

-- Return only categories belonging to the requested campaign while preserving
-- the reveal-safe category ancestry for players.
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
      from public.category category where category.campaign_id = c.id and (c.user_id = requesting_user_id or category.id in (select id from visible_category_tree))), '[]'::jsonb),
    'entities', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'category_id', e.category_id) order by e.name) from visible_entities e), '[]'::jsonb),
    'visibility_manifest', jsonb_build_object(
      'textbox_ids', coalesce((select jsonb_agg(id) from visible_textboxes), '[]'::jsonb),
      'image_ids', coalesce((select jsonb_agg(id) from visible_images), '[]'::jsonb),
      'tag_keys', coalesce((select jsonb_agg(et.tag_id::text || ':' || et.entity_id::text)
        from public.entity_tag et join visible_entities e on e.id = et.entity_id), '[]'::jsonb)
    )
  ) from selected_campaign c;
$$;

create or replace function public.create_lore_entity(
  requesting_user_id uuid, requested_campaign_id uuid, entity_name text,
  requested_category_id uuid default null
)
returns table (id uuid, name text, category_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.campaign c where c.id = requested_campaign_id and c.user_id = requesting_user_id) then
    raise exception 'Only the campaign GM can create lore entities';
  end if;
  if requested_category_id is not null and not exists (
    select 1 from public.category category
    where category.id = requested_category_id and category.campaign_id = requested_campaign_id
  ) then raise exception 'Category does not belong to this campaign'; end if;
  return query insert into public.entity (campaign_id, category_id, name)
    values (requested_campaign_id, requested_category_id, entity_name)
    returning entity.id, entity.name, entity.category_id;
end;
$$;

create or replace function public.update_entity_details(
  requesting_user_id uuid, requested_entity_id uuid, entity_name text,
  requested_category_id uuid default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare requested_campaign_id uuid;
begin
  select e.campaign_id into requested_campaign_id from public.entity e where e.id = requested_entity_id;
  if not exists (select 1 from public.campaign c where c.id = requested_campaign_id and c.user_id = requesting_user_id) then
    raise exception 'Only the campaign GM can update this entity';
  end if;
  if requested_category_id is not null and not exists (
    select 1 from public.category category
    where category.id = requested_category_id and category.campaign_id = requested_campaign_id
  ) then raise exception 'Category does not belong to this campaign'; end if;
  update public.entity set name = entity_name, category_id = requested_category_id where id = requested_entity_id;
end;
$$;

-- New campaigns now receive their own category rows rather than reusing the
-- GM's account-wide categories.
create or replace function public.create_seeded_campaign(requesting_user_id uuid, campaign_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  new_campaign public.campaign;
  pcs uuid; npcs uuid; enemies uuid; items uuid; locations uuid; example_tag uuid;
  guy uuid; buddy uuid; villain uuid; lich uuid; safe_dagger uuid; cursed_dagger uuid; eporue uuid;
begin
  insert into public.campaign(user_id, name) values (requesting_user_id, campaign_name) returning * into new_campaign;
  insert into public.category(campaign_id, name) values
    (new_campaign.id, 'PC’s'), (new_campaign.id, 'NPC’s'), (new_campaign.id, 'Enemies'),
    (new_campaign.id, 'Items'), (new_campaign.id, 'Locations');
  select id into pcs from public.category where campaign_id = new_campaign.id and name = 'PC’s';
  select id into npcs from public.category where campaign_id = new_campaign.id and name = 'NPC’s';
  select id into enemies from public.category where campaign_id = new_campaign.id and name = 'Enemies';
  select id into items from public.category where campaign_id = new_campaign.id and name = 'Items';
  select id into locations from public.category where campaign_id = new_campaign.id and name = 'Locations';
  insert into public.tag(user_id, name) values (requesting_user_id, 'Example') on conflict (user_id, name) do nothing;
  select id into example_tag from public.tag where user_id = requesting_user_id and name = 'Example';
  insert into public.entity(name, category_id, campaign_id) values ('Guy Swordsman', pcs, new_campaign.id) returning id into guy;
  insert into public.entity(name, category_id, campaign_id) values ('Buddy', npcs, new_campaign.id) returning id into buddy;
  insert into public.entity(name, category_id, campaign_id) values ('Lord Villenus', npcs, new_campaign.id) returning id into villain;
  insert into public.entity(name, category_id, campaign_id) values ('Lich', enemies, new_campaign.id) returning id into lich;
  insert into public.entity(name, category_id, campaign_id) values ('Dagger of Safe Use', items, new_campaign.id) returning id into safe_dagger;
  insert into public.entity(name, category_id, campaign_id) values ('Dagger of Killing Its Wielder', items, new_campaign.id) returning id into cursed_dagger;
  insert into public.entity(name, category_id, campaign_id) values ('Continent of Eporue', locations, new_campaign.id) returning id into eporue;
  insert into public.entity_tag(entity_id, tag_id) values
    (guy, example_tag), (buddy, example_tag), (villain, example_tag), (lich, example_tag),
    (safe_dagger, example_tag), (cursed_dagger, example_tag), (eporue, example_tag);
  insert into public.entity_textbox(entity_id, name, textbox_content) values
    (guy, 'Guy’s Secret Backstory', 'Guy’s player can reveal this textbox to others (though they can’t unreveal it after doing so).'),
    (buddy, 'Description', 'A friendly, lovable helper.'),
    (buddy, 'True Identity', 'Actually Lord Villenus in a magical disguise.'),
    (villain, 'Description', 'An undead overlord.'),
    (villain, 'Secret Alias', 'Masquerades as Buddy, using magical disguise to deceive his foes.'),
    (safe_dagger, 'Description', 'A mysterious, glowing dagger.'),
    (safe_dagger, 'Stats', 'You can show some stats to the players after they identify this item.'),
    (safe_dagger, 'Curse', 'This is actually a Dagger of Killing Its Wielder.'),
    (cursed_dagger, 'Description', 'Looks like a Dagger of Safe Use.'),
    (cursed_dagger, 'Stats', 'You can reveal these stats when the players find out about the curse.'),
    (eporue, 'Locations: General Lore vs. Sublocations', 'You can make large locations into categories to hold sublocations. To still have general lore for the large location, add an entity with the same name to hold lore for it.');
  return to_jsonb(new_campaign);
end;
$$;

revoke execute on function public.create_lore_entity(uuid, uuid, text, uuid), public.update_entity_details(uuid, uuid, text, uuid), public.create_seeded_campaign(uuid, text) from public, anon, authenticated;
grant execute on function public.create_lore_entity(uuid, uuid, text, uuid), public.update_entity_details(uuid, uuid, text, uuid), public.create_seeded_campaign(uuid, text) to service_role;
