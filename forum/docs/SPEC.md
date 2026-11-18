# DragonMineZ Forum: spec

Community forum for the DragonMineZ mod, meant for `forum.dragonminez.com`. Standalone app on the same stack and look as `../dragonminez-web` (the public website, read-only reference; never edit it).

## Goals (MVP)

- Log in with Discord. Reading is public, writing needs login.
- Discussion categories with threads and replies.
- Community servers: a structured listing (cards, filters), each server with its own reply thread.
- Staff moderation from inside the forum, fed by member reports.
- Markdown posts, likes, in-site notifications, profile pages and search.
- English, Spanish (Latin American) and Portuguese (Brazilian) UI.
- Runs locally with one command, no Docker, no Discord app, no external database.

## Non-goals (add when asked)

Image uploads (images are linked, not hosted), private messages, email or Discord DM notifications, emoji reactions beyond a like, shared accounts with the website (it uses Clerk).

## Stack

Same versions as `../dragonminez-web/package.json`: Astro 5 (`output: "server"`, `@astrojs/node` standalone), React 19 only where a page needs client state, Tailwind 4 via `@tailwindcss/vite`, Prisma 7 with `@prisma/adapter-pg` on PostgreSQL, zod, `@fontsource-variable/onest`. No Clerk, no three.js. npm locally (bun is not installed on the dev machine); the Dockerfile uses bun like the website.

## Look

Copy the website's `src/styles/global.css` tokens (dark default, `--background #0a0a0b`, `--surface #121214`, orange accent `#f97316`, Onest font, rounded glass cards, Material Symbols Rounded icons) and its Header/Footer structure, trimmed. Header like the wiki's top bar (logo links to dragonminez.com, "Forum" chip, search pill, Download dropdown with CurseForge/Modrinth); nav: Forum, Servers, Discord, HairSalon, Wiki, then the user menu (avatar + name, Log out) or "Log in with Discord". Theme and language follow the shared `dmz_theme` / `dmz_lang` cookies like the website's `src/lib/sharedPrefs.ts`.

Pages are server-rendered Astro with plain HTML forms (POST, then redirect). No client JS is needed to read or post.

## Data model (Prisma)

- `User`: id, discordId (unique), username, avatarUrl, role (`member` | `mod` | `admin`), bannedAt, createdAt.
- `Category`: id, slug (unique), position, postRole (who starts threads: `member` | `staff` | `admin`), kind (`discussion` | `servers` | `suggestions` | `bugs`). Names and descriptions come from the i18n tables by slug.
- `Thread`: id, categoryId, authorId, title, status (suggestions and bugs), votes (likes on the opening post), subtitle / cover / image (announcements only, optional, https), pinned, locked, createdAt, lastPostAt, replyCount. Index (categoryId, pinned, lastPostAt).
- `Post`: id, threadId, authorId, body (markdown source), createdAt, editedAt, deletedAt (soft delete, shown as "deleted by staff"). The first post is the thread's opening post.
- `Like`: userId + postId (composite id).
- `Notification`: id, userId (receiver), actorId, type (`reply` | `like` | `server_approved` | `server_rejected`), threadId, postId, serverId (optional refs), readAt, createdAt. Index (userId, readAt).
- `Report`: id, reporterId, postId, reason, status (`open` | `resolved` | `dismissed`), handledById, createdAt. Unique (reporterId, postId).
- `Server`: id, ownerId, threadId (unique), name, address, version, language (`en` | `es` | `pt` | `other`), description, discordInvite (optional), status (`pending` | `approved` | `rejected`), rejectReason, createdAt.

