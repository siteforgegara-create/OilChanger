import { LandingPage } from "@/components/landing/landing-page";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{
    locale?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);

  return <LandingPage locale={locale} t={t} />;
}
