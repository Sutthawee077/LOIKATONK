import { initializeApp, getApps, deleteApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import {
  INITIAL_COMMUNITY_KRATHONGS,
  INITIAL_COMMUNITY_LANTERNS,
  type CreateKrathongInput,
  type CreateLanternInput,
  type KrathongItem,
  type SkyLanternItem,
  type PrivateRoomInfo,
  type KrathongBaseId,
  type KrathongFlowerId,
  type KrathongCandleId,
  type KrathongToppingId,
  type LanternColorId,
} from "@/types/krathong";

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export type ConnectionMode = "firebase" | "local";

const CONFIG_STORAGE_KEY = "loy_krathong_firebase_config";
const LOCAL_KRATHONGS_KEY = "loy_krathong_local_krathongs_v2";
const LOCAL_LANTERNS_KEY = "loy_krathong_local_lanterns_v1";
const LOCAL_ROOMS_KEY = "loy_krathong_local_rooms_v1";
const LOCAL_SIM_LIKES_KEY = "loy_krathong_sim_likes_v1";
const MY_KRATHONGS_KEY = "loy_krathong_my_ids_v1";
const LIKED_KRATHONGS_KEY = "loy_krathong_liked_ids_v1";
const BROADCAST_CHANNEL_NAME = "loy_krathong_channel";

const APP_NAME = "loy-krathong-realtime-app";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

const DEFAULT_FIREBASE_CONFIG: FirebaseWebConfig = {
  apiKey: "AIzaSyB6VhTfq7ctVgS5OXT81MXP0tvRJ7P6bks",
  authDomain: "loikatonk.firebaseapp.com",
  projectId: "loikatonk",
  storageBucket: "loikatonk.firebasestorage.app",
  messagingSenderId: "900590648648",
  appId: "1:900590648648:web:c631a65159dd092f67477d",
};

function getEnvFirebaseConfig(): FirebaseWebConfig {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || DEFAULT_FIREBASE_CONFIG.apiKey;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || DEFAULT_FIREBASE_CONFIG.projectId;
  return {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || DEFAULT_FIREBASE_CONFIG.appId,
  };
}

export function getCustomFirebaseConfig(): FirebaseWebConfig | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FirebaseWebConfig>;
    if (!parsed.apiKey || !parsed.projectId) return null;
    return {
      apiKey: String(parsed.apiKey).trim(),
      authDomain: parsed.authDomain ? String(parsed.authDomain).trim() : `${parsed.projectId}.firebaseapp.com`,
      projectId: String(parsed.projectId).trim(),
      storageBucket: parsed.storageBucket ? String(parsed.storageBucket).trim() : undefined,
      messagingSenderId: parsed.messagingSenderId ? String(parsed.messagingSenderId).trim() : undefined,
      appId: parsed.appId ? String(parsed.appId).trim() : undefined,
    };
  } catch {
    return null;
  }
}

export function getActiveFirebaseConfig(): {
  config: FirebaseWebConfig | null;
  source: "env" | "browser" | "none";
} {
  const custom = getCustomFirebaseConfig();
  if (custom) return { config: custom, source: "browser" };
  const env = getEnvFirebaseConfig();
  if (env) return { config: env, source: "env" };
  return { config: null, source: "none" };
}

/**
 * Parse either pure JSON or a JS snippet copied from Firebase Console
 * (e.g. `const firebaseConfig = { apiKey: "...", projectId: "..." };`).
 */
