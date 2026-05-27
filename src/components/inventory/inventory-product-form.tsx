"use client";

import { useActionState } from "react";
import type { addInventoryProductAction, InventoryActionState } from "@/app/inventory/actions";
import type { SupportedLocale } from "@/i18n/catalog";

export type InventoryProductFormLabels = {
  title: string;
  subtitle: string;
  category: string;
  name: string;
  namePlaceholder: string;
  brand: string;
  viscosity: string;
  specification: string;
  unit: string;
  quantity: string;
  minQuantity: string;
  purchasePrice: string;
  salePrice: string;
  servicePrice: string;
  suggestedDiscount: string;
  submit: string;
  categories: Record<string, string>;
  units: Record<string, string>;
  errorMessages: Record<string, string>;
};

type InventoryProductFormProps = {
  labels: InventoryProductFormLabels;
  locale: SupportedLocale;
  shopId: string;
  action: typeof addInventoryProductAction;
};

const initialState: InventoryActionState = {};
const categories = [
  "ENGINE_OIL",
  "TRANSMISSION_OIL",
  "POWER_STEERING_FLUID",
  "OIL_FILTER",
  "AIR_FILTER",
  "CABIN_FILTER",
  "FUEL_FILTER",
  "OTHER",
] as const;
const units = ["LITER", "PIECE", "PACKAGE"] as const;

export function InventoryProductForm({ labels, locale, shopId, action }: InventoryProductFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="shopId" value={shopId} />
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{labels.title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-muted">{labels.subtitle}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold">{labels.category}</span>
          <select name="category" className="h-10 rounded-2xl border border-border bg-bg px-3 text-sm font-semibold">
            {categories.map((category) => (
              <option key={category} value={category}>
                {labels.categories[category]}
              </option>
            ))}
          </select>
        </label>
        <Field label={labels.name} name="name" placeholder={labels.namePlaceholder} required />
        <Field label={labels.brand} name="brand" />
        <Field label={labels.viscosity} name="viscosity" />
        <Field label={labels.specification} name="specification" />
        <label className="grid gap-2">
          <span className="text-sm font-bold">{labels.unit}</span>
          <select name="baseUnit" className="h-12 rounded-2xl border border-border bg-bg px-4 text-sm font-semibold">
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {labels.units[unit]}
              </option>
            ))}
          </select>
        </label>
        <Field label={labels.quantity} name="quantity" required />
        <Field label={labels.minQuantity} name="minQuantity" required />
        <Field label={labels.purchasePrice} name="purchasePrice" required />
        <Field label={labels.salePrice} name="salePrice" required />
        <Field label={labels.servicePrice} name="servicePrice" required />
        <Field label={labels.suggestedDiscount} name="suggestedDiscount" />
      </div>

      {state.errorKey ? (
        <p className="mt-5 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-bold text-danger">
          {labels.errorMessages[state.errorKey] ?? state.errorKey}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {labels.submit}
      </button>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
};

function Field({ label, name, placeholder, required = false }: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold">{label}</span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className="h-10 rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition placeholder:text-muted/70 focus:border-accent"
      />
    </label>
  );
}
