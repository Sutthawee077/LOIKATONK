export type KrathongBaseId =
  | "banana-leaf"
  | "lotus-pink"
  | "bread-turtle"
  | "ice-crystal"
  | "coconut-shell";

export type KrathongFlowerId =
  | "marigold"
  | "orchid"
  | "jasmine-rose"
  | "lotus-petal"
  | "colorful-mix";

export type KrathongCandleId =
  | "gold-wealth"
  | "pink-love"
  | "blue-peace"
  | "purple-career"
  | "white-purity";

export type KrathongToppingId =
  | "coin"
  | "mini-garland"
  | "butterfly"
  | "heart-charm"
  | "none";

export type LanternColorId = "gold" | "amber" | "rose" | "sky";

export interface KrathongItem {
  id: string;
  name: string;
  wish: string;
  base: KrathongBaseId;
  flower: KrathongFlowerId;
  candle: KrathongCandleId;
  topping: KrathongToppingId;
  likes: number;
  lane: number; // 0..3
  createdAt: number;
  isSimulated?: boolean;
}

export interface CreateKrathongInput {
  name: string;
  wish: string;
  base: KrathongBaseId;
  flower: KrathongFlowerId;
  candle: KrathongCandleId;
  topping: KrathongToppingId;
  lane?: number;
}

export interface SkyLanternItem {
  id: string;
  name: string;
  wish: string;
  color: LanternColorId;
  createdAt: number;
  isSimulated?: boolean;
}

export interface CreateLanternInput {
  name: string;
  wish: string;
  color: LanternColorId;
}

export interface PrivateRoomInfo {
  code: string;
  name: string;
  createdBy: string;
  createdAt: number;
}

export interface OptionMeta<T extends string> {
  id: T;
  name: string;
  subtitle: string;
  meaning: string;
  primaryColor: string;
  secondaryColor: string;
}

export const KRATHONG_BASES: OptionMeta<KrathongBaseId>[] = [
  {
    id: "banana-leaf",
    name: "ใบตองจีบวิจิตร",
    subtitle: "ดั้งเดิมเป็นมิตรต่อสายน้ำ",
    meaning: "ความร่มเย็นเป็นสุข ความอุดมสมบูรณ์",
    primaryColor: "#2d6a4f",
    secondaryColor: "#74c69d",
  },
  {
    id: "lotus-pink",
    name: "ดอกบัวหลวงสีชมพู",
    subtitle: "กลีบบัวเบ่งบานกลางแสงจันทร์",
    meaning: "จิตใจผ่องใส บริสุทธิ์ และสิริมงคล",
    primaryColor: "#ec4899",
    secondaryColor: "#fbcfe8",
  },
  {
    id: "bread-turtle",
    name: "ขนมปังเต่ามงคล",
    subtitle: "รักษ์โลก เป็นอาหารปลาได้",
    meaning: "อายุยืนยาว สุขภาพแข็งแรง ปลอดโรคภัย",
    primaryColor: "#d97706",
    secondaryColor: "#fcd34d",
  },
  {
    id: "ice-crystal",
    name: "น้ำแข็งแกะสลัก",
    subtitle: "ละลายเป็นน้ำใสไร้สารตกค้าง",
    meaning: "ความสงบเยือกเย็น ใจใสกระจ่าง",
    primaryColor: "#38bdf8",
    secondaryColor: "#e0f2fe",
  },
  {
    id: "coconut-shell",
    name: "กะลามะพร้าวแกะลาย",
    subtitle: "ภูมิปัญญาล้านนาร่วมสมัย",
    meaning: "รากฐานมั่นคง หนักแน่นดุจขุนเขา",
    primaryColor: "#78350f",
    secondaryColor: "#b45309",
  },
];

