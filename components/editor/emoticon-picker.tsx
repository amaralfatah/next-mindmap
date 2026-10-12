"use client";

import { ClockIcon, SearchIcon, SmileIcon, XIcon } from "lucide-react";
import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditor } from "@/lib/editor/store";
import { t } from "@/lib/i18n";
import type { MindNode } from "@/lib/model";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sararia_recent_emoticons";
const MAX_RECENT = 12;

type EmoticonCategory = "popular" | "smileys" | "objects" | "nature" | "symbols" | "kaomoji";

type EmoticonItem = {
  char: string;
  name: string;
  keywords: string;
};

const EMOTICON_DATA: Record<EmoticonCategory, EmoticonItem[]> = {
  popular: [
    { char: "⭐", name: "Star", keywords: "star bintang favorite penting gold yellow" },
    { char: "🔥", name: "Fire", keywords: "fire api hot semangat trending burning" },
    { char: "✅", name: "Checkmark", keywords: "check centang selesai done ok checklist yes benar task" },
    { char: "💡", name: "Light bulb", keywords: "idea lampu ide thought creative terang inspirasi" },
    { char: "🚀", name: "Rocket", keywords: "rocket roket launch cepat launch terbang go progress" },
    { char: "🎯", name: "Bullseye", keywords: "target goal fokus sasaran aim objective" },
    { char: "📌", name: "Pushpin", keywords: "pin pasang catatan note notice penting mark" },
    { char: "⚠️", name: "Warning", keywords: "warning peringatan hati-hati danger awas alert" },
    { char: "❤️", name: "Red heart", keywords: "heart love cinta suka hati merah red love" },
    { char: "💬", name: "Speech bubble", keywords: "chat pesan comment bicara talk diskusi chat" },
    { char: "👏", name: "Clapping hands", keywords: "clap tepuk tangan hebat applause bravo" },
    { char: "🎉", name: "Party popper", keywords: "party pesta selamat celebrate celebration congrats" },
    { char: "💯", name: "Hundred points", keywords: "hundred seratus perfect nilai sempurna 100" },
    { char: "⚡", name: "High voltage", keywords: "lightning petir kilat cepat flash energy listrik" },
    { char: "✨", name: "Sparkles", keywords: "sparkles kilau bintang bersih clean shiny magic" },
    { char: "🌸", name: "Cherry blossom", keywords: "flower bunga sakura pink musim semi cantik" },
  ],
  smileys: [
    { char: "😀", name: "Grinning face", keywords: "grinning smile senang gembira wajah face happy" },
    { char: "😃", name: "Big smile", keywords: "smiley senyum gembira cheerful" },
    { char: "😄", name: "Grinning with eyes", keywords: "smile mata ketawa happy tertawa" },
    { char: "😁", name: "Beaming face", keywords: "grin nyengir gigitan senang" },
    { char: "😆", name: "Laughing squint", keywords: "laugh tertawa ngakak puas haha" },
    { char: "😅", name: "Sweat smile", keywords: "sweat keringat senyum lega nervous" },
    { char: "😂", name: "Tears of joy", keywords: "tears joy lol ngakak ketawa nangis lucu" },
    { char: "🤣", name: "Rolling on floor", keywords: "rofl rolling laughing ngakak guling" },
    { char: "🥲", name: "Smiling tear", keywords: "tear sedih haru bangga bersyukur" },
    { char: "🥹", name: "Holding back tears", keywords: "pleading terharu mohon mata kaca cute" },
    { char: "😊", name: "Smiling blushing", keywords: "blush senyum manis malu hangat" },
    { char: "😇", name: "Halo smile", keywords: "angel malaikat suci baik polos" },
    { char: "🙂", name: "Slight smile", keywords: "slight tenang santai senyum tipis" },
    { char: "😉", name: "Winking face", keywords: "wink kedip genit rahasia paham" },
    { char: "😌", name: "Relieved face", keywords: "relieved lega tenang damai rileks" },
    { char: "😍", name: "Heart eyes", keywords: "heart love jatuh cinta kagum suka" },
    { char: "🥰", name: "Loving face", keywords: "hearts sayang peluk manis bahagia" },
    { char: "😘", name: "Blow kiss", keywords: "kiss cium sayang kiss love" },
    { char: "😋", name: "Delicious face", keywords: "yum enak lezat lapar lidah" },
    { char: "😛", name: "Tongue face", keywords: "tongue melet jahil ejek" },
    { char: "😜", name: "Wink tongue", keywords: "playful bercanda jahil iseng" },
    { char: "🤪", name: "Zany face", keywords: "crazy gila konyol lucu aneh" },
    { char: "😎", name: "Cool sunglasses", keywords: "cool keren kacamata sunglasses mantap" },
    { char: "🤩", name: "Star struck", keywords: "star struck wow takjub kagum excited" },
    { char: "🥳", name: "Party face", keywords: "party pesta rayakan ultah celebrate" },
    { char: "😏", name: "Smirking face", keywords: "smirk sinis sombong nakal paham" },
    { char: "🤔", name: "Thinking face", keywords: "thinking mikir mikir bingung tanya wonder" },
    { char: "🤫", name: "Shushing face", keywords: "shh rahasia diam silent secret" },
    { char: "🤭", name: "Hand over mouth", keywords: "giggle tersipu kaget oops tertawa" },
    { char: "🫡", name: "Saluting face", keywords: "salute hormat siap laksanakan respect" },
    { char: "🤐", name: "Zipper mouth", keywords: "zipper tutup mulut bungkam diam" },
    { char: "🤨", name: "Raised eyebrow", keywords: "suspicious curiga ragu heran skeptical" },
    { char: "😐", name: "Neutral face", keywords: "neutral datar biasa flat" },
    { char: "😑", name: "Expressionless", keywords: "flat tanpa ekspresi bosan lelah" },
    { char: "😶", name: "No mouth", keywords: "speechless no mouth diam hening" },
    { char: "😴", name: "Sleeping face", keywords: "sleep tidur ngantuk lelah zzz" },
    { char: "🤤", name: "Drooling face", keywords: "drool ngiler lapar ingin lezat" },
    { char: "🤒", name: "Sick face", keywords: "sick sakit flu demam termometer" },
    { char: "😷", name: "Mask face", keywords: "mask masker sakit dokter sehat" },
    { char: "🤯", name: "Exploding head", keywords: "mind blown kaget pecah shock gila" },
    { char: "🥵", name: "Hot face", keywords: "hot panas kegerahan pedas lelah" },
    { char: "🥶", name: "Cold face", keywords: "cold dingin beku es menggigil" },
    { char: "😱", name: "Screaming face", keywords: "scream teriak kaget histeris takut" },
    { char: "😨", name: "Fearful face", keywords: "fear takut cemas ngeri waswas" },
    { char: "😰", name: "Anxious face", keywords: "anxious cemas tegang keringat dingin" },
    { char: "😥", name: "Sad relieved", keywords: "sad sedih lega kecewa lelah" },
    { char: "😢", name: "Crying face", keywords: "cry nangis sedih air mata tears" },
    { char: "😭", name: "Loudly crying", keywords: "crying sedih banget nangis jerit" },
    { char: "🥺", name: "Pleading face", keywords: "pleading mohon imut gemas sedih" },
    { char: "😤", name: "Triumph face", keywords: "frustrated kesal sombong berapi-api" },
    { char: "😠", name: "Angry face", keywords: "angry marah gondok sebal mad" },
    { char: "😡", name: "Enraged face", keywords: "rage geram emosi murka red" },
  ],
  objects: [
    { char: "📝", name: "Memo", keywords: "memo note catatan tulis write tugas task" },
    { char: "📋", name: "Clipboard", keywords: "clipboard papan tugas daftar list checklist" },
    { char: "📚", name: "Books", keywords: "books buku belajar study reading perpus" },
    { char: "📖", name: "Open book", keywords: "book baca materi pelajaran buku" },
    { char: "✏️", name: "Pencil", keywords: "pencil pensil tulis edit gambar draft" },
    { char: "💻", name: "Laptop", keywords: "laptop komputer computer tech kerja coding" },
    { char: "📱", name: "Phone", keywords: "phone handphone hp mobile chat call" },
    { char: "📊", name: "Bar chart", keywords: "chart grafik data statistik analisis laporan" },
    { char: "📈", name: "Trend up", keywords: "trend naik profit growth meningkat sukses" },
    { char: "📉", name: "Trend down", keywords: "trend turun loss decline berkurang anjlok" },
    { char: "🔍", name: "Magnifying glass", keywords: "search cari temukan inspect teliti" },
    { char: "🛠️", name: "Hammer & wrench", keywords: "tools alat perbaikan setting setting service" },
    { char: "⚙️", name: "Gear", keywords: "gear roda gigi setting pengaturan mesin config" },
    { char: "⏰", name: "Alarm clock", keywords: "alarm jam waktu deadline pagi bangun" },
    { char: "⏳", name: "Hourglass", keywords: "hourglass waktu pasir sabar proses loading" },
    { char: "🗓️", name: "Calendar", keywords: "calendar tanggal jadwal hari event schedule" },
    { char: "🏆", name: "Trophy", keywords: "trophy piala juara winner juara menang" },
    { char: "🥇", name: "Gold medal", keywords: "medal medali emas juara 1 first rank" },
    { char: "🎨", name: "Artist palette", keywords: "art desain seni gambar lukis kreatif" },
    { char: "🎵", name: "Musical note", keywords: "music musik lagu nada audio nada suara" },
    { char: "🎮", name: "Video game", keywords: "game main mainan gaming konsol santai" },
    { char: "🎁", name: "Gift box", keywords: "gift hadiah kado surprise ulang tahun reward" },
    { char: "🔑", name: "Key", keywords: "key kunci akses rahasia solution solusi" },
    { char: "📦", name: "Package", keywords: "box paket kiriman barang logistik kerdus" },
    { char: "✉️", name: "Envelope", keywords: "mail email surat pesan pesan inbox" },
    { char: "💼", name: "Briefcase", keywords: "work kerja tas kantor bisnis karir" },
    { char: "📎", name: "Paperclip", keywords: "clip jepitan lampiran attach file dokumen" },
    { char: "🏷️", name: "Label tag", keywords: "tag label harga kategori brand mark" },
  ],
  nature: [
    { char: "🌸", name: "Cherry blossom", keywords: "flower bunga sakura pink mekar musim semi" },
    { char: "🌺", name: "Hibiscus", keywords: "flower kembang sepatu bunga tropis merah" },
    { char: "🌻", name: "Sunflower", keywords: "sunflower bunga matahari kuning ceria" },
    { char: "🌹", name: "Rose", keywords: "rose mawar romantis bunga merah cinta" },
    { char: "🍀", name: "Four leaf clover", keywords: "clover daun semanggi hoki keberuntungan lucky" },
    { char: "🌿", name: "Herb", keywords: "leaf daun tanaman hijau segar sehat" },
    { char: "🌱", name: "Seedling", keywords: "seed bibit tunas tumbuh awal baru grow" },
    { char: "🌴", name: "Palm tree", keywords: "palm pohon palem pantai tropis liburan" },
    { char: "🌲", name: "Evergreen tree", keywords: "tree pohon cemara hutan alam hijau" },
    { char: "☀️", name: "Sun", keywords: "sun matahari cerah pagi terang siang panas" },
    { char: "🌙", name: "Crescent moon", keywords: "moon bulan malam tidur santai gelap" },
    { char: "🌈", name: "Rainbow", keywords: "rainbow pelangi warna warni harapan indah" },
    { char: "💧", name: "Droplet", keywords: "water air tetesan bersih segar wudhu minum" },
    { char: "❄️", name: "Snowflake", keywords: "snow salju dingin beku es sejuk winter" },
    { char: "☕", name: "Coffee", keywords: "coffee kopi panas cafe santai ngopi pagi" },
    { char: "🍵", name: "Teacup", keywords: "tea teh hijau matcha hangat rileks" },
    { char: "🧋", name: "Bubble tea", keywords: "boba bubble tea boba manis es drink" },
    { char: "🍕", name: "Pizza", keywords: "pizza makanan makan gurih keju potong" },
    { char: "🍔", name: "Burger", keywords: "burger hamburger junk food daging lezat" },
    { char: "🍟", name: "French fries", keywords: "fries kentang goreng snack renyah asin" },
    { char: "🍩", name: "Doughnut", keywords: "donut donat manis cokelat taburan snack" },
    { char: "🍰", name: "Shortcake", keywords: "cake kue bolu ultah manis dessert" },
    { char: "🍎", name: "Red apple", keywords: "apple apel buah segar merah sehat" },
    { char: "🍓", name: "Strawberry", keywords: "strawberry stroberi buah merah manis asam" },
    { char: "🥑", name: "Avocado", keywords: "avocado alpukat buah hijau sehat lemak" },
    { char: "🐶", name: "Dog", keywords: "dog anjing guk hewan pet setia lucu" },
    { char: "🐱", name: "Cat", keywords: "cat kucing meong pet hewan imut anggora" },
    { char: "🦋", name: "Butterfly", keywords: "butterfly kupu-kupu sayap cantik terbang alam" },
    { char: "🪐", name: "Ringed planet", keywords: "planet saturnus angkasa antariksa bintang kosmik" },
  ],
  symbols: [
    { char: "✅", name: "Checkmark", keywords: "check benar centang selesai yes ok status" },
    { char: "❌", name: "Cross mark", keywords: "cross silang salah batal reject no cancel" },
    { char: "⚠️", name: "Warning", keywords: "warning awas perhatian hati-hati alert danger" },
    { char: "❓", name: "Question mark", keywords: "question tanda tanya ragu bingung faq ask" },
    { char: "❗️", name: "Exclamation mark", keywords: "exclamation tanda seru penting perhatian wajib" },
    { char: "💯", name: "100 percent", keywords: "hundred seratus persen poin sempurna mantap" },
    { char: "🔴", name: "Red circle", keywords: "red circle lingkaran merah stop prioritas tinggi" },
    { char: "🟢", name: "Green circle", keywords: "green circle lingkaran hijau jalan aman aktif" },
    { char: "🟡", name: "Yellow circle", keywords: "yellow circle lingkaran kuning proses pending" },
    { char: "🔵", name: "Blue circle", keywords: "blue circle lingkaran biru info umum netral" },
    { char: "🟣", name: "Purple circle", keywords: "purple circle lingkaran ungu spesial catatan" },
    { char: "⬛", name: "Black square", keywords: "black square kotak hitam pembatas stop" },
    { char: "⬜", name: "White square", keywords: "white square kotak putih checklist kosong" },
    { char: "🔶", name: "Orange diamond", keywords: "diamond wajik oranye aksen tanda" },
    { char: "🔷", name: "Blue diamond", keywords: "diamond wajik biru aksen tanda" },
    { char: "🚩", name: "Triangular flag", keywords: "flag bendera merah mark tanda bahaya penanda" },
    { char: "🏳️", name: "White flag", keywords: "white flag bendera putih menyerah netral damai" },
    { char: "🔒", name: "Locked", keywords: "lock kunci aman privat terlindungi secure" },
    { char: "🔓", name: "Unlocked", keywords: "unlock buka terbuka publik bebas open" },
    { char: "📢", name: "Loudspeaker", keywords: "speaker pengumuman wara-wara info siaran announce" },
    { char: "🔔", name: "Bell", keywords: "bell lonceng notifikasi pengingat alarm reminder" },
    { char: "🔕", name: "Bell muted", keywords: "mute hening matikan notifikasi jangan ganggu" },
    { char: "➕", name: "Plus sign", keywords: "plus tambah add jumlah ekstra positif" },
    { char: "➖", name: "Minus sign", keywords: "minus kurang remove kurangi negatif" },
    { char: "✔️", name: "Heavy checkmark", keywords: "check centang verified centang tebal" },
    { char: "✖️", name: "Multiply cross", keywords: "cross kali perkalian silang hapus" },
  ],
  kaomoji: [
    { char: ":)", name: "Smile", keywords: "smile senyum senang text emoticon" },
    { char: ":-D", name: "Laugh", keywords: "laugh tertawa gembira text emoticon" },
    { char: ";-)", name: "Wink", keywords: "wink kedip genit text emoticon" },
    { char: "<3", name: "Heart", keywords: "heart hati cinta text love" },
    { char: "(^_^)", name: "Happy kaomoji", keywords: "happy kaomoji jepang gembira imut" },
    { char: "(•‿•)", name: "Cheerful", keywords: "cheerful senyum manis kaomoji ramah" },
    { char: "(｡♥‿♥｡)", name: "In love", keywords: "love jatuh cinta kaomoji mata hati" },
    { char: "¯\\_(ツ)_/¯", name: "Shrug", keywords: "shrug entahlah terserah bodo amat shrug" },
    { char: "(ง •̀_•́)ง", name: "Fighting", keywords: "fight semangat berjuang bertarung fight" },
    { char: "(╯°□°)╯︵ ┻━┻", name: "Table flip", keywords: "flip banting meja kesal marah rage" },
    { char: "(T_T)", name: "Crying", keywords: "cry menangis sedih air mata tears" },
    { char: "(づ｡◕‿‿◕｡)づ", name: "Hug", keywords: "hug peluk sayang pelukan manja" },
    { char: "(*^▽^*)", name: "Excited", keywords: "excited riang ceria senang sekali" },
    { char: "(•_•)", name: "Serious", keywords: "serious datar serius kacamata" },
    { char: "(>_<)", name: "Frustrated", keywords: "frustrated aduh pusing kesal sebal" },
    { char: "\\(^o^)/", name: "Hooray", keywords: "hooray hore hore sukses hore" },
  ],
};

