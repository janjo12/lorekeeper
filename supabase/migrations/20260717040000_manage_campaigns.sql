create or replace function public.get_campaign_dashboard(requesting_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'owned', coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'user_id', c.user_id,
      'players', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username) order by p.username)
        from public.campaign_player cp join public.profile p on p.id = cp.user_id where cp.campaign_id = c.id), '[]'::jsonb)
    ) order by c.name) from public.campaign c where c.user_id = requesting_user_id), '[]'::jsonb),
    'joined', coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'user_id', c.user_id, 'gm_username', gm.username
    ) order by c.name) from public.campaign_player cp join public.campaign c on c.id = cp.campaign_id
      join public.profile gm on gm.id = c.user_id where cp.user_id = requesting_user_id), '[]'::jsonb)
  );
$$;

create or replace function public.rename_campaign(requesting_user_id uuid, requested_campaign_id uuid, campaign_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.campaign set name = campaign_name where id = requested_campaign_id and user_id = requesting_user_id;
  if not found then raise exception 'Only the campaign GM can rename this campaign'; end if;
end; $$;

create or replace function public.add_campaign_player(requesting_user_id uuid, requested_campaign_id uuid, player_username text)
returns void language plpgsql security definer set search_path = '' as $$
declare player_id uuid;
begin
  if not exists (select 1 from public.campaign where id = requested_campaign_id and user_id = requesting_user_id) then
    raise exception 'Only the campaign GM can add players';
  end if;
  select id into player_id from public.profile where username = lower(trim(player_username));
  if player_id is null then raise exception 'No user has that username'; end if;
  if player_id = requesting_user_id then raise exception 'The GM cannot also be a player'; end if;
  insert into public.campaign_player(campaign_id, user_id) values (requested_campaign_id, player_id) on conflict do nothing;
end; $$;

create or replace function public.delete_campaign(requesting_user_id uuid, requested_campaign_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.campaign where id = requested_campaign_id and user_id = requesting_user_id;
  if not found then raise exception 'Only the campaign GM can delete this campaign'; end if;
end; $$;

revoke execute on function public.get_campaign_dashboard(uuid), public.rename_campaign(uuid, uuid, text), public.add_campaign_player(uuid, uuid, text), public.delete_campaign(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_campaign_dashboard(uuid), public.rename_campaign(uuid, uuid, text), public.add_campaign_player(uuid, uuid, text), public.delete_campaign(uuid, uuid) to service_role;
