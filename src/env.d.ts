/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** The forum user of this request, set by src/middleware.ts on /forum and /api/forum. A banned user is still set (banned: true). */
    user: import("./lib/forum/auth").ForumUser | null;
  }
}
