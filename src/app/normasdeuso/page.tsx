
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookText } from "lucide-react";

export default function NormasDeUsoPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-headline">
            NORMAS LOCAIS DE USO
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                <BookText className="w-6 h-6 text-primary" />
                Introdução
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground font-body text-justify">
              Os Núcleos de Produção de Recursos Educacionais Digitais da Gerência de Mídias Educacionais e Acompanhamento aos Centros de Mídias – GMEACM, tem estrutura para gravação e transmissão de vídeo-aulas além de contribuir com a formação de docentes e suas interfaces para as inovações curriculares.
            </p>
            <p className="mt-4 text-muted-foreground font-body text-justify">
              O Centro de Mídias Educacionais do Tocantins é destinado ao corpo docente, discente e técnico-administrativo da Seduc. Seu uso será regulamentado a fim de assegurar a organização dos processos e a qualidade das produções audiovisuais, sendo prioritariamente voltado às ações de ensino, pesquisa e extensão desenvolvidas pela Secretaria.
            </p>
             <p className="mt-4 text-muted-foreground font-body text-justify">
              As normas a seguir referem-se ao uso em pré e pós-produção para gravações e transmissões de conteúdo educacional, portanto faz-se necessário tomar conhecimento das normas a seguir antes da solicitação de agendamento.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
