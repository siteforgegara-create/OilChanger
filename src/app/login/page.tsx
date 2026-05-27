import { LoginPage } from "@/components/auth/login-page";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";

export const dynamic = "force-dynamic";

type LoginRouteProps = {
  searchParams: Promise<{
    locale?: string;
  }>;
};

export default async function LoginRoute({ searchParams }: LoginRouteProps) {
  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);

  return <LoginPage locale={locale} t={t} />;
}
