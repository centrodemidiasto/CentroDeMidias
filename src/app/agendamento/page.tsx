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
              <li>O agendamento deverá ocorrer com pelo menos sete dias de antecedência e estará sujeito a disponibilidade de data e horário.</li>
              <li>O período máximo para um único agendamento é de um dia.</li>
              <li>Os participantes da gravação e/ou transmissão deverão chegar ao Centro de Mídias com 30 minutos de antecedência ao horário agendado.</li>
              <li>Todos os arquivos e materiais digitais, tais como: Slides, Vídeos, Música e outros materiais que serão utilizados como auxilio durante as gravações e lives, precisam ser enviadas para o e-mail: centrodemidias@seduc.to.gov.br com pelo menos 72h (Setenta e duas horas) de antecedência ao horário respectivamente agendado.</li>
              <li>O agendamento está sujeito à aprovação da equipe do Centro de Mídias.</li>
              <li>Cancele com no mínimo 24 horas de antecedência caso não possa comparecer.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <SchedulingForm />
        
      </div>
    </div>
  );
}
