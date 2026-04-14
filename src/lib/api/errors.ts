import { Prisma } from "../../generated/client/client";
import { badRequest, conflict, serverError } from "./response";

export function handlePrismaError(err: unknown): Response {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case "P2002":
                return conflict("errors.api.alreadyExists");
            case "P2025":
                return badRequest("errors.api.recordNotFound");
            case "P2003":
                return badRequest("errors.api.invalidReference");
            default:
                console.error(JSON.stringify({
                    timestamp: new Date().toISOString(),
                    level: "error",
                    source: "Prisma",
                    code: err.code,
                    message: err.message,
                    meta: err.meta
                }));
                return serverError("errors.api.databaseError");
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
    return serverError("errors.api.serverError");
}


