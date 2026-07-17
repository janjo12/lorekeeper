revoke execute on function public.get_accessible_campaigns(uuid) from public, anon, authenticated;
revoke execute on function public.get_campaign_lore(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.create_lore_entity(uuid, uuid, text, uuid) from public, anon, authenticated;

grant execute on function public.get_accessible_campaigns(uuid) to service_role;
grant execute on function public.get_campaign_lore(uuid, uuid) to service_role;
grant execute on function public.create_lore_entity(uuid, uuid, text, uuid) to service_role;
