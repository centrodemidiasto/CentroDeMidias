
import { Button } from "@/components/ui/button";
import { SearchX, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center px-4 py-16">
      <div className="bg-destructive/10 p-6 rounded-full mb-8">
        <SearchX className="w-24 h-24 text-destructive" />
      </div>
      <h1 className="text-6xl font-bold text-destructive font-headline">
        404
      </h1>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl font-headline">
        Página Não Encontrada
      </h2>
      <p className="mt-4 max-w-md text-muted-foreground font-body">
        Desculpe, não conseguimos encontrar a página que você está procurando. Ela pode ter sido movida, excluída ou talvez você tenha digitado o endereço errado.
      </p>
      <Button asChild className="mt-8 bg-accent hover:bg-accent/90 text-accent-foreground" size="lg">
        <Link href="/">
          <Home className="mr-2 h-5 w-5" />
          Voltar para o Início
        </Link>
      </Button>
    </div>
  );
}