export function parseFirebaseConfigInput(rawInput: string): FirebaseWebConfig {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("กรุณาวาง Firebase Config JSON หรือโค้ดจาก Firebase Console");
  }

  // Try direct JSON first
  try {
    const json = JSON.parse(trimmed) as Partial<FirebaseWebConfig>;
    if (json.apiKey && json.projectId) {
      return {
        apiKey: String(json.apiKey).trim(),
        authDomain: json.authDomain ? String(json.authDomain).trim() : undefined,
        projectId: String(json.projectId).trim(),
        storageBucket: json.storageBucket ? String(json.storageBucket).trim() : undefined,
        messagingSenderId: json.messagingSenderId ? String(json.messagingSenderId).trim() : undefined,
        appId: json.appId ? String(json.appId).trim() : undefined,
      };
    }
  } catch {
    // Fallback to key extraction from JS object literal
  }

  const extractField = (field: string): string | undefined => {
    const regex = new RegExp(`["']?${field}["']?\\s*:\\s*["']([^"']+)["']`, "i");
    const match = trimmed.match(regex);
    return match?.[1]?.trim();
  };

  const apiKey = extractField("apiKey");
  const projectId = extractField("projectId");
  if (!apiKey || !projectId) {
    throw new Error("ไม่พบ apiKey หรือ projectId ในข้อมูลที่วาง กรุณาตรวจสอบอีกครั้ง");
  }

  return {
    apiKey,
    authDomain: extractField("authDomain") ?? `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: extractField("storageBucket"),
    messagingSenderId: extractField("messagingSenderId"),
    appId: extractField("appId"),
  };
}

let cachedDb: Firestore | null = null;
let cachedConfigKey = "";

async function resetFirebaseApp(): Promise<void> {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) {
    try {
      await deleteApp(existing);
    } catch {
      // Ignore cleanup errors
    }
  }
  cachedDb = null;
  cachedConfigKey = "";
}

function getFirestoreClient(): Firestore | null {
  const { config } = getActiveFirebaseConfig();
  if (!config) return null;

  const key = `${config.apiKey}:${config.projectId}:${config.appId ?? ""}`;
  if (cachedDb && cachedConfigKey === key) {
    return cachedDb;
  }

  try {
    let app: FirebaseApp | undefined = getApps().find((a) => a.name === APP_NAME);
    if (app && cachedConfigKey && cachedConfigKey !== key) {
      // Config changed at runtime; re-init cleanly on next tick or synchronously replace
      void deleteApp(app).catch(() => undefined);
      app = undefined;
    }
    if (!app) {
      app = initializeApp(config, APP_NAME);
    }
    cachedDb = getFirestore(app);
    cachedConfigKey = key;
    return cachedDb;
  } catch {
    return null;
  }
}

export async function saveCustomFirebaseConfig(configInput: string): Promise<FirebaseWebConfig> {
  const parsed = parseFirebaseConfigInput(configInput);
  if (isBrowser()) {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(parsed));
  }
  await resetFirebaseApp();
  broadcastLocalUpdate();
  return parsed;
}

export async function clearCustomFirebaseConfig(): Promise<void> {
  if (isBrowser()) {
    window.localStorage.removeItem(CONFIG_STORAGE_KEY);
  }
  await resetFirebaseApp();
  broadcastLocalUpdate();
}

// --- Local Fallback & Cross-Tab Realtime Helpers ---

function readJsonStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStorage<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

const LOCAL_SYNC_EVENT = "loy-krathong-local-sync";

function broadcastLocalUpdate(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(LOCAL_SYNC_EVENT));
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    ch.postMessage({ type: "sync", ts: Date.now() });
    ch.close();
  } catch {
    // Ignore BroadcastChannel errors
  }
}

function getSimLikesMap(): Record<string, number> {
  return readJsonStorage<Record<string, number>>(LOCAL_SIM_LIKES_KEY, {});
}

// --- Private Room Helpers ---

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeRoomCode(code?: string | null): string | null {
  if (!code) return null;
  const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < 4 || cleaned.length > 12) return null;
  return cleaned;
}

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

function getRoomKrathongsKey(roomCode: string): string {
  return `loy_krathong_room_${roomCode}_krathongs_v1`;
}

function getRoomLanternsKey(roomCode: string): string {
  return `loy_krathong_room_${roomCode}_lanterns_v1`;
}

function getLocalKrathongs(roomCode?: string | null): KrathongItem[] {
  const activeRoom = normalizeRoomCode(roomCode);
  if (activeRoom) {
    const roomItems = readJsonStorage<KrathongItem[]>(getRoomKrathongsKey(activeRoom), []);
    return [...roomItems].sort((a, b) => b.createdAt - a.createdAt).slice(0, 60);
  }

  const saved = readJsonStorage<KrathongItem[]>(LOCAL_KRATHONGS_KEY, []);
  const simLikes = getSimLikesMap();
  const simWithLikes = INITIAL_COMMUNITY_KRATHONGS.map((k) => ({
    ...k,
    likes: k.likes + (simLikes[k.id] ?? 0),
  }));

  const merged = [...saved, ...simWithLikes];
  merged.sort((a, b) => b.createdAt - a.createdAt);
  return merged.slice(0, 60);
}

function getLocalLanterns(roomCode?: string | null): SkyLanternItem[] {
  const activeRoom = normalizeRoomCode(roomCode);
  if (activeRoom) {
    const roomItems = readJsonStorage<SkyLanternItem[]>(getRoomLanternsKey(activeRoom), []);
    return [...roomItems].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
  }

  const saved = readJsonStorage<SkyLanternItem[]>(LOCAL_LANTERNS_KEY, []);
  const merged = [...saved, ...INITIAL_COMMUNITY_LANTERNS];
  merged.sort((a, b) => b.createdAt - a.createdAt);
  return merged.slice(0, 30);
}

export async function createPrivateRoom(
  name: string,
  createdBy: string
): Promise<PrivateRoomInfo> {
  const cleanName = name.trim().slice(0, 60) || "ห้องลอยกระทงส่วนตัว";
  const cleanCreator = createdBy.trim().slice(0, 50) || "เจ้าภาพห้อง";
  let code = generateRoomCode();

  const db = getFirestoreClient();
  if (db) {
    try {
      // Check once in case of rare collision
      const checkSnap = await getDoc(doc(db, "rooms", code));
      if (checkSnap.exists()) {
        code = generateRoomCode();
      }
      await setDoc(doc(db, "rooms", code), {
        name: cleanName,
        createdBy: cleanCreator,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Save locally below if offline or blocked
    }
  }

  const info: PrivateRoomInfo = {
    code,
    name: cleanName,
    createdBy: cleanCreator,
    createdAt: Date.now(),
  };

  const roomsMap = readJsonStorage<Record<string, PrivateRoomInfo>>(LOCAL_ROOMS_KEY, {});
  roomsMap[code] = info;
  writeJsonStorage(LOCAL_ROOMS_KEY, roomsMap);
  return info;
}

export async function getPrivateRoom(codeInput: string): Promise<PrivateRoomInfo | null> {
  const code = normalizeRoomCode(codeInput);
  if (!code) return null;

  const db = getFirestoreClient();
  if (db) {
    try {
      const snap = await getDoc(doc(db, "rooms", code));
      if (snap.exists()) {
        const data = snap.data({ serverTimestamps: "estimate" });
        const info: PrivateRoomInfo = {
          code,
          name: String(data.name ?? `ห้อง ${code}`),
          createdBy: String(data.createdBy ?? "เจ้าภาพห้อง"),
          createdAt: toEpochMs(data.createdAt),
        };
        const roomsMap = readJsonStorage<Record<string, PrivateRoomInfo>>(LOCAL_ROOMS_KEY, {});
        roomsMap[code] = info;
        writeJsonStorage(LOCAL_ROOMS_KEY, roomsMap);
        return info;
      }
    } catch {
      // Fallback to local cache if offline
    }
  }

  const localRooms = readJsonStorage<Record<string, PrivateRoomInfo>>(LOCAL_ROOMS_KEY, {});
  return localRooms[code] ?? null;
}

export function getMyKrathongIds(): string[] {
  return readJsonStorage<string[]>(MY_KRATHONGS_KEY, []);
}

export function addMyKrathongId(id: string): string[] {
  const existing = getMyKrathongIds();
  const next = Array.from(new Set([id, ...existing])).slice(0, 50);
  writeJsonStorage(MY_KRATHONGS_KEY, next);
  return next;
}

export function getLikedKrathongIds(): string[] {
  return readJsonStorage<string[]>(LIKED_KRATHONGS_KEY, []);
}

export function markKrathongLiked(id: string): string[] {
  const existing = getLikedKrathongIds();
  if (existing.includes(id)) return existing;
  const next = [id, ...existing].slice(0, 200);
  writeJsonStorage(LIKED_KRATHONGS_KEY, next);
  return next;
}

function toEpochMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

// --- Public & Private-Room Realtime Subscriptions & Mutations ---

export function subscribeKrathongs(
  onUpdate: (items: KrathongItem[]) => void,
  onModeChange?: (mode: ConnectionMode, errorMsg?: string) => void,
  roomCode?: string | null
): () => void {
  const activeRoom = normalizeRoomCode(roomCode);
  const db = getFirestoreClient();

  if (!db) {
    onModeChange?.("local");
    onUpdate(getLocalKrathongs(activeRoom));

    const targetKey = activeRoom ? getRoomKrathongsKey(activeRoom) : LOCAL_KRATHONGS_KEY;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === targetKey || (!activeRoom && e.key === LOCAL_SIM_LIKES_KEY)) {
        onUpdate(getLocalKrathongs(activeRoom));
      }
    };

    const handleLocalSync = () => onUpdate(getLocalKrathongs(activeRoom));

    let channel: BroadcastChannel | null = null;
    if (isBrowser() && typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = () => onUpdate(getLocalKrathongs(activeRoom));
    }

    if (isBrowser()) {
      window.addEventListener("storage", handleStorage);
      window.addEventListener(LOCAL_SYNC_EVENT, handleLocalSync);
    }

    return () => {
      if (isBrowser()) {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(LOCAL_SYNC_EVENT, handleLocalSync);
      }
      channel?.close();
    };
  }

  let unsubSnapshot: Unsubscribe | null = null;
  let active = true;

  try {
    const colRef = activeRoom
      ? collection(db, "rooms", activeRoom, "krathongs")
      : collection(db, "krathongs");

    const q = query(colRef, orderBy("createdAt", "desc"), limit(60));

    unsubSnapshot = onSnapshot(
      q,
      (snapshot) => {
        if (!active) return;
        onModeChange?.("firebase");

        const remoteItems: KrathongItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data({ serverTimestamps: "estimate" });
          return {
            id: docSnap.id,
            name: String(data.name ?? "ผู้ไม่ประสงค์ออกนาม"),
            wish: String(data.wish ?? ""),
            base: (data.base ?? "banana-leaf") as KrathongBaseId,
            flower: (data.flower ?? "marigold") as KrathongFlowerId,
            candle: (data.candle ?? "gold-wealth") as KrathongCandleId,
            topping: (data.topping ?? "none") as KrathongToppingId,
            likes: typeof data.likes === "number" ? data.likes : 0,
            lane: typeof data.lane === "number" ? Math.min(3, Math.max(0, data.lane)) : 1,
            createdAt: toEpochMs(data.createdAt),
            isSimulated: false,
          };
        });

        // Only fill simulated community krathongs on the public main river (never inside private rooms)
        if (!activeRoom && remoteItems.length < 5) {
          const simLikes = getSimLikesMap();
          const needed = 5 - remoteItems.length;
          const sims = INITIAL_COMMUNITY_KRATHONGS.slice(0, needed).map((k) => ({
            ...k,
            likes: k.likes + (simLikes[k.id] ?? 0),
          }));
          onUpdate([...remoteItems, ...sims]);
        } else {
          onUpdate(remoteItems);
        }
      },
      (err) => {
        if (!active) return;
        onModeChange?.("local", err.message);
        onUpdate(getLocalKrathongs(activeRoom));
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firebase connection error";
    onModeChange?.("local", message);
    onUpdate(getLocalKrathongs(activeRoom));
  }

  return () => {
    active = false;
    unsubSnapshot?.();
  };
}

export async function createKrathong(
  input: CreateKrathongInput,
  roomCode?: string | null
): Promise<KrathongItem> {
  const activeRoom = normalizeRoomCode(roomCode);
  const cleanName = input.name.trim().slice(0, 50) || "ผู้ไม่ประสงค์ออกนาม";
  const cleanWish = input.wish.trim().slice(0, 300);
  const lane =
    typeof input.lane === "number"
      ? Math.min(3, Math.max(0, Math.round(input.lane)))
      : Math.floor(Math.random() * 4);

  const db = getFirestoreClient();
  if (db) {
    try {
      const colRef = activeRoom
        ? collection(db, "rooms", activeRoom, "krathongs")
        : collection(db, "krathongs");
      // Payload keys strictly match firestore.rules `hasOnly` schema
      const payload = {
        name: cleanName,
        wish: cleanWish,
        base: input.base,
        flower: input.flower,
        candle: input.candle,
        topping: input.topping,
        likes: 0,
        lane,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(colRef, payload);
      addMyKrathongId(ref.id);
      return {
        id: ref.id,
        name: cleanName,
        wish: cleanWish,
        base: input.base,
        flower: input.flower,
        candle: input.candle,
        topping: input.topping,
        likes: 0,
        lane,
        createdAt: Date.now(),
        isSimulated: false,
      };
    } catch {
      // Fallback to local if Firestore write fails
    }
  }

  const localItem: KrathongItem = {
    id: `local-k-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    wish: cleanWish,
    base: input.base,
    flower: input.flower,
    candle: input.candle,
    topping: input.topping,
    likes: 0,
    lane,
    createdAt: Date.now(),
    isSimulated: false,
  };

  const storageKey = activeRoom ? getRoomKrathongsKey(activeRoom) : LOCAL_KRATHONGS_KEY;
  const existing = readJsonStorage<KrathongItem[]>(storageKey, []);
  writeJsonStorage(storageKey, [localItem, ...existing].slice(0, 50));
  addMyKrathongId(localItem.id);
  broadcastLocalUpdate();
  return localItem;
}

