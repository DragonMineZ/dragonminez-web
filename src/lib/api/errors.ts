import { Prisma } from "@prisma/client";
import { badRequest, conflict, serverError } from "./response";

export function handlePrismaError(err: unknown): Response {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case "P2002": {
                const targets = Array.isArray(err.meta?.target)
                    ? (err.meta.target as string[]).join(", ")
                    : "a field";
                return conflict(`${targets} already exists`);
            }
            case "P2025":
                return badRequest(
                    "Referenced record not found. If this is your first action on this account, " +
                    "please sign out and back in to sync your profile."
                );
            case "P2003":
                return badRequest("One or more referenced IDs do not exist");
            default:
                console.error(JSON.stringify({
                    timestamp: new Date().toISOString(),
                    level: "error",
                    source: "Prisma",
                    code: err.code,
                    message: err.message,
                    meta: err.meta
                }));
                return serverError("Database error");
        }
    }

    console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        source: "Server",
        error: err instanceof Error ? {
            name: err.name,
            message: err.message,
            stack: err.stack
        } : err
    }));
    return serverError("Unexpected server error");
}


