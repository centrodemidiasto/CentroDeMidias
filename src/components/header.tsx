"use client";

import { Menu, X, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { handleSignOut, verifySession } from "@/app/auth-actions";

const navLinks = [
  { href: "/", label: "Início" },
  { href: "/sobre", label: "Sobre" },
  { href: "/agendamento", label: "Agendamento" },
  { href: "/contato", label: "Contato" },
];

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This function will run on the client side.
    async function checkLoginStatus() {
      // It's safe to assume verifySession can be called client-side
      // if it only reads cookies and doesn't expose secrets.
      // However, for robustness, let's keep it as is, but manage state carefully.
      const session = await verifySession();
      setIsLoggedIn(session.isLoggedIn);
      setLoading(false);
    }
    checkLoginStatus();
  }, [pathname]); // Re-check on path change


  const NavLink = ({ href, label }: { href: string, label: string }) => (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium transition-colors hover:text-primary",
        pathname === href ? "text-primary" : "text-muted-foreground"
      )}
      onClick={() => setIsMobileMenuOpen(false)}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image 
              src="/img/centroicone.png"
              width={32}
              height={32}
              alt="Logotipo do Centro de Mídias Educacionais"
            />
            <span className="hidden font-bold sm:inline-block font-headline">
              Centro de Mídias Educacionais - TO
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
             {!loading && isLoggedIn && <NavLink href="/admin" label="Painel" />}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <div className="md:hidden flex items-center">
                <Link href="/" className="flex items-center space-x-2">
                    <Image 
                      src="/img/centroicone.png"
                      width={32}
                      height={32}
                      alt="Logotipo do Centro de Mídias Educacionais"
                    />
                    <span className="font-bold font-headline">Centro de Mídias - TO</span>
                </Link>
            </div>
            <SheetContent side="left" className="pr-0">
              <Link
                href="/"
                className="flex items-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Image 
                  src="/img/centroicone.png"
                  width={24}
                  height={24}
                  alt="Logotipo do Centro de Mídias Educacionais"
                  className="mr-2"
                />
                <span className="font-bold">Centro de Mídias - TO</span>
              </Link>
              <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                <div className="flex flex-col space-y-3">
                  {navLinks.map((link) => (
                    <NavLink key={link.href} {...link} />
                  ))}
                   {!loading && isLoggedIn && <NavLink href="/admin" label="Painel" />}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <nav className="hidden md:flex items-center gap-2">
            {loading ? null : isLoggedIn ? (
               <form action={handleSignOut}>
                <Button type="submit" variant="ghost" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </form>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Link>
              </Button>
            )}
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/agendamento">Agendar</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
