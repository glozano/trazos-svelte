# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Environment Variables

Copy `.env.example` to `.env`.

Contact form:

- `BREVO_API_KEY`
- `CONTACT_TO_EMAIL`
- `CONTACT_FROM_EMAIL`
- `CONTACT_SENDER_NAME` (optional)
- `PUBLIC_TURNSTILE_SITE_KEY` (optional, enables widget in frontend)
- `TURNSTILE_SECRET_KEY` (optional, enables backend verification)

Board memory (server):

- `TRAZOS_MEMORY_ENABLED` (`true`/`false`, default `true`)
- `MONGO_URL` (default `mongodb://127.0.0.1:27017`)
- `MONGO_DB_NAME` (default `mongo_trazos`)
- `MONGO_LINES_COLLECTION` (default `lines`)
- `TRAZOS_MEMORY_TTL_SECONDS` (default `10800`, 3 hours)
- `TRAZOS_MEMORY_REPLAY_LIMIT` (default `0` = no limit)

GIF export / GIPHY upload:

- `GIPHY_API_KEY` (required for upload to GIPHY)
- `GIPHY_USERNAME` (default `trazosclub`)
- `GIPHY_TAGS` (default `trazos,trazosclub,processing,collaborative,drawing,draw`)
- `GIF_TEMP_DIR` (default `static/user-img`)
- `GIF_MAX_BYTES` (default `12582912`, 12 MB)
- `GIF_TEMP_TTL_SECONDS` (default `1800`, 30 minutes)
- `GIF_CLEANUP_INTERVAL_SECONDS` (default `300`, 5 minutes)

Examples:

```bash
# dedicated memory on/off server runs
npm run start:memory-on
npm run start:memory-off

# use a custom mongo endpoint
MONGO_URL=mongodb://mongo:27017 MONGO_DB_NAME=trazos npm start
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
