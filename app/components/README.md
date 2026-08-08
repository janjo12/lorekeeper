# Shared UI

`ui.tsx` contains presentation-only primitives that are safe to import from both
Server and Client Components.

- Use `PageHeader`, `SectionHeader`, and `EmptyState` for page composition.
- Use `FormField`, `DialogActions`, and `Button` for forms and actions.
- Use `SubmitButton` for automatic pending labels and duplicate-submit protection.
- Use `ActionForm` when a server action can fail during normal use so the error
  stays beside the form instead of replacing the route.
- Use `FormMessage` for accessible success and error announcements.
- Use `PasswordInput` for every password field so reveal controls and accessibility
  labels remain consistent. Password creation limits live in `lib/password-policy.ts`;
  login deliberately does not apply them.
- Use `PageLoading` and `PageErrorFallback` in route loading and error boundaries.
- Add domain-level components beside their feature, as with
  `data/campaigns/campaign-section.tsx`.
- Split domain controls from page composition when they have their own mutations
  or reveal rules, as with `campaign-lore/entity-content-controls.tsx`.
- Keep data fetching and mutations in route or feature components; shared UI
  components should receive rendered content through props.
- Prefer extending a primitive with a variant or CSS custom property over adding
  another nearly identical class.

Global CSS is grouped in the same order as the rendered application: foundations,
authentication, application shell, shared page composition, campaigns, lore,
entity details, profile, and responsive behavior.