export async function likeKrathong(
  id: string,
  roomCode?: string | null
): Promise<void> {
  const activeRoom = normalizeRoomCode(roomCode);
  markKrathongLiked(id);

  if (id.startsWith("sim-") && !activeRoom) {
    const simLikes = getSimLikesMap();
    simLikes[id] = (simLikes[id] ?? 0) + 1;
    writeJsonStorage(LOCAL_SIM_LIKES_KEY, simLikes);
    broadcastLocalUpdate();
    return;
  }

  const db = getFirestoreClient();
  if (db && !id.startsWith("local-")) {
    try {
      const targetDoc = activeRoom
        ? doc(db, "rooms", activeRoom, "krathongs", id)
        : doc(db, "krathongs", id);
      await updateDoc(targetDoc, {
        likes: increment(1),
      });
      return;
    } catch {
      // Fallback below
    }
  }

  const storageKey = activeRoom ? getRoomKrathongsKey(activeRoom) : LOCAL_KRATHONGS_KEY;
  const existing = readJsonStorage<KrathongItem[]>(storageKey, []);
  const updated = existing.map((item) =>
    item.id === id ? { ...item, likes: item.likes + 1 } : item
  );
  writeJsonStorage(storageKey, updated);
  broadcastLocalUpdate();
}

export function subscribeLanterns(
  onUpdate: (items: SkyLanternItem[]) => void,
  roomCode?: string | null
): () => void {
  const activeRoom = normalizeRoomCode(roomCode);
  const db = getFirestoreClient();

  if (!db) {
    onUpdate(getLocalLanterns(activeRoom));

    const targetKey = activeRoom ? getRoomLanternsKey(activeRoom) : LOCAL_LANTERNS_KEY;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === targetKey) {
        onUpdate(getLocalLanterns(activeRoom));
      }
    };

    const handleLocalSync = () => onUpdate(getLocalLanterns(activeRoom));

    let channel: BroadcastChannel | null = null;
    if (isBrowser() && typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = () => onUpdate(getLocalLanterns(activeRoom));
    }

    if (isBrowser()) {
      window.addEventListener("storage", handleStorage);
      window.addEventListener(LOCAL_SYNC_EVENT, handleLocalSync);
    }

    return () => {
      if (isBrowser()) {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(LOCAL_SYNC_EVENT, handleLocalSync);
      }
      channel?.close();
    };
  }

  let unsubSnapshot: Unsubscribe | null = null;
  let active = true;

  try {
    const colRef = activeRoom
      ? collection(db, "rooms", activeRoom, "lanterns")
      : collection(db, "lanterns");
    const q = query(colRef, orderBy("createdAt", "desc"), limit(25));

    unsubSnapshot = onSnapshot(
      q,
      (snapshot) => {
        if (!active) return;
        const remoteItems: SkyLanternItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data({ serverTimestamps: "estimate" });
          return {
            id: docSnap.id,
            name: String(data.name ?? "ผู้ส่งคำอธิษฐาน"),
            wish: String(data.wish ?? ""),
            color: (data.color ?? "gold") as LanternColorId,
            createdAt: toEpochMs(data.createdAt),
            isSimulated: false,
          };
        });

        // Only fill simulated lanterns on public river (private rooms show only room members' lanterns)
        if (!activeRoom && remoteItems.length < 4) {
          const needed = 4 - remoteItems.length;
          onUpdate([...remoteItems, ...INITIAL_COMMUNITY_LANTERNS.slice(0, needed)]);
        } else {
          onUpdate(remoteItems);
        }
      },
      () => {
        if (!active) return;
        onUpdate(getLocalLanterns(activeRoom));
      }
    );
  } catch {
    onUpdate(getLocalLanterns(activeRoom));
  }

  return () => {
    active = false;
    unsubSnapshot?.();
  };
}

