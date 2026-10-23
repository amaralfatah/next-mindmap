import { addChild, createMap, DEFAULT_TITLE, updateNode, type MindMap, type MindNode } from "@/lib/model";

/**
 * Markdown outline format:
 *   # Root
 *   ## Main branch
 *   - child
 *     - grandchild
 *     > note line
 * Bold/italic nodes are wrapped in ** / *. <br> inside a node becomes a line break.
 */

const MD_ESCAPED = /\\([\\*_#[\]<>`])/g;

type Item = { depth: number; text: string; note: string[] };

function parseInline(raw: string): Pick<MindNode, "text" | "bold" | "italic"> {
  let text = raw.trim();
  let bold = false;
  let italic = false;
  const strip = (re: RegExp) => {
    const m = text.match(re);
    if (!m) return false;
    text = m[1];
    return true;
  };
  if (strip(/^\*\*\*(.+)\*\*\*$/s) || strip(/^___(.+)___$/s)) bold = italic = true;
  else {
    if (strip(/^\*\*(.+)\*\*$/s) || strip(/^__(.+)__$/s)) bold = true;
    if (strip(/^\*(.+)\*$/s) || strip(/^_(.+)_$/s)) italic = true;
  }
  // Checkbox items from task lists keep their label only.
  text = text.replace(/^\[[ xX]\]\s+/, "");
  text = text.replace(/<br\s*\/?>/gi, "\n").replace(MD_ESCAPED, "$1");
  return { text, bold, italic };
}

/**
 * Builds a map from a Markdown outline: headings and nested lists of any depth, numbered or not.
 * Loose paragraphs become children of the nearest heading. Works with outlines pasted from
 * notes apps or AI chats, which often skip heading levels or mix list markers.
 */
export function importMarkdown(markdown: string, fallbackTitle = DEFAULT_TITLE): MindMap {
  const items: Item[] = [];
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let inFence = false;
  // Heading levels seen so far map to depths; list depth stacks on the last heading.
  const headingStack: number[] = [];
  let headingDepth = -1;
  const listIndents: number[] = [];

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !line.trim()) continue;

    // A closing run of # only counts after whitespace (CommonMark), so "C#" keeps its #.
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/);
    if (heading) {
      const level = heading[1].length;
      while (headingStack.length && headingStack.at(-1)! >= level) headingStack.pop();
      headingStack.push(level);
      headingDepth = headingStack.length - 1;
      listIndents.length = 0;
      items.push({ depth: headingDepth, text: heading[2], note: [] });
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      items.at(-1)?.note.push(quote[1]);
      continue;
    }

    const list = line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/);
    const indent = list ? list[1].replace(/\t/g, "    ").length : 0;
    if (list) {
      while (listIndents.length && listIndents.at(-1)! > indent) listIndents.pop();
      if (!listIndents.length || listIndents.at(-1)! < indent) listIndents.push(indent);
      items.push({ depth: headingDepth + listIndents.length, text: list[2], note: [] });
      continue;
    }

    // Plain paragraph line.
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) continue; // horizontal rule
    items.push({ depth: headingDepth + 1, text: line.trim(), note: [] });
  }

  if (items.length === 0) return createMap(fallbackTitle);

  // Use a single top-level item as the root; otherwise add a root above everything.
  const minDepth = Math.min(...items.map((i) => i.depth));
  const topLevel = items.filter((i) => i.depth === minDepth);
  let rootItem: Item;
  let rest: Item[];
  if (topLevel.length === 1 && items[0].depth === minDepth) {
    rootItem = items[0];
    rest = items.slice(1).map((i) => ({ ...i, depth: i.depth - minDepth }));
  } else {
    rootItem = { depth: 0, text: fallbackTitle, note: [] };
    rest = items.map((i) => ({ ...i, depth: i.depth - minDepth + 1 }));
  }

  const rootInline = parseInline(rootItem.text);
  let map = createMap(rootInline.text || fallbackTitle);
  map = updateNode(map, map.rootId, {
    bold: rootInline.bold,
    italic: rootInline.italic,
    note: rootItem.note.join("\n"),
  });

  // Parent of each new item is the most recent item with a smaller depth.
  const stack: { depth: number; id: string }[] = [{ depth: 0, id: map.rootId }];
  for (const item of rest) {
    const depth = Math.max(1, item.depth);
    while (stack.length > 1 && stack.at(-1)!.depth >= depth) stack.pop();
    const parent = stack.at(-1)!;
    const { text, bold, italic } = parseInline(item.text);
    const created = addChild(map, parent.id, text);
    map = updateNode(created.map, created.id, { bold, italic, note: item.note.join("\n") });
    stack.push({ depth, id: created.id });
  }
  return map;
}
