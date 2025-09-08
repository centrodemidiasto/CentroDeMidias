
import Image from "next/image";
import Link from "next/link";
import { Youtube, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center justify-center gap-6 py-8">
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="flex items-center space-x-2">
             <Image
                src="/img/centrologo.png"
                width={180}
                height={50}
                alt="Logotipo do Centro de Mídias Educacionais"
                className="object-contain"
            />
          </Link>
          <div className="text-sm text-muted-foreground text-center">
            <p>Endereço: Quadra 604 Sul, Alameda 6, S/N – Plano Diretor Sul</p>
            <p>Palmas-TO – CEP 77022-038</p>
            <p>Contato: centrodemidias@seduc.to.gov.br</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <Link href="https://www.youtube.com/channel/UC38AnaXTbx5ZzWBQx8av62Q" target="_blank" rel="noopener noreferrer" aria-label="Youtube">
                <Youtube className="h-6 w-6 text-muted-foreground transition-colors hover:text-primary" />
            </Link>
             <Link href="https://www.instagram.com/centrodemidias.to" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram className="h-6 w-6 text-muted-foreground transition-colors hover:text-primary" />
            </Link>
        </div>
      </div>
    </footer>
  );
}