const CATEGORIES: { id: EmoticonCategory; label: string; icon: string }[] = [
  { id: "popular", label: "Populer", icon: "⭐" },
  { id: "smileys", label: "Wajah", icon: "😀" },
  { id: "objects", label: "Kerja", icon: "💼" },
  { id: "nature", label: "Alam", icon: "🌸" },
  { id: "symbols", label: "Simbol", icon: "✅" },
  { id: "kaomoji", label: "Teks", icon: "^_^" },
];

export type EmoticonPickerProps = {
  /** If provided, updates this node by default */
  node?: MindNode;
  /** Custom onSelect callback */
  onSelect?: (emoticon: string) => void;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  className?: string;
  triggerButton?: React.ReactNode;
};

/**
 * Emoticon picker popover allowing users to easily browse and insert emojis and kaomoji
 * into mind map nodes or notes.
 */
export function EmoticonPicker({
  node,
  onSelect,
  side = "top",
  align = "start",
  className,
  triggerButton,
}: EmoticonPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<EmoticonCategory>("popular");
  const [query, setQuery] = useState("");
  const [placement, setPlacement] = useState<"append" | "prepend">("append");
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.slice(0, MAX_RECENT);
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const saveRecent = (char: string) => {
    try {
      const next = [char, ...recent.filter((c) => c !== char)].slice(0, MAX_RECENT);
      setRecent(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  };

  const handleSelect = (char: string, e: MouseEvent) => {
    e.stopPropagation();
    saveRecent(char);

    if (onSelect) {
      onSelect(char);
    } else if (node) {
      const { editingId, draft, setDraft, patch } = useEditor.getState();
      const isEditing = editingId === node.id;

      if (isEditing) {
        const current = draft;
        const next =
          placement === "prepend"
            ? current ? `${char} ${current}` : char
            : current ? `${current} ${char}` : char;
        setDraft(next);
      } else {
        const current = node.text || "";
        const next =
          placement === "prepend"
            ? current ? `${char} ${current}` : char
            : current ? `${current} ${char}` : char;
        patch({ text: next }, node.id);
      }
    }

    // Keep open if user holds Shift, otherwise close
    if (!e.shiftKey) {
      setOpen(false);
    }
  };

  // Filtered list based on search query
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches: EmoticonItem[] = [];
    const seen = new Set<string>();

    for (const cat of Object.values(EMOTICON_DATA)) {
      for (const item of cat) {
        if (seen.has(item.char)) continue;
        if (item.char.includes(q) || item.name.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q)) {
          seen.add(item.char);
          matches.push(item);
        }
      }
    }
    return matches;
  }, [query]);

  const activeItems = useMemo(() => {
    return EMOTICON_DATA[activeCategory] || [];
  }, [activeCategory]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                triggerButton ? (
                  (triggerButton as React.ReactElement)
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-9 text-foreground/80 hover:text-foreground [&_svg]:size-[18px]",
                      open && "bg-accent text-foreground",
                      className,
                    )}
                    aria-label={t.editor.emoticon}
                  >
                    <SmileIcon />
                  </Button>
                )
              }
            />
          }
        >
          <SmileIcon />
        </TooltipTrigger>
        <TooltipContent side={side}>{t.editor.emoticon}</TooltipContent>
      </Tooltip>

      <PopoverContent
        side={side}
        align={align}
        className="w-[310px] p-2.5 shadow-xl sm:w-[330px]"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Search & Placement Controls */}
        <div className="flex flex-col gap-2">
          <div className="relative flex items-center">
            <SearchIcon className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.editor.emoticonSearch}
              className="h-8 w-full rounded-lg border border-border/80 bg-background pl-8 pr-7 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ink"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 grid size-4 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label={t.editor.emoticonClearSearch}
              >
                <XIcon className="size-3" />
              </button>
            )}
          </div>

          {/* Placement Toggle: Prepend / Append */}
          <div className="flex items-center justify-between px-0.5 text-[11px] text-muted-foreground">
            <span>Posisi:</span>
            <div className="flex rounded-md border border-border/60 bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setPlacement("prepend")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  placement === "prepend" ? "bg-background text-foreground shadow-2xs" : "hover:text-foreground",
                )}
              >
                {t.editor.emoticonPrepend}
              </button>
              <button
                type="button"
                onClick={() => setPlacement("append")}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  placement === "append" ? "bg-background text-foreground shadow-2xs" : "hover:text-foreground",
                )}
              >
                {t.editor.emoticonAppend}
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs (shown when not searching) */}
        {!query && (
          <div className="mt-2 flex items-center justify-between border-b border-border/70 pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-1.5 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                  activeCategory === cat.id ? "text-ink font-semibold" : "text-muted-foreground hover:text-foreground",
                )}
                title={cat.label}
              >
                <span className="text-sm leading-none">{cat.icon}</span>
                <span className="text-[10px]">{cat.label}</span>
                {activeCategory === cat.id && (
                  <span className="absolute inset-x-1 -bottom-1 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Emoticon Grid Content */}
        <div className="mt-2 max-h-[220px] overflow-y-auto px-0.5 [scrollbar-width:thin]">
          {query ? (
            searchResults.length > 0 ? (
              <div className="grid grid-cols-7 gap-1">
                {searchResults.map((item) => (
                  <button
                    key={item.char}
                    type="button"
                    onClick={(e) => handleSelect(item.char, e)}
                    className="grid size-9 place-items-center rounded-lg text-lg transition-transform duration-100 ease-out hover:scale-115 hover:bg-muted active:scale-95 cursor-pointer"
                    title={item.name}
                  >
                    {item.char}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p>{t.editor.emoticonNoMatch}</p>
              </div>
            )
          ) : (
            <>
              {/* Recent Row if available and on popular tab */}
              {activeCategory === "popular" && recent.length > 0 && (
                <div className="mb-2">
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <ClockIcon className="size-3" />
                    <span>{t.editor.emoticonRecent}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {recent.map((char) => (
                      <button
                        key={`recent-${char}`}
                        type="button"
                        onClick={(e) => handleSelect(char, e)}
                        className="grid size-8 place-items-center rounded-md text-base transition-transform duration-100 ease-out hover:scale-110 hover:bg-muted active:scale-95 cursor-pointer"
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Kaomoji (text) list or Emoji grid */}
              {activeCategory === "kaomoji" ? (
                <div className="flex flex-wrap gap-1.5 py-1">
                  {activeItems.map((item) => (
                    <button
                      key={item.char}
                      type="button"
                      onClick={(e) => handleSelect(item.char, e)}
                      className="rounded-lg border border-border/80 bg-muted/40 px-2 py-1 font-mono text-xs text-foreground transition-all hover:border-ink hover:bg-background hover:text-ink active:scale-95 cursor-pointer"
                      title={item.name}
                    >
                      {item.char}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1 py-0.5">
                  {activeItems.map((item) => (
                    <button
                      key={item.char}
                      type="button"
                      onClick={(e) => handleSelect(item.char, e)}
                      className="grid size-9 place-items-center rounded-lg text-lg transition-transform duration-100 ease-out hover:scale-115 hover:bg-muted active:scale-95 cursor-pointer"
                      title={item.name}
                    >
                      {item.char}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
