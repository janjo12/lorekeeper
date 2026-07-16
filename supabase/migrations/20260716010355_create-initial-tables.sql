create table users (
    id uuid primary key default gen_random_uuid(),
    username text unique not null check (username = lower(username)),
    password_hash text not null,
    created_at timestamptz not null default now()
);

create table campaign (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    name text not null,
    unique (user_id, name)
);

create table campaign_player (
    campaign_id uuid references campaign(id) on delete cascade,
    user_id uuid references users(id) on delete cascade,
    primary key (campaign_id, user_id)
);

create table category (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    parent_category_id uuid references category(id) on delete cascade,
    user_id uuid references users(id) on delete cascade,
    unique (user_id, name)
);

create table entity (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category_id uuid references category(id) on delete cascade,
    campaign_id uuid references campaign(id) on delete cascade,
    unique (campaign_id, name)
);

create table entity_textbox (
    id uuid primary key default gen_random_uuid(),
    name text,
    textbox_content text not null,
    entity_id uuid references entity(id) on delete cascade
);

create table entity_image (
    id uuid primary key default gen_random_uuid(),
    name text,
    image_url text not null,
    entity_id uuid references entity(id) on delete cascade
);

create table textbox_knowledge (
    entity_textbox_id uuid references entity_textbox(id) on delete cascade,
    user_id uuid references users(id) on delete cascade,
    primary key (entity_textbox_id, user_id)
);

create table image_knowledge (
    entity_image_id uuid references entity_image(id) on delete cascade,
    user_id uuid references users(id) on delete cascade,
    primary key (entity_image_id, user_id)
);

create table tag (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    user_id uuid references users(id) on delete cascade,
    unique (user_id, name)
);

create table entity_tag (
    entity_id uuid references entity(id) on delete cascade,
    tag_id uuid references tag(id) on delete cascade,
    primary key (entity_id, tag_id)
);