Categories, in order (created by the migration and the seed): announcements (admins post), servers ("Community Servers", kind servers), guides (staff post), suggestions (kind suggestions: votes = likes on the opening post, sorted by votes or newest, staff status Open/Planned/Done/Declined), bug-reports (kind bugs: structured form with mod version, Minecraft/Forge version, what happened, steps, log link, stored as one markdown post; staff status Open/Confirmed/Fixed/Won't fix).
- `CommunityRole` (name unique, color `#rrggbb`) and `UserRole` (userId + roleId): cosmetic roles admins create at `/mod/roles` and give to members by username (max 25 roles). A member's name takes the color of their oldest role and the roles show as pills on posts and profiles. They grant no permissions; those stay `User.role`.

## Auth

- Discord OAuth2 authorization-code flow, scope `identify` only. `/auth/login` sets a random `state` in an HttpOnly cookie and redirects; `/auth/callback` checks it, exchanges the code, reads `/users/@me`, upserts the `User`, and never stores the Discord token.
- Session: HttpOnly, SameSite=Lax, Secure in production cookie `dmz_forum_session` = `userId.expiry.hmac` signed with `SESSION_SECRET` (30 days). Middleware loads the user row on every request into `Astro.locals.user`; a banned or missing user is treated as logged out for writes.
- Roles are refreshed at login: `ADMIN_DISCORD_IDS` (comma list) gives `admin`; otherwise, when `DISCORD_TOKEN` is set, the member's roles in `DISCORD_GUILD_ID` are read with the bot token and Administrator or a name in `DISCORD_MODERATOR_ROLES` gives `mod` (port `../dragonminez-web/src/lib/discord/moderation.ts`); otherwise `member`.
- Dev login: a form on `/auth/dev` (POST with `name` and `role`, or `quick=member|mod|admin`) creates or reuses a fake user and logs in. It exists only when `import.meta.env.DEV` is true and `DEV_LOGIN=1`; in a production build the route answers 404.

## Pre-launch lock

Until the environment variable `FORUM_PUBLIC` is exactly `1`, the forum is staff-only: the middleware (`src/middleware.ts`, rules in `src/lib/access.ts`) answers every URL except login, logout, the Discord callback, the language switch and assets with the `/locked` holding page (403, `X-Robots-Tag: noindex`) unless the visitor is logged in, not banned, and a `mod` or `admin`. Staff means Discord staff roles: roles are read at login (`ADMIN_DISCORD_IDS`, or `DISCORD_TOKEN` + `DISCORD_GUILD_ID` with `DISCORD_MODERATOR_ROLES` listing the staff role names or ids), so a role change needs a new login. A missing variable keeps the forum locked. `npm run dev:all` sets `FORUM_PUBLIC=1`; run it with `FORUM_PUBLIC=0` to test the lock.

## Rules and limits

- Every write is a POST checked for same-origin (Astro `security.checkOrigin`) and a logged-in, not banned user. Validation with zod on the server.
- Thread title 5-120 chars, post body 1-5000, server name 3-60, address 3-120 (host[:port], no scheme), version 1-20, description 20-2000, Discord invite must be `https://discord.gg/...` or `https://discord.com/invite/...`.
- Post bodies and server descriptions are markdown, rendered on the server by `src/lib/text.ts` with `markdown-it` (`html: false`, `linkify: true`, `breaks: true`): headings, bold/italic/strike, lists, quotes, code blocks, tables, links and images. Raw HTML is never passed through. Links get `rel="nofollow ugc noopener" target="_blank"` and only `http(s)` schemes; images only `https`, with `loading="lazy" referrerpolicy="no-referrer"` and a max width. Never `set:html` on anything a user wrote except the output of that one function. The reply form has a Write / Preview toggle (preview rendered by the server through a POST endpoint) and a short formatting hint.
- Likes: one per user per post, toggled by a POST; not on your own post. Counts show on posts.
- Notifications (in-site only, bell in the header with an unread count, `/notifications` page, opening it marks them read): a reply in a thread you started, a like on your post (one notification per post per liker), your server approved or rejected. Never for your own actions. Rows older than 90 days are deleted by the page load that lists them.
- Reports: a logged-in member reports a post with a reason (5-300 chars), once per post. Staff see open reports in `/mod` and resolve (optionally deleting the post) or dismiss them.
- Search: `/search?q=` over thread titles and post bodies (case-insensitive substring through Prisma, deleted posts excluded, 2-80 chars, 20 results per page). Substring scan is fine for a young forum; switch to Postgres full-text search when it gets slow.
- Profiles: `/u/[id]` shows avatar, name, role badge, join date, post and like counts, latest threads and approved servers. Author names everywhere link to it.
- Rate limit per user, in memory (like the website's `src/lib/api/cache.ts`): 1 thread per 60s, 1 reply per 10s, 3 server submissions per day, 30 likes per minute, 5 reports per 10 minutes, 20 searches per minute. A user owns at most 3 servers.
- Servers are listed publicly only after staff approve them. The owner sees their own pending or rejected server (with the reason).
- Authors edit their own posts for 30 minutes and may delete their own server. Staff (mod, admin): delete any post, pin/lock/delete threads, approve/reject servers, ban/unban a user from the forum. Admin only: nothing extra in the MVP.
- Locked thread: only staff reply. Pagination: 20 threads or servers per page, 20 posts per page.
- Security headers on every response (CSP without Clerk hosts, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, `X-Content-Type-Options: nosniff`).

## Pages

- `/` categories with thread count and latest thread, plus the 5 newest threads.
- `/c/[slug]` thread list (pinned first), "New thread" button.
- `/c/[slug]/new` new thread form (announcements: plus subtitle, banner and second image links).
- `/t/[id]/edit` admins edit an announcement. `/c/announcements/preview` (POST, admin) renders the compose fields as the post in a new window without saving.
- `/t/[id]` thread: posts, reply form, staff controls. Announcements are a blog post: banner image over a blurred copy of itself, then a separate wide box the same width as the banner (date and author, title, subtitle, text, second image), replies below as comments. The category breadcrumb lives in the header after the "Forum" chip. Same dark colors.
- A floating language button (bottom right, every page) sets `dmz_lang`.
- `/servers` approved server cards, filters by language and version, name search (query string, server-side).
- `/servers/new` submit form. `/servers/[id]` detail (copy-address button) with its thread below.
- `/mod` staff queue: open reports, pending servers (approve / reject with reason), banned users.
- `/u/[id]` profile, `/notifications`, `/search`.
- `/auth/login`, `/auth/callback`, `/auth/logout` (POST), `/auth/dev`.
- `404`, `500`.

## i18n

Server-side: `src/i18n/{en,es,pt}.ts` flat key tables, `t(lang, key, vars)` with English fallback. Language = `dmz_lang` cookie, else `Accept-Language`, else `en`. A footer selector sets the cookie. Member-written content is never translated.

## Local run

`npm run dev:all`: starts a local Postgres with no install (Prisma's `prisma dev` local database; if its URL does not work with `@prisma/adapter-pg`, use the `embedded-postgres` dev dependency instead), applies migrations, seeds categories plus sample users, threads and servers, then runs `astro dev` on http://localhost:4321 with `DEV_LOGIN=1`. `.env.example` documents every variable; real Discord login only needs `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` and the redirect `http://localhost:4321/auth/callback`.

## Definition of done

`npm run build` passes, `npm test` passes (node:test: session signing, markdown rendering safety (script tags, `javascript:` links, http images, raw HTML all neutralized), validation schemas, role mapping), and on the dev server a dev-login member can start a markdown thread, reply, like, report, search, see notifications and a profile, submit a server; a dev-login mod can approve it, handle the report, lock/pin/delete, ban; a logged-out visitor can read everything and write nothing.