export async function createLantern(
  input: CreateLanternInput,
  roomCode?: string | null
): Promise<SkyLanternItem> {
  const activeRoom = normalizeRoomCode(roomCode);
  const cleanName = input.name.trim().slice(0, 50) || "ผู้ส่งคำอธิษฐาน";
  const cleanWish = input.wish.trim().slice(0, 160);

  const db = getFirestoreClient();
  if (db) {
    try {
      const colRef = activeRoom
        ? collection(db, "rooms", activeRoom, "lanterns")
        : collection(db, "lanterns");
      const payload = {
        name: cleanName,
        wish: cleanWish,
        color: input.color,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(colRef, payload);
      return {
        id: ref.id,
        name: cleanName,
        wish: cleanWish,
        color: input.color,
        createdAt: Date.now(),
        isSimulated: false,
      };
    } catch {
      // Fallback to local
    }
  }

  const localItem: SkyLanternItem = {
    id: `local-l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    wish: cleanWish,
    color: input.color,
    createdAt: Date.now(),
    isSimulated: false,
  };

  const storageKey = activeRoom ? getRoomLanternsKey(activeRoom) : LOCAL_LANTERNS_KEY;
  const existing = readJsonStorage<SkyLanternItem[]>(storageKey, []);
  writeJsonStorage(storageKey, [localItem, ...existing].slice(0, 30));
  broadcastLocalUpdate();
  return localItem;
}
