import { RegisterPage } from "@/components/auth/register-page";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";

export const dynamic = "force-dynamic";

type RegisterRouteProps = {
  searchParams: Promise<{
    locale?: string;
  }>;
};

export default async function RegisterRoute({ searchParams }: RegisterRouteProps) {
  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);

  return <RegisterPage locale={locale} t={t} />;
}
