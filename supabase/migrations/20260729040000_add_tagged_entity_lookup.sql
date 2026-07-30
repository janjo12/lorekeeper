create or replace function public.get_tagged_entities_for_user(
  requesting_user_id uuid,
  requested_tag_id uuid
)
returns table (
  id uuid,
  name text,
  campaign_id uuid,
  campaign_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.name, c.id, c.name
  from public.tag t
  join public.entity_tag et on et.tag_id = t.id
  join public.entity e on e.id = et.entity_id
  join public.campaign c on c.id = e.campaign_id
  where t.id = requested_tag_id
    and t.user_id = requesting_user_id
    and public.can_access_campaign(requesting_user_id, e.campaign_id)
  order by c.name, e.name;
$$;

revoke execute on function public.get_tagged_entities_for_user(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_tagged_entities_for_user(uuid, uuid)
  to service_role;
