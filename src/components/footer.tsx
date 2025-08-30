import { Film } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Link href="/" className="flex items-center space-x-2">
            <Film className="h-6 w-6 text-primary" />
            <p className="text-center text-sm leading-loose md:text-left font-headline">
              Centro de Mídias Educacionais - TO
            </p>
          </Link>
        </div>
        <p className="text-center text-sm text-muted-foreground md:text-left">
          © {new Date().getFullYear()} Centro de Mídias Educacionais do Tocantins. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
