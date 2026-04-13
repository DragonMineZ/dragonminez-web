import { z } from "zod";
import { badRequest, unprocessableEntity } from "./response";

const HAIR_CODE_REGEX = /^DMZF?[145]:[A-Za-z0-9_-]+$/i;

export const createHairSchema = z.object({

    name: z
        .string({ required_error: "name is required", invalid_type_error: "name must be a string" })
        .trim()
        .min(1, "name cannot be empty or whitespace-only")
        .max(100, "name must be 100 characters or less"),

    code: z
        .string({ required_error: "code is required", invalid_type_error: "code must be a string" })
        .regex(
            HAIR_CODE_REGEX,
            "code must follow the DMZ format: DMZ[F][1|4|5]:<data> with no spaces (e.g. DMZ5:aB3xY...)"
        ),

    image_url: z
        .string({ required_error: "image_url is required", invalid_type_error: "image_url must be a string" })
        .url("image_url must be a valid URL"),

    description: z
        .string({ invalid_type_error: "description must be a string" })
        .trim()
        .max(1000, "description must be 1000 characters or less")
        .nullable()
        .optional(),

    categoryIds: z
        .array(
            z.number({ invalid_type_error: "each categoryId must be a number" })
                .int("each categoryId must be an integer")
                .positive("each categoryId must be a positive integer"),
            { invalid_type_error: "categoryIds must be an array of positive integers" }
        )
        .optional(),
});

export const updateHairSchema = createHairSchema

    .partial()
    .refine(
        (data) => Object.values(data).some((v) => v !== undefined),
        { message: "At least one field must be provided for update" }
    );

export type CreateHairInput = z.infer<typeof createHairSchema>;
export type UpdateHairInput = z.infer<typeof updateHairSchema>;

export function validateBody<T>(

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
