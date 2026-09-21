import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { ImpersonationBanner } from "@/components/operator/impersonation-banner";
import { getLocale, getMessages } from "@/lib/i18n";
import { TranslationsProvider } from "@/lib/i18n/provider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tezhr.uz"),
  applicationName: "TezHR",
  title: {
    default: "TezHR — AI-assisted ATS for Uzbekistan",
    template: "%s",
  },
  description:
    "Applicant tracking, multilingual CV screening, active sourcing, and interview workflows for teams hiring in Uzbekistan.",
  category: "business",
  openGraph: {
    siteName: "TezHR",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = getMessages(locale);

  return (
    <html
      lang={locale}
      className={`${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <TranslationsProvider locale={locale} messages={messages}>
          <ImpersonationBanner />
          {children}
        </TranslationsProvider>
      </body>
    </html>
  );
}
