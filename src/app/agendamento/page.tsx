import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ListChecks } from "lucide-react";
import SchedulingForm from "@/components/scheduling-form";

export default function AgendamentoPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-headline">
            Agendamento de Horários
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground font-body">
            Selecione os dias e horários desejados para utilizar nossos estúdios.
          </p>
        </div>

        <Alert className="bg-primary/5 border-primary/20">
          <ListChecks className="h-4 w-4 text-primary" />
          <AlertTitle className="font-headline text-primary">Diretrizes para Agendamento</AlertTitle>
          <AlertDescription className="font-body">
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Verifique a disponibilidade de horários antes de solicitar o agendamento.</li>
              <li>O agendamento está sujeito à aprovação da equipe do Centro de Mídias.</li>
              <li>Cancele com no mínimo 24 horas de antecedência caso não possa comparecer.</li>
              <li>O período máximo para um único agendamento é de 7 dias corridos.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <SchedulingForm />
        
      </div>
    </div>
  );
}
