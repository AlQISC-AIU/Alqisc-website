import "server-only";
import sanitizeHtml from "sanitize-html";

export function sanitizeRichText(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: [
            "p", "br", "strong", "b", "em", "i", "u", "s", "blockquote", "code", "pre",
            "h1", "h2", "h3", "h4", "ul", "ol", "li", "a", "img", "hr", "span",
        ],
        allowedAttributes: {
            a: ["href", "target", "rel"],
            img: ["src", "alt", "title", "width", "height"],
            "*": ["style"],
        },
        allowedSchemes: ["https", "mailto", "tel"],
        allowedSchemesByTag: { img: ["https"] },
        allowedStyles: {
            "*": {
                color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i],
                "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i],
                "text-align": [/^(left|right|center|justify)$/],
            },
        },
        transformTags: {
            a: (_tagName, attribs) => ({
                tagName: "a",
                attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
            }),
        },
    });
}
