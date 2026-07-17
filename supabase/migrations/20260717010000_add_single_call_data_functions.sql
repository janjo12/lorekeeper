-- Return every campaign a user owns or has joined in one database call.
create or replace function public.get_accessible_campaigns(requesting_user_id uuid)
returns table (id uuid, name text, user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct c.id, c.name, c.user_id
  from public.campaign c
  left join public.campaign_player cp
    on cp.campaign_id = c.id and cp.user_id = requesting_user_id
  where c.user_id = requesting_user_id or cp.user_id is not null
  order by c.name;
$$;

-- Aggregate campaign, category, and entity data into one response.
create or replace function public.get_campaign_lore(requesting_user_id uuid, requested_campaign_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'campaign', jsonb_build_object('id', c.id, 'name', c.name, 'user_id', c.user_id),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', category.id,
        'name', category.name,
        'parent_category_id', category.parent_category_id
      ) order by category.name)
      from public.category
      where category.user_id = requesting_user_id
    ), '[]'::jsonb),
    'entities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', entity.id,
        'name', entity.name,
        'category_id', entity.category_id
      ) order by entity.name)
      from public.entity
      where entity.campaign_id = c.id
    ), '[]'::jsonb)
  )
  from public.campaign c
  where c.id = requested_campaign_id
    and (
      c.user_id = requesting_user_id
      or exists (
        select 1 from public.campaign_player cp
        where cp.campaign_id = c.id and cp.user_id = requesting_user_id
      )
    );
$$;

-- Enforce campaign access and insert an entity atomically.
create or replace function public.create_lore_entity(
  requesting_user_id uuid,
  requested_campaign_id uuid,
  entity_name text,
  requested_category_id uuid default null
)
returns table (id uuid, name text, category_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.campaign c
    where c.id = requested_campaign_id
      and (
        c.user_id = requesting_user_id
        or exists (
          select 1 from public.campaign_player cp
          where cp.campaign_id = c.id and cp.user_id = requesting_user_id
        )
      )
  ) then
    raise exception 'Campaign access denied';
  end if;

  return query
    insert into public.entity (campaign_id, category_id, name)
    values (requested_campaign_id, requested_category_id, entity_name)
    returning entity.id, entity.name, entity.category_id;
end;
$$;
