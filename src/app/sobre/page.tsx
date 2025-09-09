
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Activity, Video, RadioTower } from "lucide-react";
import Image from "next/image";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

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
  description: React.ReactNode;
  images: string[];
}

const StudioShowcase = ({ title, subtitle, description, images }: StudioShowcaseProps) => (
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
            {description}
        </div>
      </CardContent>
    </Card>
);

export default function SobrePage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">
      <div className="space-y-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-headline">
            Sobre o Centro de Mídias
          </h1>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                    <BookOpen className="w-6 h-6 text-primary" />
                    Nossa Missão
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 px-6 pb-6">
                <p className="text-muted-foreground font-body text-justify">
                Os Núcleos de Produção de Recursos Educacionais Digitais da Gerência de Mídias Educacionais e Acompanhamento aos Centros de Mídias – GMEACM, tem estrutura para gravação e transmissão de vídeo-aulas além de contribuir com a formação de docentes e suas interfaces para as inovações curriculares.
                </p>
                <p className="mt-4 text-muted-foreground font-body text-justify">
                O Centro de Mídias Educacionais do Tocantins é destinado ao corpo docente, discente e técnico-administrativo da Seduc. Seu uso será regulamentado a fim de assegurar a organização dos processos e a qualidade das produções audiovisuais, sendo prioritariamente voltado às ações de ensino, pesquisa e extensão desenvolvidas pela Secretaria.
                </p>
            </CardContent>
        </Card>
        
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Conheça Nossos Estúdios</h2>
            </div>
             <div className="grid md:grid-cols-2 gap-8">
                <StudioShowcase 
                    title="Estúdio 1"
                    subtitle="Estúdio Convencional / Podcast"
                    description={
                      <p>
                        Este estúdio, com suas paredes revestidas de espuma acústica, é projetado para um controle de áudio superior, minimizando ecos e reverberações. O fundo é neutro e profissional, com a opção de usar o monitor de TV para exibir imagens, logos ou apresentações.
                      </p>
                    }
                    images={estudio1Images} 
                />
                <StudioShowcase 
                    title="Estúdio 2" 
                    subtitle="Estúdio Chromakey"
                    description={
                      <p>
                        O destaque deste estúdio é o fundo verde infinito (chromakey). Essa tecnologia permite que, na pós-produção, o fundo verde seja substituído digitalmente por qualquer imagem, vídeo ou cenário virtual.
                      </p>
                    }
                    images={estudio2Images}
                />
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                <Activity className="w-6 h-6 text-primary" />
                Atividades Desenvolvidas
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground font-body text-justify">
                As atividades audiovisuais desenvolvidas no centro de mídias são em forma de gravações e lives, que deverão ser especificadas pelo interessado no ato do agendamento.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold font-headline flex items-center gap-2 mb-1">
                    <Video className="w-5 h-5 text-accent" />
                    Gravação
                  </h3>
                  <p className="text-sm text-muted-foreground font-body text-justify">
                    As gravações realizadas no centro de mídias educacionais são produzidas por equipamentos e softwares de última geração, em um estúdio muito confortável e equipado onde todo o trabalho é realizado por uma equipe totalmente qualificada e preparada para os diversos formatos de gravações.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold font-headline flex items-center gap-2 mb-1">
                    <RadioTower className="w-5 h-5 text-accent" />
                    Transmissões ao vivo (Live)
                  </h3>
                  <p className="text-sm text-muted-foreground font-body text-justify">
                   As lives realizadas e transmitidas pelo centro de mídias educacionais são realizadas com equipamentos e softwares de última geração, em um estúdio muito confortável e equipado onde todo o trabalho é realizado por uma equipe totalmente qualificada e preparada para as diversas formas de transmissão online.
                  </p>
                </div>
              </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
