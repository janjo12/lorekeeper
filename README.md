# Local setup

1. Put `SUPABASE_URL` and the server-only `SUPABASE_SECRET_KEY` in `.env`.
2. Apply every file in `supabase/migrations` in filename order. The migrations
   use Supabase Auth's `auth.users` table and automatically create `public.profile` rows.
3. Set a random `SESSION_SECRET` of at least 32 characters in `.env.local`.
4. Run `npm run dev`, then create an account at `/signup`.

`app/dataloader.js` is the application's database interface. Server actions and
Server Components should call its exported functions instead of constructing
Supabase queries directly.

# Wireframes:

#### Login Screen:
![Login Screen Wireframe](/assets/login-screen-wireframe.png)

#### New User Screen:
![New User Screen Wireframe](/assets/new-user-screen-wireframe.png)

#### Lore Screen:
![Lore Screen Wireframe](/assets/lore-screen-wireframe
.png)

# Database Schema:
┌───────────────────────────────────┐
│             campaign              │
├───────────────────────────────────┤
│ PK  id                            │←─┐
│ FK  profile_id                    │  |
│     name                          │  |
└───────────────────────────────────┘  |
                                       |
┌───────────────────────────────────┐  |
│             category              │  |
├───────────────────────────────────┤  |
│ PK  id                            |  |
| FK  campaign_id                   │──┘
│ FK  parent_category_id            │──┐
│     name                          │  │
└───────────────────────────────────┘  │
           ▲                           │
           └───────────────────────────┘
       category.parent_category_id      
              → category.id               
                                          
                                          
┌───────────────────────────────────┐     
│              entity               │     
├───────────────────────────────────┤     
│ PK  id                            │     
| FK  campaign_id                   |──────────→ campaign.id
│ FK  category_id                   │──────────→ category.id
│     name                          │
└───────────────────────────────────┘
          │             │            │
          │             │            │
          ▼             ▼            ▼

┌───────────────────────┐  ┌───────────────────────┐
│    entity_textbox     │  │      entity_image     │
├───────────────────────┤  ├───────────────────────┤
│ PK  id                │  │ PK  id                │
│ FK  entity_id         │  │ FK  entity_id         │
|     name (optional)   |  |     name (optional)   |
│     content           │  │     url               │
└───────────────────────┘  └───────────────────────┘
          │                         │
          ▼                         ▼

┌───────────────────────────┐  ┌───────────────────────────┐
│    textbox_knowledge      │  │     image_knowledge       │
├───────────────────────────┤  ├───────────────────────────┤
│ PK, FK entity_textbox_id  │  │ PK, FK entity_image_id    │
│ PK, FK profile_id         │  │ PK, FK profile_id         │
└───────────────────────────┘  └───────────────────────────┘
                  


┌───────────────────────┐
│          tag          │
├───────────────────────┤
│ PK  id                │
| FK  profile_id        |
│     name              │
└───────────────────────┘
          │
          ▼

┌───────────────────────────┐
│        entity_tag         │
├───────────────────────────┤
│ PK, FK entity_id          │──────────→ entity.id
│ PK, FK tag_id             │──────────→ tag.id
└───────────────────────────┘


┌───────────────────────────────────┐
│              comment              │
├───────────────────────────────────┤
│ PK  id                            │
│ FK  entity_id                     │──────────→ entity.id
│ FK  profile_id                    │
│     content                       │
|     created_at                    |
└───────────────────────────────────┘

┌───────────────────────────────────┐     
│         campaign_player           │     
├───────────────────────────────────┤
| FK  campaign_id                   |──────────→ campaign.id
│ FK  profile_id                    │
└───────────────────────────────────┘

Profile_id in the campaign table represents the campaign's owner (GM); in all other tables, it means a player in the campaign.
If category_id or parent_category_id are null, that entity or category is top-level and is not part of another category.
If profile_id is null in either textbox_knowledge or image_knowledge, that textbox or image is available to all players.
Entity and category names are unique within, but not across, each campaign. Entity names must be unique so that you can hyperlink to them easily in textboxes (frontend feature).
