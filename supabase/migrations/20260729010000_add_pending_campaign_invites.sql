create table public.pending_campaign_invites (
  campaign_id uuid not null references public.campaign(id) on delete cascade,
  user_id uuid not null references public.profile(id) on delete cascade,
  primary key (campaign_id, user_id)
);

alter table public.pending_campaign_invites enable row level security;

create policy "Invite participants can view campaign invites"
on public.pending_campaign_invites for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.campaign c
    where c.id = campaign_id and c.user_id = auth.uid()
  )
);

create policy "Campaign GMs can create invites"
on public.pending_campaign_invites for insert
with check (
  exists (
    select 1
    from public.campaign c
    where c.id = campaign_id and c.user_id = auth.uid()
  )
);

create policy "Invite participants can remove campaign invites"
on public.pending_campaign_invites for delete
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.campaign c
    where c.id = campaign_id and c.user_id = auth.uid()
  )
);

create or replace function public.add_pending_campaign_invite(
  requesting_user_id uuid,
  requested_campaign_id uuid,
  invited_username text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare invited_user_id uuid;
begin
  if not exists (
    select 1
    from public.campaign c
    where c.id = requested_campaign_id and c.user_id = requesting_user_id
  ) then
    raise exception 'Only the campaign GM can invite players';
  end if;

  select p.id into invited_user_id
  from public.profile p
  where p.username = lower(trim(invited_username));

  if invited_user_id is null then raise exception 'No user has that username'; end if;
  if invited_user_id = requesting_user_id then raise exception 'The GM cannot also be a player'; end if;
  if exists (
    select 1 from public.campaign_player cp
    where cp.campaign_id = requested_campaign_id and cp.user_id = invited_user_id
  ) then
    raise exception 'That user has already joined this campaign';
  end if;

  insert into public.pending_campaign_invites(campaign_id, user_id)
  values (requested_campaign_id, invited_user_id)
  on conflict do nothing;
end;
$$;

create or replace function public.remove_pending_campaign_invite(
  requesting_user_id uuid,
  requested_campaign_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.pending_campaign_invites pci
  where pci.campaign_id = requested_campaign_id
    and (
      pci.user_id = requesting_user_id
      or exists (
        select 1
        from public.campaign c
        where c.id = pci.campaign_id and c.user_id = requesting_user_id
      )
    );

  if not found then raise exception 'Campaign invitation does not exist'; end if;
end;
$$;

create or replace function public.accept_campaign_invite(
  requesting_user_id uuid,
  requested_campaign_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.pending_campaign_invites pci
  where pci.campaign_id = requested_campaign_id
    and pci.user_id = requesting_user_id;

  if not found then raise exception 'Campaign invitation does not exist'; end if;

  insert into public.campaign_player(campaign_id, user_id)
  values (requested_campaign_id, requesting_user_id)
  on conflict do nothing;
end;
$$;

create or replace function public.get_campaign_dashboard(requesting_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'owned', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'user_id', c.user_id,
        'players', coalesce((
          select jsonb_agg(
            jsonb_build_object('id', p.id, 'username', p.username)
            order by p.username
          )
          from public.campaign_player cp
          join public.profile p on p.id = cp.user_id
          where cp.campaign_id = c.id
        ), '[]'::jsonb),
        'pending_invites', coalesce((
          select jsonb_agg(
            jsonb_build_object('id', p.id, 'username', p.username)
            order by p.username
          )
          from public.pending_campaign_invites pci
          join public.profile p on p.id = pci.user_id
          where pci.campaign_id = c.id
        ), '[]'::jsonb)
      ) order by c.name)
      from public.campaign c
      where c.user_id = requesting_user_id
    ), '[]'::jsonb),
    'incoming_invites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'campaign_id', c.id,
        'campaign_name', c.name,
        'gm_username', gm.username
      ) order by c.name)
      from public.pending_campaign_invites pci
      join public.campaign c on c.id = pci.campaign_id
      join public.profile gm on gm.id = c.user_id
      where pci.user_id = requesting_user_id
    ), '[]'::jsonb),
    'joined', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'user_id', c.user_id,
        'gm_username', gm.username
      ) order by c.name)
      from public.campaign_player cp
      join public.campaign c on c.id = cp.campaign_id
      join public.profile gm on gm.id = c.user_id
      where cp.user_id = requesting_user_id
    ), '[]'::jsonb)
  );
$$;

drop function if exists public.add_campaign_player(uuid, uuid, text);

revoke all on table public.pending_campaign_invites from public, anon, authenticated;
grant select, insert, delete on table public.pending_campaign_invites to authenticated;

revoke execute on function
  public.add_pending_campaign_invite(uuid, uuid, text),
  public.remove_pending_campaign_invite(uuid, uuid),
  public.accept_campaign_invite(uuid, uuid)
from public, anon, authenticated;

grant execute on function
  public.add_pending_campaign_invite(uuid, uuid, text),
  public.remove_pending_campaign_invite(uuid, uuid),
  public.accept_campaign_invite(uuid, uuid)
to service_role;
