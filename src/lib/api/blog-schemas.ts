import { z } from "zod";
import { unprocessableEntity } from "./response";

// ── Allowed image providers (same as hairs)
const ALLOWED_IMAGE_PROVIDERS = ["i.imgur.com", "media.discordapp.net"];

function isAllowedImageUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") return false;
        const host = parsed.hostname.toLowerCase();
        return ALLOWED_IMAGE_PROVIDERS.some(
            (p) => host === p || host.endsWith(`.${p}`)
        );
    } catch {
        return false;
    }
}

// ── Create post schema
export const createPostSchema = z.object({
    title: z
        .string({ required_error: "title is required" })
        .trim()
        .min(1, "title cannot be empty")
        .max(150, "title must be 150 characters or less"),

    content: z
        .string({ required_error: "content is required" })
        .min(1, "content cannot be empty")
        .max(100_000, "content must be 100000 characters or less"),

    excerpt: z
        .string()
        .trim()
        .max(300, "excerpt must be 300 characters or less")
        .nullable()
        .optional(),

    cover_image_url: z
        .string()
        .refine((url) => isAllowedImageUrl(url), {
            message: "cover_image_url must be an https URL from i.imgur.com or media.discordapp.net",
        })
        .nullable()
        .optional(),

    categoryId: z
        .number({ invalid_type_error: "categoryId must be a number" })
        .int()
        .positive("categoryId must be a positive integer")
        .nullable()
        .optional(),

    published: z.boolean().default(true),
});

// ── Update post schema (all optional, at least one required)
export const updatePostSchema = createPostSchema
    .partial()
    .refine(
        (data) => Object.values(data).some((v) => v !== undefined),
        { message: "At least one field must be provided for update" }
    );

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

// ── Re-export the shared validateBody helper to keep imports simple
export function validatePostBody<T>(
    schema: z.ZodSchema<T>,
    body: unknown
): { success: true; data: T } | { success: false; error: Response } {
    const result = schema.safeParse(body);
    if (!result.success) {
        const first = result.error.errors[0];
        const field = first.path.length > 0 ? `${first.path.join(".")}: ` : "";
        return { success: false, error: unprocessableEntity(`${field}${first.message}`) };
    }
    return { success: true, data: result.data };
}
