// Input schemas for write handlers. Pure (zod only) so tests can import it. Later tasks add theirs here.
import { z } from "zod";

const body = z.string().trim().min(1).max(5000);

export const threadSchema = z.object({
  title: z.string().trim().min(5).max(120),
  body,
});

// Announcements are blog posts: optional subtitle plus a banner and a second image (https links; blank = none).
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .regex(/^https:\/\/[^\s]+$/)
  .or(z.literal(""))
  .optional()
  .transform((v) => v || undefined);

export const announcementSchema = threadSchema.extend({
  subtitle: z.string().trim().max(200).optional().transform((v) => v || undefined),
  cover: httpsUrl,
  image: httpsUrl,
});

export const replySchema = z.object({ body });

export const reportSchema = z.object({ reason: z.string().trim().min(5).max(300) });

// host[:port]: hostname labels or an IPv4 address, no scheme, path or spaces.
const label = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const address = z
  .string()
  .trim()
  .min(3)
  .max(120)
  .regex(new RegExp(String.raw`^${label}(?:\.${label})*(?::\d{1,5})?$`, "i"))
  .refine((v) => !v.includes(":") || Number(v.split(":")[1]) <= 65535);

const invite = z
  .string()
  .trim()
  .regex(/^https:\/\/(?:discord\.gg|discord\.com\/invite)\/[A-Za-z0-9_-]{2,32}$/)
  .or(z.literal(""))
  .optional()
  .transform((v) => v || undefined);

export const serverSchema = z.object({
  name: z.string().trim().min(3).max(60),
  address,
  version: z.string().trim().min(1).max(20),
  language: z.enum(["en", "es", "pt", "other"]),
  description: z.string().trim().min(20).max(2000),
  discordInvite: invite,
});

export const rejectSchema = z.object({ reason: z.string().trim().min(5).max(300) });

// Bug reports: a structured form that is stored as one markdown post (see c/[slug]/new.astro).
export const bugSchema = z.object({
  title: threadSchema.shape.title,
  version: z.string().trim().min(1).max(40),
  env: z.string().trim().min(1).max(80),
  log: httpsUrl,
  what: z.string().trim().min(1).max(3000),
  steps: z.string().trim().max(1500).optional().transform((v) => v || undefined),
});

export const roleSchema = z.object({
  name: z.string().trim().min(2).max(32),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
