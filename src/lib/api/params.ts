export function parseId(value: string | undefined): number | null {
    if (!value) return null;
    const n = parseInt(value, 10);
    return isNaN(n) || n <= 0 ? null : n;
}

export function isPositiveIntArray(value: unknown): value is number[] {

    return (
        Array.isArray(value) &&
        value.every((id) => typeof id === "number" && Number.isInteger(id) && id > 0)
    );
}
