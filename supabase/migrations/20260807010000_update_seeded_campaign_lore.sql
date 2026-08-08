-- Keep the starter campaign instructional while giving the example Lich its
-- own stat-oriented content instead of duplicating Lord Villenus's role.
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
    (villain, 'Description', 'A powerful Lich who rules a vast territory.'),
    (villain, 'Secret Alias', 'Masquerades as Buddy, using magical disguise to deceive his foes.'),
    (lich, 'Stats', 'You could put the play information for liches here, or maybe add an image to hold a statblock.'),
    (safe_dagger, 'Description', 'A mysterious, glowing dagger.'),
    (safe_dagger, 'Stats', 'You can show some stats to the players after they identify this item.'),
    (safe_dagger, 'Curse', 'This is actually a Dagger of Killing Its Wielder.'),
    (cursed_dagger, 'Description', 'Looks like a Dagger of Safe Use.'),
    (cursed_dagger, 'Stats', 'You can reveal these stats when the players find out about the curse.'),
    (eporue, 'Locations: General Lore vs. Sublocations', 'You can make large locations into categories to hold sublocations. To still have general lore for the large location, add an entity with the same name to hold lore for it.');
  return to_jsonb(new_campaign);
end;
$$;

revoke execute on function public.create_seeded_campaign(uuid, text) from public, anon, authenticated;
grant execute on function public.create_seeded_campaign(uuid, text) to service_role;
