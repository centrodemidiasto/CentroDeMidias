import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Clock } from "lucide-react";

export default function ContatoPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-headline">
            Entre em Contato
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground font-body">
            Estamos aqui para ajudar. Envie-nos uma mensagem ou visite-nos.
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Nossas Informações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold font-headline">E-mail</h3>
                  <a href="mailto:centrodemidias@seduc.to.gov.br" className="text-muted-foreground hover:text-primary transition-colors font-body">
                    centrodemidias@seduc.to.gov.br
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold font-headline">Horário de Funcionamento</h3>
                  <p className="text-muted-foreground font-body">Segunda a Sexta-feira: 9h às 18h</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                    <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold font-headline">Endereço</h3>
                  <p className="text-muted-foreground font-body">
                    Quadra 604 Sul, Alameda 6, S/N – Plano Diretor Sul
                    <br />
                    Palmas-TO – CEP 77022-038
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
