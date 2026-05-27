"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { updateOrderProductsAction } from "@/app/dashboard/actions";
import type { SupportedLocale } from "@/i18n/catalog";
import { Check, TriangleAlert } from "lucide-react";
import { calculateQuantityLineTotalMinor, parseQuantityToThousandths } from "@/lib/stock-quantity";

export type OrderProductsTableLabels = {
  allCategories: string;
  category: string;
  empty: string;
  filterProduct: string;
  filterQuantity: string;
  filterViscosity: string;
  hint: string;
  low: string;
  negative: string;
  noResults: string;
  previewTotal: string;
  product: string;
  quantity: string;
  save: string;
  servicePrice: string;
  stock: string;
  viscosity: string;
};

export type OrderProductsTableItem = {
  categoryLabel: string;
  isLow: boolean;
  productBrand?: string | null;
  productId: string;
  productName: string;
  productViscosity?: string | null;
  quantityDefault: string;
  servicePriceLabel: string;
  servicePriceMinor: number;
  stockLabel: string;
  isNegative: boolean;
};

type OrderProductsTableProps = {
  action: typeof updateOrderProductsAction;
  currency: string;
  items: OrderProductsTableItem[];
  labels: OrderProductsTableLabels;
  locale: SupportedLocale;
  orderId: string;
};

type Filters = {
  product: string;
  category: string;
  viscosity: string;
  quantity: string;
};

const emptyFilters: Filters = {
  product: "",
  category: "",
  viscosity: "",
  quantity: "",
};

export function OrderProductsTable({ action, currency, items, labels, locale, orderId }: OrderProductsTableProps) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    new Set(items.filter((item) => item.quantityDefault).map((item) => item.productId)),
  );
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(items.map((item) => [item.productId, item.quantityDefault])),
  );
  const categoryOptions = useMemo(
    () => [...new Set(items.map((item) => item.categoryLabel))].sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          fieldMatches(`${item.productName} ${item.productBrand ?? ""}`, filters.product) &&
          (!filters.category || item.categoryLabel === filters.category) &&
          fieldMatches(item.productViscosity ?? "", filters.viscosity) &&
          fieldMatches(item.stockLabel, filters.quantity),
      ),
    [filters, items],
  );
  const previewTotalMinor = items.reduce((sum, item) => {
    if (!selectedIds.has(item.productId)) {
      return sum;
    }

    const quantity = quantities[item.productId] ?? "";
    const quantityThousandths = safeQuantityThousandths(quantity);

    if (quantityThousandths === null || quantityThousandths <= 0) {
      return sum;
    }

    return sum + calculateQuantityLineTotalMinor(item.servicePriceMinor, quantityThousandths);
  }, 0);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-3 md:grid-cols-2">
        <FilterInput
          label={labels.product}
          placeholder={labels.filterProduct}
          value={filters.product}
          onChange={(value) => setFilters((current) => ({ ...current, product: value }))}
        />
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{labels.category}</span>
          <select
            value={filters.category}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            className="h-10 rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-accent"
          >
            <option value="">{labels.allCategories}</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <FilterInput
          label={labels.viscosity}
          placeholder={labels.filterViscosity}
          value={filters.viscosity}
          onChange={(value) => setFilters((current) => ({ ...current, viscosity: value }))}
        />
        <FilterInput
          label={labels.stock}
          placeholder={labels.filterQuantity}
          value={filters.quantity}
          onChange={(value) => setFilters((current) => ({ ...current, quantity: value }))}
        />
      </div>

      {items.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-bg p-5 text-sm font-semibold text-muted">
          {labels.empty}
        </p>
      ) : filteredItems.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-bg p-5 text-sm font-semibold text-muted">
          {labels.noResults}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-bg">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-surface text-xs font-bold uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3" />
                <th className="px-4 py-3">{labels.product}</th>
                <th className="px-4 py-3">{labels.category}</th>
                <th className="px-4 py-3">{labels.viscosity}</th>
                <th className="px-4 py-3">{labels.stock}</th>
                <th className="px-4 py-3">{labels.servicePrice}</th>
                <th className="px-4 py-3">{labels.quantity}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((item) => (
                <tr key={item.productId} className="align-middle transition hover:bg-surface/70">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      name="productId"
                      value={item.productId}
                      checked={selectedIds.has(item.productId)}
                      onChange={(event) => toggleSelected(item.productId, event.target.checked, setSelectedIds)}
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-text">
                    <p className="font-bold">{item.productName}</p>
                    {item.productBrand ? <p className="mt-1 text-xs text-muted">{item.productBrand}</p> : null}
                  </td>
                  <td className="px-4 py-3 font-semibold text-text">{item.categoryLabel}</td>
                  <td className="px-4 py-3 font-semibold text-text">{item.productViscosity || "-"}</td>
                  <td className="px-4 py-3 font-semibold text-text">
                    <span className="inline-flex items-center gap-2">
                      {item.stockLabel}
                      {item.isNegative ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-1 text-xs font-bold text-danger">
                          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                          {labels.negative}
                        </span>
                      ) : item.isLow ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-xs font-bold text-warning">
                          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                          {labels.low}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-text">{item.servicePriceLabel}</td>
                  <td className="px-4 py-3">
                    <input
                      name={`quantity_${item.productId}`}
                      inputMode="decimal"
                      value={quantities[item.productId] ?? ""}
                      onChange={(event) =>
                        setQuantities((current) => ({ ...current, [item.productId]: event.target.value }))
                      }
                      placeholder="0"
                      className="h-10 w-24 rounded-2xl border border-border bg-surface px-3 text-sm font-semibold text-text outline-none transition focus:border-accent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-bg p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{labels.previewTotal}</p>
          <p className="mt-1 text-2xl font-semibold">{formatMoneyMinor(previewTotalMinor, currency, locale)}</p>
        </div>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:opacity-90"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {labels.save}
        </button>
      </div>

      <p className="text-sm font-semibold leading-6 text-muted">{labels.hint}</p>
    </form>
  );
}

type FilterInputProps = {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

function FilterInput({ label, onChange, placeholder, value }: FilterInputProps) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition placeholder:text-muted/70 focus:border-accent"
      />
    </label>
  );
}

function fieldMatches(value: string, filter: string): boolean {
  return value.trim().toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase());
}

function safeQuantityThousandths(value: string): number | null {
  try {
    return parseQuantityToThousandths(value);
  } catch {
    return null;
  }
}

function toggleSelected(
  productId: string,
  checked: boolean,
  setSelectedIds: Dispatch<SetStateAction<ReadonlySet<string>>>,
) {
  setSelectedIds((current) => {
    const next = new Set(current);

    if (checked) {
      next.add(productId);
    } else {
      next.delete(productId);
    }

    return next;
  });
}

function formatMoneyMinor(valueMinor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(valueMinor / 100);
}
