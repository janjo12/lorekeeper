-- Stable event IDs make replay/reconnect safe to deduplicate in the browser.
create or replace function public.broadcast_campaign_invite_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare campaign_name text; declare gm_username text;
begin
  select c.name, p.username into campaign_name, gm_username
  from public.campaign c join public.profile p on p.id = c.user_id where c.id = new.campaign_id;
  perform realtime.send(jsonb_build_object(
    'id', gen_random_uuid(), 'kind', 'campaign_invite', 'title', 'New campaign invitation',
    'body', gm_username || ' invited you to join ' || campaign_name || '.', 'href', '/data/campaigns'
  ), 'notification', 'user:' || new.user_id::text || ':notifications', true);
  return new;
end; $$;

create or replace function public.broadcast_lore_reveal_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_user_id uuid; declare revealed_entity_id uuid; declare revealed_campaign_id uuid;
declare revealed_entity_name text; declare revealed_content_name text; declare revealed_content_kind text;
declare notification_payload jsonb;
begin
  if tg_table_name = 'textbox_revealed' then
    select e.id, e.campaign_id, e.name, t.name into revealed_entity_id, revealed_campaign_id, revealed_entity_name, revealed_content_name
    from public.entity_textbox t join public.entity e on e.id = t.entity_id where t.id = new.entity_textbox_id;
    revealed_content_kind := 'textbox';
  elsif tg_table_name = 'image_revealed' then
    select e.id, e.campaign_id, e.name, i.name into revealed_entity_id, revealed_campaign_id, revealed_entity_name, revealed_content_name
    from public.entity_image i join public.entity e on e.id = i.entity_id where i.id = new.entity_image_id;
    revealed_content_kind := 'image';
  else return new;
  end if;
  notification_payload := jsonb_build_object(
    'id', gen_random_uuid(), 'kind', 'lore_reveal', 'title', 'New lore revealed',
    'body', revealed_content_name || ' was revealed on ' || revealed_entity_name || '.',
    'contentType', revealed_content_kind,
    'href', '/data/campaign-lore?campaign=' || revealed_campaign_id::text || '&entity=' || revealed_entity_id::text
  );
  if new.profile_id is null then
    for target_user_id in select cp.user_id from public.campaign_player cp where cp.campaign_id = revealed_campaign_id loop
      perform realtime.send(notification_payload, 'notification', 'user:' || target_user_id::text || ':notifications', true);
    end loop;
  else
    perform realtime.send(notification_payload, 'notification', 'user:' || new.profile_id::text || ':notifications', true);
  end if;
  return new;
end; $$;

create or replace function public.broadcast_entity_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_user_id uuid; declare comment_campaign_id uuid; declare comment_username text; declare payload jsonb;
begin
  select e.campaign_id, p.username into comment_campaign_id, comment_username
  from public.entity e join public.profile p on p.id = new.user_id where e.id = new.entity_id;
  payload := jsonb_build_object(
    'id', new.id, 'entityId', new.entity_id, 'username', comment_username,
    'content', new.content, 'createdAt', new.created_at
  );
  for target_user_id in
    select c.user_id from public.campaign c where c.id = comment_campaign_id
    union
    select cp.user_id from public.campaign_player cp where cp.campaign_id = comment_campaign_id
  loop
    perform realtime.send(payload, 'entity_comment', 'user:' || target_user_id::text || ':notifications', true);
  end loop;
  return new;
end; $$;

drop trigger if exists broadcast_entity_comment_trigger on public.comment;
create trigger broadcast_entity_comment_trigger after insert on public.comment
for each row execute function public.broadcast_entity_comment();
