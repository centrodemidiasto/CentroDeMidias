import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifySession } from "@/app/auth-actions";

export default async function DashboardPage() {
  const session = await verifySession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

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
