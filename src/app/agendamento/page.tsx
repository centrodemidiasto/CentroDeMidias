
'use client'; 

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ListChecks, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import FormularioAgendamento from "@/components/formulario-agendamento";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const estudio1Images: string[] = [
    "/img/EstudioUm.jpg",
    "/img/E1-1.jpg",
    "/img/E1-2.jpg",
    "/img/E1-3.jpg",
    "/img/E1-4.jpg",
];

const estudio2Images: string[] = [
    "/img/EstudioChroma.jpg",
    "/img/E2-1.jpg",
    "/img/E2-2.jpg",
    "/img/E2-3.jpg",
    "/img/E2-4.jpg",
];

interface StudioShowcaseProps {
  title: string;
  subtitle: string;
  description: string;
  images: string[];
  buttonLink: string;
}

const StudioShowcase = ({ title, subtitle, description, images, buttonLink }: StudioShowcaseProps) => (
    <Card className="overflow-hidden flex flex-col">
      <CardContent className="p-4 flex-grow">
        <div className="text-center mb-4">
            <h3 className="text-2xl font-bold font-headline">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Carousel className="w-full">
          <CarouselContent>
            {images.map((src, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                  <Card>
                    <CardContent className="flex aspect-video items-center justify-center p-0 overflow-hidden rounded-lg">
                       <Image
                          src={src}
                          alt={`${title} - Imagem ${index + 1}`}
                          width={600}
                          height={400}
                          className="w-full h-full object-cover"
                       />
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="ml-12" />
          <CarouselNext className="mr-12" />
        </Carousel>
        <div className="mt-4 text-sm text-muted-foreground text-justify">
            <p>{description}</p>
        </div>
      </CardContent>
      <div className="p-4 pt-0">
        <Button asChild className="w-full" variant="outline">
            <Link href={buttonLink}>
                Saiba mais sobre os estúdios <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </div>
    </Card>
);


export default function PaginaAgendamento() {

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font.bold tracking-tight sm:text-4xl md:text-5xl font-headline">
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
        
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Conheça Nossos Estúdios</h2>
            </div>
             <div className="grid md:grid-cols-2 gap-8">
                <StudioShowcase 
                    title="Estúdio 1"
                    subtitle="Estúdio Convencional / Podcast"
                    description="Este estúdio, com suas paredes revestidas de espuma acústica, é projetado para um controle de áudio superior, minimizando ecos e reverberações. O fundo é neutro e profissional, com a opção de usar o monitor de TV para exibir imagens, logos ou apresentações."
                    images={estudio1Images} 
                    buttonLink="/sobre"
                />
                <StudioShowcase 
                    title="Estúdio 2" 
                    subtitle="Estúdio Chromakey"
                    description="O destaque deste estúdio é o fundo verde infinito (chromakey). Essa tecnologia permite que, na pós-produção, o fundo verde seja substituído digitalmente por qualquer imagem, vídeo ou cenário virtual."
                    images={estudio2Images}
                    buttonLink="/sobre"
                />
            </div>
        </div>

        <FormularioAgendamento />
        
      </div>
    </div>
  );
}
