import Link from "next/link";
import { supportedLocales, type SupportedLocale } from "@/i18n/catalog";

type LanguageSwitcherProps = {
  locale: SupportedLocale;
  labels: Record<SupportedLocale, string>;
  basePath?: string;
};

export function LanguageSwitcher({ locale, labels, basePath = "/" }: LanguageSwitcherProps) {
  return (
    <nav className="flex items-center rounded-full border border-border bg-surface p-1" aria-label="Language">
      {supportedLocales.map((item) => (
        <Link
          key={item}
          href={`${basePath}?locale=${item}`}
          className={[
            "rounded-full px-2.5 py-1.5 text-xs font-semibold uppercase leading-none transition sm:px-3",
            item === locale ? "bg-text text-surface" : "text-muted hover:text-text",
          ].join(" ")}
          aria-label={labels[item]}
        >
          {item}
        </Link>
      ))}
    </nav>
  );
}
