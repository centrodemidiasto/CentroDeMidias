"use client";

import { useAuth } from "@/hooks/use-auth.tsx";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Apenas redireciona se o carregamento estiver concluído e não houver usuário.
    // Esta é a verificação de segurança final.
    if (!loading && !user) {
      console.log("Redirecting to /login from admin page (no user after loading)");
      router.push("/login");
    }
  }, [user, loading, router]);

  // Enquanto o status de autenticação estiver sendo verificado, exiba um loader.
  // Isso impede que a verificação no useEffect seja executada prematuramente.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Se, após o carregamento, não houver usuário, o useEffect acima fará o redirecionamento.
  // Retornar nulo aqui evita a renderização do painel para usuários não autorizados.
  if (!user) {
    return null;
  }

  // Se chegamos aqui, o usuário está carregado e autenticado.
  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-headline">
            Painel de Controle
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground font-body">
            Gerencie os agendamentos e horários do Centro de Mídias.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo(a)!</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Em breve, aqui você poderá visualizar, aprovar, rejeitar e bloquear agendamentos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
