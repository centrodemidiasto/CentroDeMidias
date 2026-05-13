export const runtime = "nodejs";


import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoveRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="relative w-full h-[60vh] md:h-[80vh] flex justify-start text-white overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full z-[-2]">
            <iframe
              className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2"
              style={{ minWidth: '177.77vh', minHeight: '100vw' }} // Maintain 16:9 aspect ratio
              src="https://www.youtube.com/embed/IJIuLF5ThD4?autoplay=1&mute=1&loop=1&playlist=IJIuLF5ThD4&controls=0&showinfo=0&autohide=1&modestbranding=1"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            ></iframe>
          </div>
          <div className="absolute top-0 left-0 w-full h-full bg-black/60 z-[-1]"></div>
          <div className="container px-4 md:px-6 z-10">
            <div className="flex flex-col justify-start items-start space-y-4 text-left pt-16 md:pt-24">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                  Centro de Mídias Educacionais do Tocantins
                </h1>
                <p className="max-w-[600px] text-gray-200 md:text-xl font-body">
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
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container mx-auto px-4 md:px-6">
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
                    src="/img/EstudioChroma.jpg"
                    width={400}
                    height={300}
                    alt="Estúdio de Gravação com fundo verde (chromakey)"
                    data-ai-hint="chroma key studio"
                    className="w-full h-56 object-cover"
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
                    src="/img/CentralProd.jpg"
                    width={400}
                    height={300}
                    alt="Ilha de Edição"
                    data-ai-hint="editing suite"
                    className="w-full h-56 object-cover"
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
                    src="/img/SalaColab.jpeg"
                    width={400}
                    height={300}
                    alt="Sala de Colaboração"
                    data-ai-hint="collaboration room"
                    className="w-full h-56 object-cover"
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
