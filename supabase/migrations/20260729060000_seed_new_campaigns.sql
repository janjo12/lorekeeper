create or replace function public.create_seeded_campaign(
  requesting_user_id uuid,
  campaign_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_campaign public.campaign;
  pcs_category_id uuid;
  npcs_category_id uuid;
  enemies_category_id uuid;
  items_category_id uuid;
  locations_category_id uuid;
  example_tag_id uuid;
  guy_id uuid;
  buddy_id uuid;
  lord_villenus_id uuid;
  lich_id uuid;
  safe_dagger_id uuid;
  cursed_dagger_id uuid;
  eporue_id uuid;
begin
  insert into public.campaign (user_id, name)
  values (requesting_user_id, campaign_name)
  returning * into new_campaign;

  insert into public.category (user_id, name)
  values
    (requesting_user_id, 'PC’s'),
    (requesting_user_id, 'NPC’s'),
    (requesting_user_id, 'Enemies'),
    (requesting_user_id, 'Items'),
    (requesting_user_id, 'Locations')
  on conflict (user_id, name) do nothing;

  select id into strict pcs_category_id
  from public.category where user_id = requesting_user_id and name = 'PC’s';
  select id into strict npcs_category_id
  from public.category where user_id = requesting_user_id and name = 'NPC’s';
  select id into strict enemies_category_id
  from public.category where user_id = requesting_user_id and name = 'Enemies';
  select id into strict items_category_id
  from public.category where user_id = requesting_user_id and name = 'Items';
  select id into strict locations_category_id
  from public.category where user_id = requesting_user_id and name = 'Locations';

  insert into public.tag (user_id, name)
  values (requesting_user_id, 'Example')
  on conflict (user_id, name) do nothing;

  select id into strict example_tag_id
  from public.tag where user_id = requesting_user_id and name = 'Example';

  insert into public.entity (name, category_id, campaign_id)
  values ('Guy Swordsman', pcs_category_id, new_campaign.id)
  returning id into guy_id;
  insert into public.entity (name, category_id, campaign_id)
  values ('Buddy', npcs_category_id, new_campaign.id)
  returning id into buddy_id;
  insert into public.entity (name, category_id, campaign_id)
  values ('Lord Villenus', npcs_category_id, new_campaign.id)
  returning id into lord_villenus_id;
  insert into public.entity (name, category_id, campaign_id)
  values ('Lich', enemies_category_id, new_campaign.id)
  returning id into lich_id;
  insert into public.entity (name, category_id, campaign_id)
  values ('Dagger of Safe Use', items_category_id, new_campaign.id)
  returning id into safe_dagger_id;
  insert into public.entity (name, category_id, campaign_id)
  values ('Dagger of Killing Its Wielder', items_category_id, new_campaign.id)
  returning id into cursed_dagger_id;
  insert into public.entity (name, category_id, campaign_id)
  values ('Continent of Eporue', locations_category_id, new_campaign.id)
  returning id into eporue_id;

  insert into public.entity_tag (entity_id, tag_id)
  values
    (guy_id, example_tag_id),
    (buddy_id, example_tag_id),
    (lord_villenus_id, example_tag_id),
    (lich_id, example_tag_id),
    (safe_dagger_id, example_tag_id),
    (cursed_dagger_id, example_tag_id),
    (eporue_id, example_tag_id);

  insert into public.entity_textbox (entity_id, name, textbox_content)
  values
    (
      guy_id,
      'Guy’s Secret Backstory',
      'Guy’s player can reveal this textbox to others (though they can’t unreveal it after doing so).'
    ),
    (buddy_id, 'Description', 'A friendly, lovable helper.'),
    (buddy_id, 'True Identity', 'Actually Lord Villenus in a magical disguise.'),
    (lord_villenus_id, 'Description', 'An undead overlord.'),
    (
      lord_villenus_id,
      'Secret Alias',
      'Masquerades as Buddy, using magical disguise to deceive his foes.'
    ),
    (safe_dagger_id, 'Description', 'A mysterious, glowing dagger.'),
    (
      safe_dagger_id,
      'Stats',
      'You can show some stats to the players after they identify this item.'
    ),
    (
      safe_dagger_id,
      'Curse',
      'This is actually a Dagger of Killing Its Wielder.'
    ),
    (
      cursed_dagger_id,
      'Description',
      'Looks like a Dagger of Safe Use.'
    ),
    (
      cursed_dagger_id,
      'Stats',
      'You can reveal these stats when the players find out about the curse.'
    ),
    (
      eporue_id,
      'Locations: General Lore vs. Sublocations',
      'You can make large locations into categories to hold sublocations. To still have general lore for the large location, add an entity with the same name to hold lore for it.'
    );

  return to_jsonb(new_campaign);
end;
$$;

revoke execute on function public.create_seeded_campaign(uuid, text)
from public, anon, authenticated;
grant execute on function public.create_seeded_campaign(uuid, text)
to service_role;
