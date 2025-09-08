import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Activity, Video, RadioTower } from "lucide-react";
import Image from "next/image";

export default function SobrePage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-headline">
            Sobre o Centro de Mídias
          </h1>
        </div>

        <Card>
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="p-6">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                  <BookOpen className="w-6 h-6 text-primary" />
                  Sobre
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-muted-foreground font-body text-justify">
                Os Núcleos de Produção de Recursos Educacionais Digitais da Gerência de Mídias Educacionais e Acompanhamento aos Centros de Mídias – GMEACM, tem estrutura para gravação e transmissão de vídeo-aulas além de contribuir com a formação de docentes e suas interfaces para as inovações curriculares.
                </p>
                <p className="mt-4 text-muted-foreground font-body text-justify">
                O Centro de Mídias Educacionais do Tocantins é destinado ao corpo docente, discente e técnico-administrativo da Seduc. Seu uso será regulamentado a fim de assegurar a organização dos processos e a qualidade das produções audiovisuais, sendo prioritariamente voltado às ações de ensino, pesquisa e extensão desenvolvidas pela Secretaria.
                </p>
              </CardContent>
            </div>
            <Image
              src="/img/EstudioUm.jpg"
              width={600}
              height={400}
              alt="Estúdio de gravação com fundo de madeira e equipamentos"
              data-ai-hint="recording studio"
              className="w-full h-full object-cover rounded-r-lg"
            />
          </div>
        </Card>

        <Card>
            <div className="grid md:grid-cols-2 gap-6 items-center">
                <Image
                    src="/img/EstudioChroma.jpg"
                    width={600}
                    height={400}
                    alt="Estúdio com fundo verde de chroma key"
                    data-ai-hint="chroma key studio"
                    className="w-full h-full object-cover rounded-l-lg"
                />
                <div className="p-6">
                    <CardHeader className="p-0 mb-4">
                        <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                        <Activity className="w-6 h-6 text-primary" />
                        Atividades Desenvolvidas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-4">
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
                </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
