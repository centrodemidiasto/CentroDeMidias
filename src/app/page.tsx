import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoveRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                    Centro de Mídias Educacionais do Tocantins
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl font-body">
                    Agende seu horário para utilizar nossos estúdios e recursos audiovisuais de ponta. Transforme suas ideias em realidade.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href="/agendamento">
                      Agendar Agora
                      <MoveRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="/img/centrologo.png"
                width={600}
                height={400}
                alt="Hero"
                data-ai-hint="media studio"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-contain sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Nossos Espaços</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed font-body">
                  Conheça os ambientes modernos e equipados que o Centro de Mídias oferece para a produção de conteúdo educacional.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <Image
                    src="https://picsum.photos/400/300"
                    width={400}
                    height={300}
                    alt="Estúdio de Gravação"
                    data-ai-hint="recording studio"
                    className="w-full h-auto object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-bold font-headline">Estúdio Principal</h3>
                    <p className="text-sm text-muted-foreground font-body">Equipado com chromakey e iluminação profissional.</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <Image
                    src="https://picsum.photos/400/301"
                    width={400}
                    height={300}
                    alt="Ilha de Edição"
                    data-ai-hint="editing suite"
                    className="w-full h-auto object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-bold font-headline">Ilha de Edição</h3>
                    <p className="text-sm text-muted-foreground font-body">Workstations de alta performance para pós-produção.</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <Image
                    src="https://picsum.photos/400/302"
                    width={400}
                    height={300}
                    alt="Sala de Reunião"
                    data-ai-hint="meeting room"
                    className="w-full h-auto object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-bold font-headline">Sala de Colaboração</h3>
                    <p className="text-sm text-muted-foreground font-body">Espaço para brainstorming e planejamento de projetos.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
