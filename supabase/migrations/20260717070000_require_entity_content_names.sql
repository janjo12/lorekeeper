update public.entity_textbox
set name = 'Notes'
where name is null;

update public.entity_image
set name = 'Image'
where name is null;

alter table public.entity_textbox
  alter column name set not null;

alter table public.entity_image
  alter column name set not null;
