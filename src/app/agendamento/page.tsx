

'use client'; 

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ListChecks, Clock, AlertTriangle } from "lucide-react";
import SchedulingForm from "@/components/scheduling-form";

export default function AgendamentoPage() {

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-headline">
            Agendamento de Horários
          </h1>
          <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground font-body">
            <Clock className="h-4 w-4" />
            <span>Cada agendamento tem duração de 60 minutos.</span>
          </div>
        </div>

        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertTitle className="font-headline">Atenção</AlertTitle>
            <AlertDescription className="font-body">
            Todos os arquivos e materiais digitais, tais como slides, vídeos, músicas e outros materiais que serão utilizados como auxílio durante as gravações e lives, precisam ser enviadas para o e-mail centrodemidias@seduc.to.gov.br com pelo menos 72h de antecedência ao horário agendado.
            </AlertDescription>
        </Alert>

        <Alert className="bg-primary/5 border-primary/20">
          <ListChecks className="h-4 w-4 text-primary" />
          <AlertTitle className="font-headline text-primary">Diretrizes para Agendamento</AlertTitle>
          <AlertDescription className="font-body">
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>O agendamento deverá ocorrer com pelo menos sete dias de antecedência e estará sujeito a disponibilidade de data e horário.</li>
              <li>O período máximo para um único agendamento é de um dia.</li>
              <li>Os participantes da gravação e/ou transmissão deverão chegar ao Centro de Mídias com 30 minutos de antecedência ao horário agendado.</li>
              <li>O agendamento está sujeito à aprovação da equipe do Centro de Mídias.</li>
              <li>O cancelamento deve ocorrer com no mínimo 24 horas de antecedência, caso não possa comparecer.</li>
              <li>A sua solicitação será analisada em até 3 dias úteis.</li>
              <li>Entraremos em contato via WhatsApp e/ou E-mail para confirmação do agendamento.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <SchedulingForm />
        
      </div>
    </div>
  );
}
