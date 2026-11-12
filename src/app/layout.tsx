import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PreferencesProvider } from "@/components/PreferencesProvider";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "RentUs — Campus & Community Rentals",
  description:
    "Browse and rent campus gear without logging in. Instant QRIS payment, live return tracking, and full RBAC Admin & Partner Console.",
};

const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('rentus-theme');
    var l = localStorage.getItem('rentus-language');
    document.documentElement.dataset.theme = t === 'dark' ? 'dark' : 'light';
    document.documentElement.lang = l === 'en' ? 'en' : 'id';
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${jakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