export const KRATHONG_FLOWERS: OptionMeta<KrathongFlowerId>[] = [
  {
    id: "marigold",
    name: "ดอกดาวเรืองทอง",
    subtitle: "เหลืองอร่ามเรืองรอง",
    meaning: "ความเจริญรุ่งเรือง โชคลาภพูนทวี",
    primaryColor: "#f59e0b",
    secondaryColor: "#fef08a",
  },
  {
    id: "orchid",
    name: "กล้วยไม้ม่วงไทย",
    subtitle: "อ่อนช้อยสง่างาม",
    meaning: "ความประณีต เสน่ห์เมตตามหานิยม",
    primaryColor: "#9333ea",
    secondaryColor: "#e9d5ff",
  },
  {
    id: "jasmine-rose",
    name: "มะลิซ้อน & กุหลาบแดง",
    subtitle: "หอมกรุ่นแทนใจ",
    meaning: "ความรักมั่นคง ความกตัญญูกตเวที",
    primaryColor: "#e11d48",
    secondaryColor: "#fffbeb",
  },
  {
    id: "lotus-petal",
    name: "กลีบบัวสัตตบงกช",
    subtitle: "งดงามดั่งบูชาพระแม่คงคา",
    meaning: "ปัญญาสว่างไสว สงบสุขร่มเย็น",
    primaryColor: "#f472b6",
    secondaryColor: "#fdf2f8",
  },
  {
    id: "colorful-mix",
    name: "เบญจมาศหลากสี",
    subtitle: "สดใสมีชีวิตชีวา",
    meaning: "ความเบิกบาน ร่าเริง และมิตรภาพ",
    primaryColor: "#fb7185",
    secondaryColor: "#34d399",
  },
];

export const KRATHONG_CANDLES: OptionMeta<KrathongCandleId>[] = [
  {
    id: "gold-wealth",
    name: "เทียนทองมหาลาภ",
    subtitle: "เสริมดวงการเงิน โชคลาภ",
    meaning: "มั่งคั่งร่ำรวย เงินทองไหลมาเทมา",
    primaryColor: "#fbbf24",
    secondaryColor: "#fef3c7",
  },
  {
    id: "pink-love",
    name: "เทียนชมพูเสน่หา",
    subtitle: "เสริมดวงความรัก เมตตา",
    meaning: "สมหวังในรัก ครอบครัวอบอุ่น",
    primaryColor: "#f43f5e",
    secondaryColor: "#ffe4e6",
  },
  {
    id: "blue-peace",
    name: "เทียนฟ้าสันติสุข",
    subtitle: "เสริมดวงสุขภาพ สบายใจ",
    meaning: "กายใจแข็งแรง ราบรื่นตลอดปี",
    primaryColor: "#0ea5e9",
    secondaryColor: "#e0f2fe",
  },
  {
    id: "purple-career",
    name: "เทียนม่วงก้าวหน้า",
    subtitle: "เสริมดวงการงาน การเรียน",
    meaning: "เลื่อนขั้น สอบผ่าน ประสบความสำเร็จ",
    primaryColor: "#a855f7",
    secondaryColor: "#f3e8ff",
  },
  {
    id: "white-purity",
    name: "เทียนขาวบริสุทธิ์",
    subtitle: "ขอขมาพระแม่คงคา",
    meaning: "ปลดปล่อยความทุกข์ เริ่มต้นสิ่งใหม่",
    primaryColor: "#f8fafc",
    secondaryColor: "#fef08a",
  },
];

export const KRATHONG_TOPPINGS: OptionMeta<KrathongToppingId>[] = [
  {
    id: "coin",
    name: "เหรียญขวัญถุงทอง",
    subtitle: "สัญลักษณ์แห่งทรัพย์สิน",
    meaning: "มีกินมีใช้ไม่ขาดมือ",
    primaryColor: "#facc15",
    secondaryColor: "#ca8a04",
  },
  {
    id: "mini-garland",
    name: "พวงมาลัยจิ๋ว",
    subtitle: "ประณีตงดงามแบบไทย",
    meaning: "สิริมงคล คุ้มครองแคล้วคลาด",
    primaryColor: "#f8fafc",
    secondaryColor: "#fb7185",
  },
  {
    id: "butterfly",
    name: "ผีเสื้อทองคำ",
    subtitle: "โบยบินนำพาข่าวดี",
    meaning: "การเปลี่ยนแปลงที่ดีและความสดใส",
    primaryColor: "#f59e0b",
    secondaryColor: "#38bdf8",
  },
  {
    id: "heart-charm",
    name: "จี้หัวใจคู่",
    subtitle: "สื่อรักผูกพัน",
    meaning: "พบเจอคนดี ความรักยืนยาว",
    primaryColor: "#fb7185",
    secondaryColor: "#fda4af",
  },
  {
    id: "none",
    name: "เรียบง่ายดั้งเดิม",
    subtitle: "งดงามอย่างพอดี",
    meaning: "ความเรียบง่าย สบายใจ",
    primaryColor: "#94a3b8",
    secondaryColor: "#cbd5e1",
  },
];

