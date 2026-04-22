import type { Metadata } from "next";
import { Roboto_Flex, Roboto_Mono, Manrope, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ImpersonationBanner } from "@/components/operator/impersonation-banner";
import { getLocale, getMessages } from "@/lib/i18n";
import { TranslationsProvider } from "@/lib/i18n/provider";

const robotoFlex = Roboto_Flex({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-tez-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-tez-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-tez-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TezHR",
  description: "Applicant Tracking System",
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
      className={`${robotoFlex.variable} ${robotoMono.variable} ${manrope.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
