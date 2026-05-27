"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { deleteInventoryStockAction } from "@/app/inventory/actions";
import type { SupportedLocale } from "@/i18n/catalog";
import { ArrowDownUp, Trash2, TriangleAlert, X } from "lucide-react";

export type InventoryStockTableLabels = {
  empty: string;
  noResults: string;
  low: string;
  negative: string;
  normal: string;
  product: string;
  category: string;
  viscosity: string;
  quantity: string;
  purchase: string;
  sale: string;
  service: string;
  status: string;
  action: string;
  filterProduct: string;
  filterCategory: string;
  filterViscosity: string;
  filterQuantity: string;
  allCategories: string;
  deleteConfirmLabel: string;
  deleteHint: string;
  deleteOpen: string;
  deleteCancel: string;
  deleteSelected: string;
};

export type InventoryStockTableItem = {
  id: string;
  productName: string;
  productBrand?: string | null;
  productViscosity?: string | null;
  categoryLabel: string;
  quantityLabel: string;
  purchasePriceLabel: string;
  salePriceLabel: string;
  servicePriceLabel: string;
  isLow: boolean;
  isNegative: boolean;
};

type InventoryStockTableProps = {
  action: typeof deleteInventoryStockAction;
  deleteError?: string;
  deleteErrorMessage?: string;
  items: InventoryStockTableItem[];
  labels: InventoryStockTableLabels;
  locale: SupportedLocale;
  shopId: string;
};

type Filters = {
  product: string;
  category: string;
  viscosity: string;
  quantity: string;
};

type SortKey = "product" | "category" | "viscosity" | "quantity" | "purchase" | "sale" | "service" | "status";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

const emptyFilters: Filters = {
  product: "",
  category: "",
  viscosity: "",
  quantity: "",
};

