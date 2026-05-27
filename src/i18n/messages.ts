import { prisma } from "@/lib/prisma";
import { fallbackMessages, supportedLocales, type SupportedLocale } from "@/i18n/catalog";

export function toSupportedLocale(value: string | string[] | undefined): SupportedLocale {
  const candidate = Array.isArray(value) ? value[0] : value;
  const found = supportedLocales.find((locale) => locale === candidate);
  return found ?? "az";
}

export async function loadMessages(locale: SupportedLocale): Promise<Record<string, string>> {
  const fallback = fallbackMessages(locale);

  try {
    const translations = await prisma.translation.findMany({
      where: {
        languageCode: locale,
      },
      select: {
        value: true,
        translationKey: {
          select: {
            namespace: true,
            key: true,
          },
        },
      },
    });

    if (translations.length === 0) {
      return fallback;
    }

    const databaseMessages = Object.fromEntries(
      translations.map((translation) => [`${translation.translationKey.namespace}.${translation.translationKey.key}`, translation.value]),
    );

    return { ...fallback, ...databaseMessages };
  } catch {
    return fallback;
  }
}

export function createTranslator(messages: Record<string, string>) {
  return (key: string) => messages[key] ?? key;
}
