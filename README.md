┌───────────────────────────────────┐
│             campaign              │
├───────────────────────────────────┤
│ PK  id                            │←─┐
│ FK  user_id                       │  |
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
│     text              │  │     url               │
└───────────────────────┘  └───────────────────────┘
          │                         │
          ▼                         ▼

┌───────────────────────────┐  ┌───────────────────────────┐
│    textbox_knowledge      │  │     image_knowledge       │
├───────────────────────────┤  ├───────────────────────────┤
│ PK, FK entity_textbox_id  │  │ PK, FK entity_image_id    │
│ PK, FK user_id            │  │ PK, FK user_id            │
└───────────────────────────┘  └───────────────────────────┘
                  


┌───────────────────────┐
│          tag          │
├───────────────────────┤
│ PK  id                │
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
│ FK  user_id                       │
│     text                          │
└───────────────────────────────────┘

┌───────────────────────────────────┐     
│         campaign_player           │     
├───────────────────────────────────┤
| FK  campaign_id                   |──────────→ campaign.id
│ FK  user_id                       │
└───────────────────────────────────┘

User_id in the campaign table represents the campaign's owner (GM); in all other tables, it means a player in the campaign.
If category_id or parent_category_id are null, that entity or category is top-level and is not part of another category.
If user_id is null in either textbox_knowledge or image_knowledge, that textbox or image is available to all players.
Entity and category names are unique within, but not across, each campaign. Entity names must be unique so that you can hyperlink to them easily in textboxes (frontend feature).