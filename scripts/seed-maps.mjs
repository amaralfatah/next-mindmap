// Seeds the yearly mind maps for one user. Updates the existing empty rows by title, else inserts.
// Usage: node scripts/seed-maps.mjs <user email>
import { neon } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";

process.loadEnvFile(".env.local");
const sql = neon(process.env.DATABASE_URL);
const email = process.argv[2];
if (!email) throw new Error("Usage: node scripts/seed-maps.mjs <user email>");

const id = () => randomBytes(8).toString("base64url").slice(0, 10);

// [text, color?, side?, children?]
const maps = {
  "My 2025 Mind Map": [
    ["Kerja", "indigo", "right", [
      ["Utama", , , [["PTPN"]]],
      ["Freelance", , , [["Projekan"], ["Entercode"]]],
      ["Remote Luar Negeri"],
      ["Dumbways"],
    ]],
    ["Nabung", "plum", "right", [["Crypto", , , [["Hbar"]]]]],
    ["Belajar", "rose", "right", [
      ["Bahasa Inggris", , , [["Kursus"]]],
      ["React", , , [["BWA"]]],
      ["Express"],
      ["Python"],
      ["Blockchain", , , [["Lisk idrx"]]],
      ["Cyber Security", , , [["Hacktrace"]]],
      ["Logic", , , [["HackerRank"]]],
    ]],
    ["Bayar Hutang", "clay", "right", [["Puasa", , , [["1"]]]]],
    ["Self", "ochre", "right", [["x"], ["v"], ["Duha"]]],
    ["Kasay", "moss", "left"],
    ["Bisnis", "teal", "left", [
      ["TokoCacha", , , [["Web"], ["Sosmed"]]],
      ["Cupang"],
      ["IDE lain"],
    ]],
  ],
  "My 2024 Mind Map": [
    ["kerja", "indigo", "right", [["desain grafis"], ["programmer"]]],
    ["project", "plum", "right", [["shuttle bus"]]],
    ["kasay", "rose", "right"],
    ["belajar", "clay", "right", [["laravel"], ["flutter", , , [["yt kurdi project"], ["habis kerja"]]]]],
    ["nabung", "ochre", "right"],
    ["Lulus", "moss", "left"],
    ["MBKM", "teal", "left"],
  ],
  "My 2023 Mind Map": [
    ["Magang", "indigo", "right", [["Laporan"], ["Eprint"]]],
    ["SE BSI", "plum", "right", [["Belajar Desain UI"]]],
    ["Project Reza", "rose", "right"],
    ["Skripsi", "clay", "right"],
    ["kasay", "ochre", "right"],
    ["Belajar", "moss", "left", [
      ["codewithbahri"],
      ["habiskerja"],
      ["Jabar Digital Academy"],
      ["Mahir Techno"],
    ]],
    ["ReUpload TSE", "teal", "left"],
  ],
};

function build(title, tree, rootId) {
  const nodes = {};
  const add = ([text, color, side, kids = []], parentId, nid = id()) => {
    const node = { id: nid, parentId, childIds: [], text };
    if (color) node.color = color;
    if (side) node.side = side;
    nodes[nid] = node;
    for (const k of kids) node.childIds.push(add(k, nid));
    return nid;
  };
  add([title, , , tree], null, rootId);
  return nodes;
}

const [user] = await sql`select id from neon_auth."user" where email = ${email}`;
if (!user) throw new Error(`No user with email ${email}`);

for (const [title, tree] of Object.entries(maps)) {
  const [row] = await sql`select id, root_id from maps where user_id = ${user.id} and title = ${title} limit 1`;
  const now = Date.now();
  const rootId = row?.root_id ?? id();
  const nodes = build(title, tree, rootId);
  if (row) {
    await sql`update maps set nodes = ${JSON.stringify(nodes)}::jsonb, relations = null, updated_at = ${now} where id = ${row.id}`;
  } else {
    await sql`insert into maps (id, user_id, title, root_id, nodes, created_at, updated_at, schema_version)
              values (${id()}, ${user.id}, ${title}, ${rootId}, ${JSON.stringify(nodes)}::jsonb, ${now}, ${now}, 1)`;
  }
  console.log(`${row ? "updated" : "inserted"} ${title}: ${Object.keys(nodes).length} nodes`);
}
