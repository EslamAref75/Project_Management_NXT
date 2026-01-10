import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SystemSettingsProvider } from "@/components/providers/system-settings-provider";
import { prisma } from "@/lib/prisma";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "general" }
  });

  let title = "Qeema Tech Management";
  if (setting && setting.value) {
    try {
      const value = JSON.parse(setting.value);
      if (value.systemName) title = value.systemName;
    } catch (e) { }
  }

  return {
    title,
    description: "Project management system",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <SystemSettingsProvider>
            <div className="h-screen bg-gray-50">
              {children}
            </div>
          </SystemSettingsProvider>
        </Providers>
      </body>
    </html>
  );
}
