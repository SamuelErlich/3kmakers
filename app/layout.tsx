import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Controle 3D",
  description: "Precificação, orçamentos, pedidos e vendas de impressão 3D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans min-h-screen bg-base-bg text-base-text antialiased">
        {children}
      </body>
    </html>
  );
}
