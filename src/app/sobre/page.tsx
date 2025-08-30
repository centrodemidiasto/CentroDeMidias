import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Activity } from "lucide-react";
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
                  Nossa História
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-muted-foreground font-body">
                  O Centro de Mídias Educacionais do Tocantins foi fundado com a missão de inovar o processo de ensino e aprendizagem no estado. Desde o início, nosso foco tem sido a produção de conteúdo digital de alta qualidade, utilizando tecnologia de ponta para criar materiais didáticos que sejam tanto informativos quanto envolventes.
                </p>
                <p className="mt-4 text-muted-foreground font-body">
                  Ao longo dos anos, expandimos nossas instalações e equipe para atender à crescente demanda por recursos audiovisuais na educação, tornando-nos uma referência em produção de mídia educacional na região.
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
                    <CardContent className="p-0">
                        <ul className="space-y-3 text-muted-foreground font-body list-disc list-inside">
                            <li>Produção e gravação de videoaulas para todas as etapas da educação básica.</li>
                            <li>Transmissões ao vivo de eventos educacionais, seminários e palestras.</li>
                            <li>Desenvolvimento de podcasts e outros materiais em áudio.</li>
                            <li>Capacitação de professores para o uso de tecnologias digitais em sala de aula.</li>
                            <li>Criação de animações e objetos de aprendizagem interativos.</li>
                            <li>Suporte técnico e pedagógico para projetos de mídia nas escolas da rede estadual.</li>
                        </ul>
                    </CardContent>
                </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
