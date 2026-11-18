/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Set by src/middleware.ts on every request. A banned user is still set (banned: true) so pages can say so. */
    user: {
      id: number;
      username: string;
      avatarUrl: string | null;
      role: "member" | "mod" | "admin";
      banned: boolean;
    } | null;
  }
}
