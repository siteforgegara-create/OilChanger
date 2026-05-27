import { addMinorUnits } from "@/lib/money";

export const serviceItems = [
  { key: "engineOilChange", label: "Engine oil change labor", priceMinor: 1500 },
  { key: "oilFilterChange", label: "Oil filter change labor", priceMinor: 500 },
  { key: "airFilterChange", label: "Air filter change labor", priceMinor: 700 },
  { key: "cabinFilterChange", label: "Cabin filter change labor", priceMinor: 800 },
  { key: "engineBayWash", label: "Engine bay wash", priceMinor: 1000 },
] as const;

export type ServiceItemKey = (typeof serviceItems)[number]["key"];

const serviceItemKeys = new Set(serviceItems.map((item) => item.key));
const serviceItemLabels = Object.fromEntries(serviceItems.map((item) => [item.key, item.label]));
const translationKeysByLabel = Object.fromEntries(
  serviceItems.map((item) => [item.label, `order.services.${item.key}`]),
);

export function isServiceItemKey(value: FormDataEntryValue): value is ServiceItemKey {
  return typeof value === "string" && serviceItemKeys.has(value as ServiceItemKey);
}

export function serviceLabel(key: string): string {
  return serviceItemLabels[key] ?? key;
}

export function serviceTranslationKey(description: string): string {
  return translationKeysByLabel[description] ?? description;
}

export function selectedServiceItems(keys: ReadonlySet<ServiceItemKey>) {
  return serviceItems.filter((item) => keys.has(item.key));
}

export function calculateServiceSubtotalMinor(keys: ReadonlySet<ServiceItemKey>): number {
  return addMinorUnits(selectedServiceItems(keys).map((item) => item.priceMinor));
}