export function InventoryStockTable({
  action,
  deleteError,
  deleteErrorMessage,
  items,
  labels,
  locale,
  shopId,
}: InventoryStockTableProps) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: "product", direction: "asc" });
  const categoryOptions = useMemo(
    () => [...new Set(items.map((item) => item.categoryLabel))].sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const filteredItems = useMemo(() => {
    const visibleItems = items.filter(
        (item) =>
          fieldMatches(`${item.productName} ${item.productBrand ?? ""}`, filters.product) &&
          (!filters.category || item.categoryLabel === filters.category) &&
          fieldMatches(item.productViscosity ?? "", filters.viscosity) &&
          fieldMatches(item.quantityLabel, filters.quantity),
      );

    return [...visibleItems].sort((a, b) => compareItems(a, b, sort));
  }, [items, filters, sort]);
  const allVisibleSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));
  const selectedCount = selectedIds.size;
  const shouldShowDeleteConfirm = deleteConfirmOpen && selectedCount > 0;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDeleteConfirmOpen(false);
        setSelectedIds(new Set());
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="shopId" value={shopId} />

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
          label={labels.quantity}
          placeholder={labels.filterQuantity}
          value={filters.quantity}
          onChange={(value) => setFilters((current) => ({ ...current, quantity: value }))}
        />
      </div>

      <div className="flex h-10 items-center justify-between gap-3 rounded-2xl border border-border bg-bg px-3">
        <p className="text-sm font-bold text-muted">{labels.deleteHint}</p>
        {selectedCount > 0 ? (
          <button
            type="button"
            title={labels.deleteOpen}
            onClick={() => setDeleteConfirmOpen(true)}
            className="grid h-8 w-8 place-items-center rounded-full border border-danger/30 text-danger transition hover:bg-danger hover:text-white"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{labels.deleteOpen}</span>
          </button>
        ) : null}
      </div>

      {shouldShowDeleteConfirm ? (
        <div className="grid gap-3 rounded-3xl border border-danger/20 bg-danger/5 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-danger">
              {labels.deleteConfirmLabel}
            </span>
            <input
              name="confirmation"
              placeholder="DELETE"
              autoComplete="off"
              className="h-10 rounded-2xl border border-danger/30 bg-surface px-3 text-sm font-semibold text-text outline-none transition placeholder:text-muted/70 focus:border-danger"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-danger px-4 text-sm font-bold text-white transition hover:opacity-90"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {labels.deleteSelected}
          </button>
          <button
            type="button"
            title={labels.deleteCancel}
            onClick={() => {
              setDeleteConfirmOpen(false);
              setSelectedIds(new Set());
            }}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition hover:border-text hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{labels.deleteCancel}</span>
          </button>
        </div>
      ) : null}

      {deleteError && deleteErrorMessage ? (
        <p className="rounded-3xl border border-danger/20 bg-danger/5 p-4 text-sm font-bold text-danger">
          {deleteErrorMessage}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-bg p-8 text-center text-sm font-bold text-muted">
          {labels.empty}
        </p>
      ) : filteredItems.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-bg p-8 text-center text-sm font-bold text-muted">
          {labels.noResults}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-bg">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-surface text-xs font-bold uppercase tracking-[0.12em] text-muted">
              <tr>
                <TableHead>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(event) => toggleVisible(filteredItems, event.target.checked, setSelectedIds)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                </TableHead>
                <SortableTableHead label={labels.product} sortKey="product" sort={sort} setSort={setSort} />
                <SortableTableHead label={labels.category} sortKey="category" sort={sort} setSort={setSort} />
                <SortableTableHead label={labels.viscosity} sortKey="viscosity" sort={sort} setSort={setSort} />
                <SortableTableHead label={labels.quantity} sortKey="quantity" sort={sort} setSort={setSort} />
                <SortableTableHead label={labels.purchase} sortKey="purchase" sort={sort} setSort={setSort} />
                <SortableTableHead label={labels.sale} sortKey="sale" sort={sort} setSort={setSort} />
                <SortableTableHead label={labels.service} sortKey="service" sort={sort} setSort={setSort} />
                <SortableTableHead label={labels.status} sortKey="status" sort={sort} setSort={setSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((item) => (
                <tr key={item.id} className="align-middle transition hover:bg-surface/70">
                  <TableCell>
                    <input
                      type="checkbox"
                      name="stockId"
                      value={item.id}
                      checked={selectedIds.has(item.id)}
                      onChange={(event) => toggleOne(item.id, event.target.checked, setSelectedIds)}
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    />
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-text">{item.productName}</p>
                    {item.productBrand ? <p className="mt-1 text-xs font-semibold text-muted">{item.productBrand}</p> : null}
                  </TableCell>
                  <TableCell>{item.categoryLabel}</TableCell>
                  <TableCell>{item.productViscosity || "-"}</TableCell>
                  <TableCell>{item.quantityLabel}</TableCell>
                  <TableCell>{item.purchasePriceLabel}</TableCell>
                  <TableCell>{item.salePriceLabel}</TableCell>
                  <TableCell>{item.servicePriceLabel}</TableCell>
                  <TableCell>
                    {item.isNegative ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-danger/10 px-3 py-1 text-xs font-bold text-danger">
                        <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                        {labels.negative}
                      </span>
                    ) : item.isLow ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1 text-xs font-bold text-warning">
                        <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                        {labels.low}
                      </span>
                    ) : (
                      <span className="text-muted">{labels.normal}</span>
                    )}
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

type CellProps = {
  children: ReactNode;
};

function TableHead({ children }: CellProps) {
  return <th className="px-4 py-3">{children}</th>;
}

type SortableTableHeadProps = {
  label: string;
  setSort: Dispatch<SetStateAction<SortState>>;
  sort: SortState;
  sortKey: SortKey;
};

function SortableTableHead({ label, setSort, sort, sortKey }: SortableTableHeadProps) {
  const active = sort.key === sortKey;

  return (
    <TableHead>
      <button
        type="button"
        onClick={() =>
          setSort((current) =>
            current.key === sortKey
              ? { key: sortKey, direction: current.direction === "asc" ? "desc" : "asc" }
              : { key: sortKey, direction: "asc" },
          )
        }
        className="inline-flex items-center gap-2 transition hover:text-text"
      >
        {label}
        <ArrowDownUp className={`h-3.5 w-3.5 ${active ? "text-accent" : "text-muted"}`} aria-hidden="true" />
      </button>
    </TableHead>
  );
}

function TableCell({ children }: CellProps) {
  return <td className="px-4 py-3 font-semibold text-text">{children}</td>;
}

function fieldMatches(value: string, filter: string): boolean {
  return normalizeSearch(value).includes(normalizeSearch(filter));
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function compareItems(a: InventoryStockTableItem, b: InventoryStockTableItem, sort: SortState): number {
  const direction = sort.direction === "asc" ? 1 : -1;
  const result =
    sort.key === "quantity"
      ? numericPrefix(a.quantityLabel) - numericPrefix(b.quantityLabel)
      : sort.key === "purchase"
        ? numericMoney(a.purchasePriceLabel) - numericMoney(b.purchasePriceLabel)
        : sort.key === "sale"
          ? numericMoney(a.salePriceLabel) - numericMoney(b.salePriceLabel)
          : sort.key === "service"
            ? numericMoney(a.servicePriceLabel) - numericMoney(b.servicePriceLabel)
            : sort.key === "status"
              ? stockStatusRank(a) - stockStatusRank(b)
              : textSortValue(a, sort.key).localeCompare(textSortValue(b, sort.key));

  return result * direction;
}

function textSortValue(item: InventoryStockTableItem, key: Exclude<SortKey, "quantity" | "purchase" | "sale" | "service" | "status">): string {
  if (key === "product") {
    return `${item.productName} ${item.productBrand ?? ""}`;
  }

  if (key === "category") {
    return item.categoryLabel;
  }

  return item.productViscosity ?? "";
}

function numericPrefix(value: string): number {
  const match = value.replace(",", ".").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function numericMoney(value: string): number {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const match = normalized.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function stockStatusRank(item: InventoryStockTableItem): number {
  if (item.isNegative) {
    return 2;
  }

  if (item.isLow) {
    return 1;
  }

  return 0;
}

function toggleOne(
  id: string,
  checked: boolean,
  setSelectedIds: Dispatch<SetStateAction<ReadonlySet<string>>>,
) {
  setSelectedIds((current) => {
    const next = new Set(current);

    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }

    return next;
  });
}

function toggleVisible(
  items: readonly InventoryStockTableItem[],
  checked: boolean,
  setSelectedIds: Dispatch<SetStateAction<ReadonlySet<string>>>,
) {
  setSelectedIds((current) => {
    const next = new Set(current);

    for (const item of items) {
      if (checked) {
        next.add(item.id);
      } else {
        next.delete(item.id);
      }
    }

    return next;
  });
}
