import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center justify-center gap-6 py-8">
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="flex items-center space-x-2">
            <Image 
              src="/img/centroicone.png"
              width={40}
              height={40}
              alt="Logotipo do Centro de Mídias Educacionais"
            />
            <span className="font-bold sm:inline-block font-headline">
              Centro de Mídias Educacionais - TO
            </span>
          </Link>
          <div className="text-sm text-muted-foreground text-center">
            <p>Endereço: Quadra 604 Sul, Alameda 6, S/N – Plano Diretor Sul</p>
            <p>Palmas-TO – CEP 77022-038</p>
            <p>Contato: centrodemidias@seduc.to.gov.br</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
