import { getRequestConfig } from "next-intl/server";

export const locales = ["az", "ru", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "az";

function isLocale(value: string | undefined): value is Locale {
  return locales.some((locale) => locale === value);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: {},
  };
});