export const LANTERN_COLORS: OptionMeta<LanternColorId>[] = [
  {
    id: "gold",
    name: "โคมทองสุกสกาว",
    subtitle: "สีแห่งความรุ่งเรือง",
    meaning: "อธิษฐานเรื่องความสำเร็จและโชคลาภ",
    primaryColor: "#f59e0b",
    secondaryColor: "#fef08a",
  },
  {
    id: "amber",
    name: "โคมส้มยี่เป็ง",
    subtitle: "อบอุ่นดั่งแสงเทียนล้านนา",
    meaning: "ขอให้ชีวิตอบอุ่นและมีพลังใจ",
    primaryColor: "#ea580c",
    secondaryColor: "#fdba74",
  },
  {
    id: "rose",
    name: "โคมชมพูสมหวัง",
    subtitle: "อ่อนหวานเปี่ยมรัก",
    meaning: "อธิษฐานเรื่องความรักและครอบครัว",
    primaryColor: "#e11d48",
    secondaryColor: "#fecdd3",
  },
  {
    id: "sky",
    name: "โคมฟ้าสันติสุข",
    subtitle: "สงบเย็นดั่งนภา",
    meaning: "ปล่อยวางความกังวล พบความสงบใจ",
    primaryColor: "#0284c7",
    secondaryColor: "#bae6fd",
  },
];

export const WISH_TEMPLATES: { label: string; wish: string }[] = [
  {
    label: "ขอขมาพระแม่คงคา",
    wish: "ขอขมาพระแม่คงคาที่ได้ล่วงเกิน ทั้งตั้งใจและไม่ตั้งใจ ขอให้สายน้ำพัดพาความทุกข์โศกออกไป และนำพาความร่มเย็นเป็นสุขเข้ามาในชีวิต",
  },
  {
    label: "การงาน & การเรียน",
    wish: "ขอให้การงานและการเรียนราบรื่น ประสบความสำเร็จเกินคาด พบเจอแต่มิตรภาพที่ดีและผู้ใหญ่เมตตาอุปถัมภ์ตลอดปี",
  },
  {
    label: "การเงิน & โชคลาภ",
    wish: "ขอให้เงินทองไหลมาเทมา คิดสิ่งใดสมปรารถนา มีกินมีใช้ไม่ขาดมือ และมีพลังแบ่งปันความสุขให้คนรอบข้าง",
  },
  {
    label: "ความรัก & ครอบครัว",
    wish: "ขอให้คนที่รักและครอบครัวมีแต่รอยยิ้ม ความเข้าใจ ความอบอุ่น และอยู่เคียงข้างกันอย่างมีความสุขตลอดไป",
  },
  {
    label: "สุขภาพ & ความสบายใจ",
    wish: "ขอให้สุขภาพกายแข็งแรง สุขภาพใจผ่องใส ปราศจากโรคภัยไข้เจ็บ หลับฝันดีและตื่นมาพร้อมพลังบวกในทุกๆ วัน",
  },
];

export function getOptionMeta<T extends string>(
  list: OptionMeta<T>[],
  id: T
): OptionMeta<T> {
  return list.find((item) => item.id === id) ?? list[0];
}

const now = Date.now();

