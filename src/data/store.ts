import { mockBrands } from "@/data/mock/brands";
import { mockMarkers } from "@/data/mock/markers";
import { mockPurchases } from "@/data/mock/purchases";
import { mockWishlist } from "@/data/mock/wishlist";
import { buildSeriesFromMarkers, mockSeries } from "@/data/mock/series";
import {
  defaultAppSettings,
  type AppSettings,
  type Brand,
  type Marker,
  type Purchase,
  type Series,
  type WishItem,
} from "@/types";

const STORAGE_KEY = "marker_inventory_store_v2";
const BACKUP_KEY = "marker_inventory_backup_v1";
const DATA_CHANGED_EVENT = "marker_inventory_data_changed";

const DEFAULT_MEMOS = [
  "• 计划入手 Copic 新色 E95、E97",
  "• 整理收纳盒，补充标签纸",
  "• 参加下周的画友交流会！",
];

export type MarkerStoreSnapshot = {
  markers: Marker[];
  brands: Brand[];
  series: Series[];
  purchases?: Purchase[];
  wishlist?: WishItem[];
  memos?: string[];
  settings?: AppSettings;
  lastBackupAt?: string;
};

function canUseStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function tryLoad(key: string): MarkerStoreSnapshot | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MarkerStoreSnapshot>;
    if (!Array.isArray(parsed.markers) || !Array.isArray(parsed.brands)) return null;
    const series = Array.isArray(parsed.series)
      ? parsed.series
      : buildSeriesFromMarkers(parsed.markers);
    return {
      markers: parsed.markers,
      brands: parsed.brands,
      series,
      purchases: parsed.purchases,
      wishlist: parsed.wishlist,
      memos: parsed.memos,
      settings: parsed.settings,
      lastBackupAt: parsed.lastBackupAt,
    };
  } catch {
    return null;
  }
}

function loadPersisted(): MarkerStoreSnapshot | null {
  return tryLoad(STORAGE_KEY) ?? tryLoad("marker_inventory_store_v1");
}

function getSnapshot(): MarkerStoreSnapshot {
  return {
    markers: markersStore,
    brands: brandsStore,
    series: seriesStore,
    purchases: purchasesStore,
    wishlist: wishlistStore,
    memos: memosStore,
    settings: settingsStore,
    lastBackupAt,
  };
}

function applySnapshot(data: MarkerStoreSnapshot) {
  markersStore = data.markers;
  brandsStore = data.brands;
  seriesStore = data.series;
  purchasesStore = data.purchases ?? [...mockPurchases];
  wishlistStore = data.wishlist ?? [...mockWishlist];
  memosStore = data.memos ?? [...DEFAULT_MEMOS];
  settingsStore = data.settings ?? { ...defaultAppSettings };
  lastBackupAt = data.lastBackupAt ?? "";
}

function persist() {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getSnapshot()));
}

function notifyDataChanged() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
}

const persisted = loadPersisted();

export let markersStore: Marker[] = persisted?.markers?.length ? persisted.markers : [...mockMarkers];
export let brandsStore: Brand[] = persisted?.brands?.length ? persisted.brands : [...mockBrands];
export let seriesStore: Series[] = persisted?.series?.length ? persisted.series : [...mockSeries];
export let purchasesStore: Purchase[] = persisted?.purchases?.length
  ? persisted.purchases
  : [...mockPurchases];
export let wishlistStore: WishItem[] = persisted?.wishlist?.length
  ? persisted.wishlist
  : [...mockWishlist];
export let memosStore: string[] = persisted?.memos?.length ? persisted.memos : [...DEFAULT_MEMOS];
export let settingsStore: AppSettings = persisted?.settings ?? { ...defaultAppSettings };
export let lastBackupAt: string = persisted?.lastBackupAt ?? "";

export function addMarker(marker: Marker) {
  markersStore = [...markersStore, marker];
  persist();
  notifyDataChanged();
}

export function updateMarkerInStore(id: number, data: Partial<Marker>) {
  markersStore = markersStore.map((m) => (m.id === id ? { ...m, ...data } : m));
  persist();
  notifyDataChanged();
}

export function removeMarkerFromStore(id: number) {
  markersStore = markersStore.filter((m) => m.id !== id);
  persist();
  notifyDataChanged();
}

export function addBrand(brand: Brand) {
  brandsStore = [...brandsStore, brand];
  persist();
  notifyDataChanged();
}

export function addSeriesToStore(series: Series) {
  seriesStore = [...seriesStore, series];
  persist();
  notifyDataChanged();
}

export function addPurchaseToStore(purchase: Purchase) {
  purchasesStore = [...purchasesStore, purchase];
  persist();
  notifyDataChanged();
}

export function addWishToStore(item: WishItem) {
  wishlistStore = [...wishlistStore, item];
  persist();
  notifyDataChanged();
}

export function removeWishFromStore(id: number) {
  wishlistStore = wishlistStore.filter((w) => w.id !== id);
  persist();
  notifyDataChanged();
}

export function addMemo(text: string) {
  const line = text.startsWith("•") ? text : `• ${text}`;
  memosStore = [...memosStore, line];
  persist();
  notifyDataChanged();
}

export function updateSettingsStore(patch: Partial<AppSettings>) {
  settingsStore = { ...settingsStore, ...patch };
  persist();
  notifyDataChanged();
}

export function saveBackupSnapshot() {
  if (!canUseStorage()) return;
  lastBackupAt = new Date().toLocaleString("zh-CN", { hour12: false });
  window.localStorage.setItem(BACKUP_KEY, JSON.stringify(getSnapshot()));
  persist();
  notifyDataChanged();
}

export function restoreBackupSnapshot() {
  if (!canUseStorage()) return false;
  const raw = window.localStorage.getItem(BACKUP_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw) as MarkerStoreSnapshot;
    if (!Array.isArray(data.markers) || !Array.isArray(data.brands)) return false;
    applySnapshot(data);
    persist();
    notifyDataChanged();
    return true;
  } catch {
    return false;
  }
}

export function importStoreData(data: Partial<MarkerStoreSnapshot>) {
  if (Array.isArray(data.markers)) markersStore = data.markers;
  if (Array.isArray(data.brands)) brandsStore = data.brands;
  if (Array.isArray(data.series)) seriesStore = data.series;
  else if (Array.isArray(data.markers)) seriesStore = buildSeriesFromMarkers(data.markers);
  if (Array.isArray(data.purchases)) purchasesStore = data.purchases;
  if (Array.isArray(data.wishlist)) wishlistStore = data.wishlist;
  persist();
  notifyDataChanged();
}

export function resetStores() {
  markersStore = [...mockMarkers];
  brandsStore = [...mockBrands];
  seriesStore = [...mockSeries];
  purchasesStore = [...mockPurchases];
  wishlistStore = [...mockWishlist];
  memosStore = [...DEFAULT_MEMOS];
  settingsStore = { ...defaultAppSettings };
  lastBackupAt = "";
  if (canUseStorage()) {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("marker_inventory_store_v1");
    window.localStorage.removeItem(BACKUP_KEY);
  }
  notifyDataChanged();
}

export function subscribeDataChanges(callback: () => void) {
  if (!canUseStorage()) return () => {};
  const handler = () => callback();
  window.addEventListener(DATA_CHANGED_EVENT, handler);
  return () => window.removeEventListener(DATA_CHANGED_EVENT, handler);
}

export function getStoreSnapshot() {
  return getSnapshot();
}

export function replaceStoreSnapshot(data: MarkerStoreSnapshot) {
  applySnapshot(data);
  persist();
  notifyDataChanged();
}
