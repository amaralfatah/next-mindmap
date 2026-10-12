import { addChild, createMap, DEFAULT_TITLE, updateNode, type MindMap } from "@/lib/model";

/**
 * OPML (Outline Processor Markup Language) 2.0 import and export.
 * Standard format supported by outliners and mind mapping software
 * (XMind, MindNode, OmniOutliner, FreeMind, Logseq).
 */

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/\r?\n/g, "&#10;");
}

function unescapeXml(str: string): string {
  return str
    .replace(/&#10;/g, "\n")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

/**
 * Export mind map to an OPML 2.0 XML string.
 */
export function exportOpml(map: MindMap): string {
  const root = map.nodes[map.rootId];
  const title = root.text.trim() || DEFAULT_TITLE;

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    "  <head>",
    `    <title>${escapeXml(title)}</title>`,
    "  </head>",
    "  <body>",
  ];

  function visit(nodeId: string, indent: string) {
    const node = map.nodes[nodeId];
    const textAttr = `text="${escapeXml(node.text || "Idea")}"`;
    const noteAttr = node.note ? ` _note="${escapeXml(node.note)}"` : "";

    if (!node.childIds.length) {
      lines.push(`${indent}<outline ${textAttr}${noteAttr} />`);
    } else {
      lines.push(`${indent}<outline ${textAttr}${noteAttr}>`);
      for (const childId of node.childIds) {
        visit(childId, indent + "  ");
      }
      lines.push(`${indent}</outline>`);
    }
  }

  for (const childId of root.childIds) {
    visit(childId, "    ");
  }

  lines.push("  </body>", "</opml>");
  return lines.join("\n") + "\n";
}

type OutlineEntry = {
  text: string;
  note?: string;
  children: OutlineEntry[];
};

/**
 * Parses outline elements from OPML XML using a streaming token parser
 * that works in both Node.js (vitest) and browser environments.
 */
function parseOutlinesFromXml(xml: string): { title?: string; items: OutlineEntry[] } {
  const titleMatch = xml.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? unescapeXml(titleMatch[1].trim()) : undefined;

  // Extract the <body>...</body> section
  const bodyMatch = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : xml;

  const items: OutlineEntry[] = [];
  const stack: { entry: OutlineEntry; isOpen: boolean }[] = [];

  // Match <outline .../> or <outline ...> or </outline>
  const tagRegex = /<(\/)?outline\b([^>]*?)(\/)?>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(bodyContent)) !== null) {
    const isClosing = Boolean(match[1]);
    const attrs = match[2] || "";
    const isSelfClosing = Boolean(match[3]);

    if (isClosing) {
      if (stack.length > 0) {
        stack.pop();
      }
      continue;
    }

    // Extract text / title attribute
    const textMatch = attrs.match(/\b(?:text|title)="([^"]*)"/i);
    const noteMatch = attrs.match(/\b_note="([^"]*)"/i);

    const text = textMatch ? unescapeXml(textMatch[1]) : "Idea";
    const note = noteMatch ? unescapeXml(noteMatch[1]) : undefined;

    const entry: OutlineEntry = { text, note, children: [] };

    if (stack.length === 0) {
      items.push(entry);
    } else {
      stack[stack.length - 1].entry.children.push(entry);
    }

    if (!isSelfClosing) {
      stack.push({ entry, isOpen: true });
    }
  }

  return { title, items };
}

/**
 * Builds a MindMap from OPML XML string.
 */
export function importOpml(xml: string, fallbackTitle = DEFAULT_TITLE): MindMap {
  const { title, items } = parseOutlinesFromXml(xml);
  const resolvedTitle = title || (items.length === 1 ? items[0].text : fallbackTitle);

  let map = createMap(resolvedTitle);

  // If there's a single top item that matches the title and has children, use its children as branches
  const branches = items.length === 1 && items[0].children.length > 0 && items[0].text === resolvedTitle
    ? items[0].children
    : items;

  function insert(entry: OutlineEntry, parentId: string) {
    const created = addChild(map, parentId, entry.text);
    map = created.map;
    if (entry.note) {
      map = updateNode(map, created.id, { note: entry.note });
    }
    for (const child of entry.children) {
      insert(child, created.id);
    }
  }

  for (const branch of branches) {
    insert(branch, map.rootId);
  }

  return map;
}
