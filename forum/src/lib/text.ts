// The only place user-written markdown becomes HTML. Pure (markdown-it only) so tests can import it.
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });
md.enable("table");
// Links and images must be http(s); anything else stays as literal, escaped text.
md.validateLink = (url) => /^https?:/i.test(url.trim());

md.renderer.rules.link_open = (tokens, i, options, _env, self) => {
  tokens[i].attrSet("rel", "nofollow ugc noopener");
  tokens[i].attrSet("target", "_blank");
  return self.renderToken(tokens, i, options);
};

// https images only; anything else shows its alt text. The title attribute is never emitted.
md.renderer.rules.image = (tokens, i, options, env, self) => {
  const token = tokens[i];
  const src = token.attrGet("src") ?? "";
  const alt = md.utils.escapeHtml(self.renderInlineAsText(token.children ?? [], options, env));
  if (!/^https:/i.test(src)) return alt;
  return `<img src="${md.utils.escapeHtml(src)}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">`;
};

export function renderMarkdown(source: string): string {
  return md.render(source);
}

/** Plain-text preview of markdown for lists and search results, cut at `n` characters. */
export function excerpt(source: string, n: number): string {
  let out = "";
  for (const block of md.parse(source, {})) {
    if (block.type === "inline") {
      for (const child of block.children ?? []) {
        if (child.type === "softbreak" || child.type === "hardbreak") out += " ";
        else if (child.type === "text" || child.type === "code_inline") out += child.content;
        else if (child.type === "image") out += child.children?.map((c) => c.content).join("") ?? "";
      }
      out += " ";
    } else if (block.type === "fence" || block.type === "code_block") {
      out += block.content + " ";
    }
  }
  out = out.replace(/\s+/g, " ").trim();
  return out.length > n ? out.slice(0, Math.max(0, n - 1)).trimEnd() + "…" : out;
}
