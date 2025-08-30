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
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground font-body">
            Conheça nossa trajetória e o que fazemos para impulsionar a educação através da tecnologia.
          </p>
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
                <p className="text-muted-foreground font-body">
                  Os Núcleos de Produção de Recursos Educacionais Digitais da Gerência de Mídias Educacionais e Acompanhamento aos Centros de Mídias – GMEACM, tem estrutura para gravação e transmissão de vídeo-aulas além de contribuir com a formação de docentes e suas interfaces para as inovações curriculares.
                </p>
                <p className="mt-4 text-muted-foreground font-body">
                  O Centro de Mídias Educacionais do Tocantins destina-se ao corpo  docente, discente e  técnico-administrativo da Seduc. O seu uso deve ser normatizado para garantir o fluxo de produção bem como a qualidade da produção audiovisual, e deve ser utilizado preferencialmente para atender às dimensões de ensino, pesquisa e extensão da Seduc.
                </p>
              </CardContent>
            </div>
            <Image
              src="https://picsum.photos/600/400?grayscale"
              width={600}
              height={400}
              alt="Prédio histórico do Centro de Mídias"
              data-ai-hint="building history"
              className="w-full h-full object-cover rounded-r-lg"
            />
          </div>
        </Card>

        <Card>
            <div className="grid md:grid-cols-2 gap-6 items-center">
                <Image
                    src="https://picsum.photos/601/400"
                    width={600}
                    height={400}
                    alt="Pessoas trabalhando em estúdio"
                    data-ai-hint="people working studio"
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
                      <p className="text-muted-foreground font-body">
                        As atividades audiovisuais desenvolvidas no centro de mídias são em forma de gravações e lives, que deverão ser especificadas pelo interessado no ato do agendamento.
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold font-headline flex items-center gap-2 mb-1">
                            <Video className="w-5 h-5 text-accent" />
                            Gravação
                          </h3>
                          <p className="text-sm text-muted-foreground font-body">
                            As gravações realizadas no centro de mídias educacionais são produzidas por equipamentos e softwares de última geração, em um estúdio muito confortável e equipado onde todo o trabalho é realizado por uma equipe totalmente qualificada e preparada para os diversos formatos de gravações.
                          </p>
                        </div>
                        <div>
                          <h3 className="font-semibold font-headline flex items-center gap-2 mb-1">
                            <RadioTower className="w-5 h-5 text-accent" />
                            Transmissões ao vivo (Live)
                          </h3>
                          <p className="text-sm text-muted-foreground font-body">
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
