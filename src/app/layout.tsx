
'use client';

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { usePathname } from "next/navigation";

// Metadata can't be exported from a client component, but we can declare it here.
// The actual metadata will be handled by Next.js in the nearest server component.
// export const metadata: Metadata = {
//   title: "Centro de Mídias Educacionais - TO",
//   description: "Agendamento de horários do Centro de Mídias Educacionais do Tocantins.",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isHorariosPage = pathname === '/horarios';
  const isGradePage = pathname.startsWith('/admin/grade');
  const isManifestoPage = pathname.startsWith('/admin/manifesto');

  const showHeaderAndFooter = !isHorariosPage && !isGradePage && !isManifestoPage;

  return (
    <html lang="pt-BR">
      <head>
        <title>Centro de Mídias Educacionais - TO</title>
        <meta name="description" content="Agendamento de horários do Centro de Mídias Educacionais do Tocantins." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
          {showHeaderAndFooter && <Header />}
          <main className="flex-1">{children}</main>
          {showHeaderAndFooter && <Footer />}
          <Toaster />
      </body>
    </html>
  );
}
