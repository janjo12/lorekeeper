┌───────────────────────────────────┐
│             category              │
├───────────────────────────────────┤
│ PK  id                            │
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
│     text              │  │     url               │
└───────────────────────┘  └───────────────────────┘
          │                         │
          ▼                         ▼

┌───────────────────────────┐  ┌───────────────────────────┐
│    textbox_knowledge      │  │     image_knowledge       │
├───────────────────────────┤  ├───────────────────────────┤
│ PK, FK entity_textbox_id  │  │ PK, FK entity_image_id    │
│ PK, FK player_id          │  │ PK, FK player_id          │
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
│ FK  player_id                     │──────────→ player.id
│     text                          │
└───────────────────────────────────┘

If category_id or parent_category_id are null, that entity or category is top-level and is not part of another category.
If player_id is null in either textbox_knowledge or image_knowledge, that textbox or image is available to all players.