export const INITIAL_COMMUNITY_KRATHONGS: KrathongItem[] = [
  {
    id: "sim-k-1",
    name: "ต้นข้าว (เชียงใหม่)",
    wish: "ขอให้ปีนี้ครอบครัวสุขภาพแข็งแรง ยิ้มได้ในทุกๆ วัน และขอขมาพระแม่คงคาด้วยใจบริสุทธิ์ค่ะ",
    base: "banana-leaf",
    flower: "marigold",
    candle: "gold-wealth",
    topping: "mini-garland",
    likes: 24,
    lane: 0,
    createdAt: now - 1000 * 60 * 3,
    isSimulated: true,
  },
  {
    id: "sim-k-2",
    name: "พี่นัท & น้องพลอย",
    wish: "ลอยกระทงคู่กันเป็นปีที่ 3 แล้ว ขอให้ความรักของเราสองคนมั่นคงและอบอุ่นแบบนี้ตลอดไปนะ",
    base: "lotus-pink",
    flower: "jasmine-rose",
    candle: "pink-love",
    topping: "heart-charm",
    likes: 38,
    lane: 1,
    createdAt: now - 1000 * 60 * 7,
    isSimulated: true,
  },
  {
    id: "sim-k-3",
    name: "ภูมิ เด็กวิศวะ",
    wish: "ขอให้โปรเจกต์จบผ่านฉลุย บั๊กหายไปกับสายน้ำ ได้งานที่รักและเงินเดือนปังๆ ครับ!",
    base: "bread-turtle",
    flower: "orchid",
    candle: "purple-career",
    topping: "coin",
    likes: 19,
    lane: 2,
    createdAt: now - 1000 * 60 * 11,
    isSimulated: true,
  },
  {
    id: "sim-k-4",
    name: "คุณยายสมศรี",
    wish: "ขอให้ลูกหลานเดินทางปลอดภัย แคล้วคลาดจากภยันตรายทั้งปวง มีความสุขความเจริญทุกคนนะลูก",
    base: "coconut-shell",
    flower: "lotus-petal",
    candle: "white-purity",
    topping: "mini-garland",
    likes: 45,
    lane: 3,
    createdAt: now - 1000 * 60 * 15,
    isSimulated: true,
  },
  {
    id: "sim-k-5",
    name: "Mina from Bangkok",
    wish: "ปล่อยวางความเครียดทั้งหมดลงแม่น้ำเจ้าพระยา คืนนี้ขอให้ใจเบาสบายเหมือนแสงจันทร์เต็มดวง",
    base: "ice-crystal",
    flower: "lotus-petal",
    candle: "blue-peace",
    topping: "butterfly",
    likes: 31,
    lane: 1,
    createdAt: now - 1000 * 60 * 21,
    isSimulated: true,
  },
];

export const INITIAL_COMMUNITY_LANTERNS: SkyLanternItem[] = [
  {
    id: "sim-l-1",
    name: "เมษา",
    wish: "ปล่อยโคมขึ้นฟ้า ขอให้ความฝันสว่างไสว",
    color: "gold",
    createdAt: now - 1000 * 60 * 4,
    isSimulated: true,
  },
  {
    id: "sim-l-2",
    name: "ก้องภพ",
    wish: "ขอให้ครอบครัวมีแต่ความสุขความสงบ",
    color: "amber",
    createdAt: now - 1000 * 60 * 12,
    isSimulated: true,
  },
  {
    id: "sim-l-3",
    name: "ใบเตย",
    wish: "สมหวังในรักและมิตรภาพที่ดีตลอดปี",
    color: "rose",
    createdAt: now - 1000 * 60 * 20,
    isSimulated: true,
  },
  {
    id: "sim-l-4",
    name: "ธันวา",
    wish: "ขอให้โลกใบนี้สงบสุขและใจดีกับทุกคน",
    color: "sky",
    createdAt: now - 1000 * 60 * 30,
    isSimulated: true,
  },
  {
    id: "sim-l-5",
    name: "ณิชา",
    wish: "ยี่เป็งปีนี้ขอให้ชีวิตสดใสเปล่งประกาย",
    color: "gold",
    createdAt: now - 1000 * 60 * 42,
    isSimulated: true,
  },
];
