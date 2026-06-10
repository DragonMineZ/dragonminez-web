import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Renders untrusted Markdown (blog posts) to sanitized HTML.
 * Server-side only — call from .astro frontmatter or API routes.
 */
export function renderMarkdown(markdown: string): string {
    const rawHtml = marked.parse(markdown, { async: false, gfm: true, breaks: true });

    return sanitizeHtml(rawHtml, {
        allowedTags: [
            "h1", "h2", "h3", "h4", "h5", "h6",
            "p", "br", "hr", "blockquote", "pre", "code",
            "strong", "em", "del", "s",
            "ul", "ol", "li",
            "a", "img",
            "table", "thead", "tbody", "tr", "th", "td",
        ],
        allowedAttributes: {
            a: ["href", "title", "target", "rel"],
            img: ["src", "alt", "title", "width", "height", "loading"],
            code: ["class"],
            th: ["align"],
            td: ["align"],
        },
        allowedSchemes: ["http", "https", "mailto"],
        transformTags: {
            a: sanitizeHtml.simpleTransform("a", {
                target: "_blank",
                rel: "noopener noreferrer nofollow",
            }),
            img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
        },
    });
}

/** Rough reading time in minutes for a Markdown document. */
export function readingTimeMinutes(markdown: string): number {
    const words = markdown.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}

/** Builds a URL-safe slug from a post title (accent-aware for es/pt). */
export function slugify(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "post";
}
