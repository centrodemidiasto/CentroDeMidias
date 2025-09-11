
"use client";

import { Menu, X, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const navLinks = [
  { href: "/", label: "Início" },
  { href: "/sobre", label: "Sobre" },
  { href: "/agendamento", label: "Agendamento" },
  { href: "/normasdeuso", label: "Normas de Uso" },
  { href: "/contato", label: "Contato" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logout bem-sucedido!",
        description: "Você foi desconectado com segurança.",
      });
      router.push('/');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível fazer o logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

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
                src="/img/centrologo.png"
                width={150}
                height={40}
                alt="Logotipo do Centro de Mídias Educacionais"
                className="object-contain"
            />
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
             {!loading && user && <NavLink href="/admin" label="Painel" />}
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
                        src="/img/centrologo.png"
                        width={120}
                        height={32}
                        alt="Logotipo do Centro de Mídias Educacionais"
                        className="object-contain"
                    />
                </Link>
            </div>
            <SheetContent side="left" className="pr-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu Principal</SheetTitle>
                </SheetHeader>
              <Link
                href="/"
                className="flex items-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Image 
                  src="/img/centrologo.png"
                  width={120}
                  height={32}
                  alt="Logotipo do Centro de Mídias Educacionais"
                  className="mr-2 object-contain"
                />
              </Link>
              <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                <div className="flex flex-col space-y-3">
                  {navLinks.map((link) => (
                    <NavLink key={link.href} {...link} />
                  ))}
                   {!loading && user && <NavLink href="/admin" label="Painel" />}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            {loading ? null : user ? (
               <Button onClick={handleSignOut} variant="ghost" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
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
          </div>
        </div>
      </div>
    </header>
  );
}

    