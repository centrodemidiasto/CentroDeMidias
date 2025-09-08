
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookText, ListOrdered, MicVocal, Camera, Sparkles, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function NormasDeUsoPage() {
  const normasAgendamento = [
    "O agendamento deverá ocorrer com pelo menos sete dias de antecedência e estará sujeito a disponibilidade de data e horário e será ser feito por meio do link centrodemidiasto.vercel.app;",
    "A desistência na utilização do Estúdio deve ser comunicada com, pelo menos, três dias de antecedência. Deste modo, usuários inscritos em eventual lista de espera poderão ser avisados, a tempo de fazerem uso do espaço;",
    "O material da apresentação deverá ser enviado com 72 horas de antecedência a gravação e/ou transmissão e deve seguir as orientações constantes no Anexo I;",
    "Os slides devem contemplar o espaço destinado ao tradutor de libras quando necessário, como no modelo do Anexo II;",
    "Os slides ou apresentação devem estar revisados e prontos para apresentação para evitar atrasos nos horários agendados previamente;",
    "Para o melhor aproveitamento do tempo no Estúdio, é exigido aos usuários o planejamento prévio de suas atividades. Não será iniciado nenhum trabalho em que o usuário não tenha uma pauta ou um roteiro pronto. É imprescindível que o diretor de estúdio da GMEACM, possua uma cópia que deve ser providenciada pelo usuário e entregue com antecedência mínima de cinco dias;",
  ];

  const normasNoEstudio = [
    "Os participantes da gravação e/ou transmissão deverão chegar ao Centro de Mídias com 30 minutos de antecedência ao horário agendado;",
    "A tolerância para eventuais atrasos será de quinze minutos, após esse período, o agendamento será cancelado;",
    "A entrada no estúdio de gravação será autorizada somente na presença do técnico da GMEACM, e somente será autorizado se houver necessidade 1 acompanhante;",
    "Não é permitida a entrada com alimentos e bebidas nos estúdios;",
    "Ao adentrar o estúdio o celular será configurado para o modo avião;",
    "Durante o evento, a equipe técnica de gravação vão se comunicar e se locomover entrando e saindo dos recintos. Os participantes devem ignorar essa movimentação para não perderem a concentração;",
    "Para as gravações poderá ter tela de retorno, mas o participante deve manter o foco nas câmeras para manter um diálogo mais assertivo com seu público;",
  ];
  
  const normasVestimenta = [
    {
      titulo: "Roupas",
      descricao: "Como o cenário é verde, deve-se evitar quaisquer tipos de roupas na cor verde (de todos os tons). Roupas brancas também não devem ser usadas, uma vez que refletem demais as luzes e no estúdio o número de luzes ligadas é muito grande. Podem usar uma camisa branca embaixo de um blazer escuro. Outras roupas que devem ser evitadas: com listras, quadriculadas, com estampas de bolinhas, muito estampadas, de renda, transparentes, de tecidos muito moles como seda, cetim (isso dificulta a colocação dos microfones), calça legging saias curtas ou vestidos curtos;"
    },
    {
      titulo: "Maquiagem",
      descricao: "Para os homens, basta o pó para tirar o brilho da pele. As mulheres devem ir com maquiagens mais naturais, sem iluminadores, sombras ou outros produtos brilhantes ou com glitter e devem dar preferência para maquiagens, com efeito, matte. A qualidade das câmeras de hoje captam muitos detalhes, então, as maquiagens não devem ser carregadas;"
    },
    {
      titulo: "Cabelos e Acessórios",
      descricao: "Quando a pessoa tiver cabelos muito compridos, deve deixá-los atrás dos ombros para que não caiam no microfone e causem alguma interferência. Deve-se evitar acessórios grandes e muito brilhantes. Preferencialmente não usar brincos grandes que balancem muito e deem reflexos, colares grandes (que podem bater nos microfones) e pulseiras (que podem fazer algum tipo de som quando mexerem os braços). Se algum acessório interferir na gravação, a equipe do estúdio vai pedir que sejam retirados;"
    }
  ];

  const normasTecnicas = [
    "O uso e manuseio dos equipamentos do estúdio é de inteira responsabilidade dos técnicos da GMEACM sendo terminantemente proibido o manuseio por terceiros;",
    "Para garantir o pleno controle técnico e operacional durante as transmissões ao vivo via Google Meet, é indispensável que a criação das salas de reunião seja realizada exclusivamente pelo CME (Centro de Mídias Educacionais). Salas criadas fora do ambiente do CME não poderão ser controladas por nossos operadores, comprometendo diretamente o desempenho da live e inviabilizando ações essenciais como: Controle de áudio e vídeo dos participantes; Gerenciamento de acessos e permissões; Estabilização da transmissão; Apoio técnico em tempo real.",
    "Transmissões realizadas sem o devido controle podem sofrer falhas e interrupções, afetando a qualidade do conteúdo e o engajamento dos participantes. Contamos com a colaboração de todos para que as salas sejam sempre criadas dentro dos padrões operacionais definidos, assegurando a excelência nas transmissões;",
    "Após a finalização da gravação a equipe de edição terá cinco dias para edição e disponibilização do conteúdo nas plataformas;",
  ];


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

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                    <ListOrdered className="w-6 h-6 text-primary" />
                    Regras de Agendamento e Preparação
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ol className="list-decimal space-y-3 pl-5 text-muted-foreground font-body text-justify">
                   {normasAgendamento.map((norma, index) => <li key={`agendamento-${index}`}>{norma}</li>)}
                </ol>
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                    <Camera className="w-6 h-6 text-primary" />
                    Regras Durante a Permanência no Estúdio
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ol className="list-decimal space-y-3 pl-5 text-muted-foreground font-body text-justify">
                    {normasNoEstudio.map((norma, index) => <li key={`estudio-${index}`}>{norma}</li>)}
                </ol>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                    <Sparkles className="w-6 h-6 text-primary" />
                    Diretrizes de Vestimenta e Aparência
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground font-body text-justify">
                {normasVestimenta.map((item, index) => (
                    <div key={`vestimenta-${index}`}>
                        <h3 className="font-bold text-card-foreground">{item.titulo}:</h3>
                        <p>{item.descricao}</p>
                    </div>
                ))}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                    <MicVocal className="w-6 h-6 text-primary" />
                    Normas Técnicas e de Operação
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ol className="list-decimal space-y-3 pl-5 text-muted-foreground font-body text-justify">
                    {normasTecnicas.map((norma, index) => <li key={`tecnica-${index}`}>{norma}</li>)}
                </ol>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                    <AlertTriangle className="w-6 h-6 text-primary" />
                    Termos Legais e Responsabilidades
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ol className="list-decimal space-y-3 pl-5 text-muted-foreground font-body text-justify">
                     <li>Nas gravações os participantes deverão preencher o termo de autorização do uso de imagem baseado na LGPD conforme modelo no Anexo II;</li>
                     <li>
                        Danos e extravios dos equipamentos em posse dos usuários do Estúdio estão sujeitos à cobrança equivalente ao prejuízo causado. 
                        <Link 
                            href="https://www2.camara.leg.br/legin/fed/declei/1940-1949/decreto-lei-2848-7-dezembro-1940-412868-normaatualizada-pe.html" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary hover:underline ml-1"
                        >
                           (Art. 163, da Lei nº 2.848, de 7 de dezembro de 1940).
                        </Link>
                    </li>
                </ol>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
