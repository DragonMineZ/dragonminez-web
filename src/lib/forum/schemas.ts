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

// host[:port]: a domain with a letter TLD (play.example.com) or an IPv4 address, no scheme, path or spaces.
// Also used as the input's `pattern` attribute, so it avoids flags and stays valid in the browser's `v` mode.
const label = String.raw`[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?`;
const octet = String.raw`(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)`;
export const ADDRESS_PATTERN = String.raw`(?:${octet}(?:\.${octet}){3}|(?:${label}\.)+[a-zA-Z]{2,63})(?::\d{1,5})?`;
const address = z
  .string()
  .trim()
  .max(120)
  .regex(new RegExp(`^${ADDRESS_PATTERN}$`))
  .refine((v) => !v.includes(":") || Number(v.split(":")[1]) <= 65535);

const invite = z
  .string()
  .trim()
  .regex(/^https:\/\/(?:discord\.gg|discord\.com\/invite)\/[A-Za-z0-9_-]{2,32}$/)
  .or(z.literal(""))
  .optional()
  .transform((v) => v || undefined);

export const serverSchema = z
  .object({
    name: z.string().trim().min(3).max(60),
    address,
    language: z.enum(["en", "es", "pt", "other"]),
    // Only kept when language is "other": a language name (letters, spaces, hyphens).
    languageOther: z.string().trim().max(40).optional(),
    description: z.string().trim().min(20).max(5000),
    discordInvite: invite,
  })
  .superRefine((v, ctx) => {
    if (v.language === "other" && !/^\p{L}[\p{L} \-]{1,39}$/u.test(v.languageOther ?? "")) {
      ctx.addIssue({ code: "custom", path: ["languageOther"] });
    }
  })
  .transform((v) => ({ ...v, languageOther: v.language === "other" ? v.languageOther : undefined }));

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
