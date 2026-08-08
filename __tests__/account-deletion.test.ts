import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("recursive account deletion", () => {
  const profilePage = source("../app/data/profile/page.tsx");
  const accountForm = source("../app/data/profile/account-delete-form.tsx");
  const actions = source("../app/data/profile/actions.ts");
  const loader = source("../app/dataloader.js");
  const authProfileMigration = source(
    "../supabase/migrations/20260716043214_configure_row_level_security_and_auth.sql",
  );
  const authLinksMigration = source(
    "../supabase/migrations/20260716050000_connect_profiles_to_auth.sql",
  );
  const commentsMigration = source(
    "../supabase/migrations/20260717020000_add_entity_view_functions.sql",
  );

  it("requires password confirmation from the profile danger zone", () => {
    expect(profilePage).toContain("<AccountDeleteForm");
    expect(accountForm).toContain('name="currentPassword"');
    expect(accountForm).toContain("ConfirmDeleteButton");
    expect(actions).toContain("deleteUserAccount(session.userId");
    expect(actions).toContain("await deleteSession()");
  });

  it("deletes Auth users and cleans physical image storage", () => {
    expect(loader).toContain("auth.admin.deleteUser(userId)");
    expect(loader).toContain("getOwnedImagePaths(userId)");
    expect(loader).toContain('removeStoredImagesAfterDeletion(imagePaths, "account")');
  });

  it("has database cascades from account through campaigns and entity comments", () => {
    expect(authProfileMigration).toContain("references auth.users(id) on delete cascade");
    expect(authLinksMigration).toContain(
      "foreign key (user_id) references public.profile(id) on delete cascade",
    );
    expect(commentsMigration).toContain(
      "entity_id uuid references public.entity(id) on delete cascade",
    );
  });
});
