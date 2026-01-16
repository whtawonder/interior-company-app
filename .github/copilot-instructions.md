# Copilot / AI agent instructions — interior-mobile

Brief: help implement and maintain an Expo React Native app that uses Supabase for data. Focus on project structure, data flows, environment variables, and small examples to follow.

- Project type: Expo-managed React Native app. Entry: `App.tsx`. Run locally with `npm run start` (uses `expo start`). See `package.json`.
- Navigation: bottom tab navigator in `App.tsx` (uses `@react-navigation/*`). Screens live in `screens/` (e.g. `WorkLogScreen.tsx`, `WorkLogListScreen.tsx`).
- Data layer: single Supabase client at `lib/supabase.ts`. All DB access goes through `supabase` import (do not create separate clients).

Key patterns and examples
- Select with related row aliasing: in `screens/WorkLogListScreen.tsx` the code queries:
  ```ts
  supabase.from('work_logs').select(`
    id, work_date, ..., projects:project_id (project_name, client_name)
  `)
  ```
  Follow this pattern for joining related rows (alias is `table:foreign_key (...)`).
- Deletion pattern: use `.delete().eq('id', id)` as in `WorkLogListScreen.handleDelete`.
- Types: global types live in `types/database.ts` (e.g. `WorkLog`, `Project`). Use these types when adding/adjusting data models.

Environment and secrets
- `lib/supabase.ts` reads from `Constants.expoConfig?.extra` and falls back to `process.env.EXPO_PUBLIC_SUPABASE_*`. Keep these keys in Expo `app.json`/secret manager or local env for development.
- Console logs in `lib/supabase.ts` print the URL and key presence; check them when debugging connection issues.

UI & styling notes
- App wraps the navigator with `SafeAreaProvider` and uses `useSafeAreaInsets()` to size the tab bar (see `App.tsx`). Follow the safe-area pattern for new screens.
- Screens are functional components using hooks. Use `useEffect` for load-on-mount and `useState` for local UI state (pattern used across `screens/`).

Conventions and small rules for changes
- Keep data access centralized through `lib/supabase.ts` (no direct REST calls elsewhere).
- Prefer existing TypeScript types from `types/` for props and DB models.
- Keep UX text in Korean where existing (UI strings are Korean). Preserve locale formatting, e.g. `formatCurrency` uses `'ko-KR'` in `WorkLogListScreen.tsx`.

Developer workflows
- Start development: `npm run start` (Expo). For device testing use `npm run android` / `npm run ios`.
- Linting/formatting: none enforced in repo—follow existing code style (semi-colons, 2-space indent). Add tooling only if requested.

What to look for when changing DB models
- Update `types/database.ts` when adding/removing fields.
- Update all `.select()` calls that reference changed columns (search `from('work_logs')` and `from('projects')`).

Where to check for bugs quickly
- Supabase connection: `lib/supabase.ts` logs URL/key existence.
- Data queries: inspect `screens/*` for how results are mapped (e.g. mapping `projects` -> `project` in `WorkLogListScreen`).

If you need clarification
- Open these files: `App.tsx`, `lib/supabase.ts`, `types/database.ts`, and `screens/WorkLogListScreen.tsx` for canonical examples. If anything is ambiguous, ask for the intended behavior or preferred naming.

---
If you'd like, I can refine this further (merge with an existing `.github/copilot-instructions.md` if you have one elsewhere, or expand debugging/run instructions). Reply with any missing areas you want covered.
