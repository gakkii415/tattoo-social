# Tattoo Social

Public tattoo artwork social app built to run on GitHub Pages with Supabase as the backend.

## Live app

- GitHub Pages: https://gakkii415.github.io/tattoo-social/
- Repository: https://github.com/gakkii415/tattoo-social

The app automatically runs in **demo mode** until Supabase is configured. Demo mode already supports browsing, following, likes, saves, search, posting a local image, notifications, profiles, and responsive mobile UI in the browser.

## Product features

- Account registration / sign in
- Artist profiles
- Tattoo image posts
- Follow / unfollow
- Like / unlike
- Save / unsave
- Search by artist, caption, style, and tags
- Following feed and latest feed
- Like / follow notifications
- Public image storage
- Responsive mobile / desktop UI

## Architecture

```text
GitHub Pages
  └─ index.html / styles.css / app.js
          │
          └─ Supabase
              ├─ Auth
              ├─ PostgreSQL
              ├─ Row Level Security
              └─ Storage
```

GitHub Pages only hosts the static frontend. Real multi-user accounts, shared posts, follows, likes, saves, notifications and image storage are handled by Supabase.

## Enable real multi-user mode

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/schema.sql`.
3. Copy the Project URL and anon/publishable key.
4. Put them in `config.js`:

```js
window.TATTOO_SOCIAL_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_OR_PUBLISHABLE_KEY"
};
```

5. Commit the change. GitHub Pages will serve the live multi-user version.

The anon/publishable key is intended for browser use. Security is enforced by the Row Level Security policies in `supabase/schema.sql`; never put a Supabase service-role key in this repository.

## Current deployment state

- Frontend: implemented and deployable on GitHub Pages
- Demo mode: usable immediately without backend configuration
- Supabase schema / RLS / Storage policies: included
- Real multi-user mode: activates after Supabase project credentials are added to `config.js`
