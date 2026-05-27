"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import type { addQueueEntryAction, QueueActionState } from "@/app/dashboard/actions";
import type { SupportedLocale } from "@/i18n/catalog";

export type AddQueueFormLabels = {
  title: string;
  subtitle: string;
  plate: string;
  platePlaceholder: string;
  vin: string;
  vinPlaceholder: string;
  make: string;
  makePlaceholder: string;
  model: string;
  modelPlaceholder: string;
  year: string;
  mileage: string;
  customerName: string;
  customerNamePlaceholder: string;
  customerPhone: string;
  customerPhonePlaceholder: string;
  submit: string;
  errorMessages: Record<string, string>;
};

type AddQueueFormProps = {
  labels: AddQueueFormLabels;
  locale: SupportedLocale;
  shopId: string;
  action: typeof addQueueEntryAction;
};

const initialActionState: QueueActionState = {};

export function AddQueueForm({ labels, locale, shopId, action }: AddQueueFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="shopId" value={shopId} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{labels.title}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{labels.subtitle}</p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
          <Plus className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label={labels.plate} name="plateNumber" placeholder={labels.platePlaceholder} />
        <Field label={labels.vin} name="vin" placeholder={labels.vinPlaceholder} />
        <Field label={labels.make} name="make" placeholder={labels.makePlaceholder} required />
        <Field label={labels.model} name="model" placeholder={labels.modelPlaceholder} required />
        <Field label={labels.year} name="year" type="number" />
        <Field label={labels.mileage} name="mileage" type="number" />
        <Field label={labels.customerName} name="customerName" placeholder={labels.customerNamePlaceholder} />
        <Field label={labels.customerPhone} name="customerPhone" placeholder={labels.customerPhonePlaceholder} />
      </div>

      {state.errorKey ? (
        <p className="mt-5 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-bold text-danger">
          {labels.errorMessages[state.errorKey] ?? state.errorKey}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
  type?: string;
  required?: boolean;
};

function Field({ label, name, placeholder, type = "text", required = false }: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="h-12 rounded-2xl border border-border bg-bg px-4 text-sm font-semibold text-text outline-none transition placeholder:text-muted/70 focus:border-accent"
      />
    </label>
  );
}
