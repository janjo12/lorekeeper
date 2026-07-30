create or replace function public.reveal_entity_content_to_players(
  requesting_user_id uuid,
  requested_content_id uuid,
  content_type text,
  revealed_profile_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_campaign_id uuid;
  requester_knows_content boolean;
begin
  if content_type = 'textbox' then
    select e.campaign_id,
      exists(
        select 1
        from public.textbox_revealed r
        where r.entity_textbox_id = requested_content_id
          and (r.profile_id is null or r.profile_id = requesting_user_id)
      )
    into requested_campaign_id, requester_knows_content
    from public.entity_textbox t
    join public.entity e on e.id = t.entity_id
    where t.id = requested_content_id;
  elsif content_type = 'image' then
    select e.campaign_id,
      exists(
        select 1
        from public.image_revealed r
        where r.entity_image_id = requested_content_id
          and (r.profile_id is null or r.profile_id = requesting_user_id)
      )
    into requested_campaign_id, requester_knows_content
    from public.entity_image i
    join public.entity e on e.id = i.entity_id
    where i.id = requested_content_id;
  else
    raise exception 'Invalid content type';
  end if;

  if requested_campaign_id is null
    or not exists(
      select 1
      from public.campaign_player cp
      where cp.campaign_id = requested_campaign_id
        and cp.user_id = requesting_user_id
    )
    or not coalesce(requester_knows_content, false)
  then
    raise exception 'Only a player who knows this lore can reveal it';
  end if;

  if content_type = 'textbox' then
    insert into public.textbox_revealed(entity_textbox_id, profile_id)
    select requested_content_id, cp.user_id
    from public.campaign_player cp
    where cp.campaign_id = requested_campaign_id
      and cp.user_id = any(revealed_profile_ids)
    on conflict do nothing;
  else
    insert into public.image_revealed(entity_image_id, profile_id)
    select requested_content_id, cp.user_id
    from public.campaign_player cp
    where cp.campaign_id = requested_campaign_id
      and cp.user_id = any(revealed_profile_ids)
    on conflict do nothing;
  end if;
end;
$$;

revoke execute on function public.reveal_entity_content_to_players(uuid, uuid, text, uuid[])
  from public, anon, authenticated;
grant execute on function public.reveal_entity_content_to_players(uuid, uuid, text, uuid[])
  to service_role;
