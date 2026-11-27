import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppPreferences } from "@/src/ui/app-preferences.tsx";
import { ReactGrab } from "@/src/ui/react-grab.tsx";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Historias del podcast",
  description:
    "Reencontrá una Historia del podcast a partir de lo que recordás. Sitio hecho por fans.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppPreferences>
          <div className="border-b bg-muted px-6 py-2.5 text-center text-sm text-muted-foreground">
            Sitio hecho por fans. No es oficial ni está asociado al podcast.
          </div>
          {children}
        </AppPreferences>
        {process.env.NODE_ENV === "development" && <ReactGrab />}
      </body>
    </html>
  );
}
