

'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db as clientDb } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Loader2, Info, XCircle, CalendarPlus, Pencil, AlertTriangle, UserCog, History, UserCircle, Trash2, CheckSquare, Square, ChevronLeft, ChevronRight, Mail, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfToday, addHours, startOfMonth, endOfMonth, addMonths, isSameMonth, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FormularioBloqueioHorarios from '@/components/formulario-bloqueio-horarios';
import { atualizarStatusReserva, cancelarReservasEmLote } from '@/app/actions';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import FormularioEdicaoReserva from '@/components/formulario-edicao-reserva';
import { Reserva, ReservaExistente } from '@/lib/types';
import { BloqueioManual } from '@/components/formulario-bloqueio-horarios';
import GerenciadorUsuarios from '@/components/gerenciador-usuarios';
import GerenciadorPerfil from '@/components/gerenciador-perfil';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import GeradorRelatorio from '@/components/gerador-relatorio';
import { Textarea } from '@/components/ui/textarea';
import GeradorDeGrade from '@/components/gerador-de-grade';

async function getReservasPendentes(): Promise<Reserva[]> {
  const reservasRef = collection(clientDb, "reservas");
  const q = query(
    reservasRef,
    where("status", "==", "pendente"),
    orderBy("criadoEm", "desc")
  );
  const querySnapshot = await getDocs(q);
  const reservas = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Reserva[];
  return reservas;
}

async function getReservasAprovadas(mes: Date): Promise<Reserva[]> {
  const hoje = startOfToday();
  const inicioDoMes = startOfMonth(mes);
  
  const inicioBusca = isBefore(inicioDoMes, hoje) ? hoje : inicioDoMes;

  const inicioFormatado = format(inicioBusca, 'yyyy-MM-dd');
  const fimDoMesFormatado = format(endOfMonth(mes), 'yyyy-MM-dd');
  
  const reservasRef = collection(clientDb, "reservas");

  const q = query(
    reservasRef,
    where("status", "==", "aprovado"),
    where("dataReserva", ">=", inicioFormatado),
    where("dataReserva", "<=", fimDoMesFormatado),
    orderBy("dataReserva", "asc")
  );
  const querySnapshot = await getDocs(q);
  const reservas = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Reserva[];

  reservas.sort((a, b) => {
    const timeA = a.horariosSelecionados[a.dataReserva]?.[0] || '00:00';
    const timeB = b.horariosSelecionados[b.dataReserva]?.[0] || '00:00';
    if (a.dataReserva < b.dataReserva) return -1;
    if (a.dataReserva > b.dataReserva) return 1;
    return timeA.localeCompare(timeB);
  });
  
  return reservas;
}

async function getReservasParaBloqueio(): Promise<ReservaExistente[]> {
  const reservasRef = collection(clientDb, "reservas");
  const q = query(
    reservasRef,
    where("status", "in", ["pendente", "aprovado"])
  );
  const querySnapshot = await getDocs(q);
  const slotsReservados: ReservaExistente[] = [];
  querySnapshot.forEach((doc) => {
      const data = doc.data() as Reserva;
      const slots = data.horariosSelecionados as Record<string, string[]>;
      const status = data.status as 'pendente' | 'aprovado';
      const estudio = data.estudio;
      for (const data in slots) {
          slotsReservados.push({ id: doc.id, data, horarios: slots[data], status, estudio });
      }
  });
  return slotsReservados;
}

async function getBloqueiosManuais(): Promise<BloqueioManual[]> {
    const bloqueiosRef = collection(clientDb, "horariosBloqueados");
    const querySnapshot = await getDocs(bloqueiosRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as BloqueioManual);
}


export default function PaginaPainel() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregamentoInicial, setCarregamentoInicial] = useState(true);
  
  const [reservasPendentes, setReservasPendentes] = useState<Reserva[]>([]);
  const [reservasAprovadas, setReservasAprovadas] = useState<Reserva[] | null>(null);
  const [dadosBloqueio, setDadosBloqueio] = useState<{ reserved: ReservaExistente[], manual: BloqueioManual[] } | null>(null);
  
  const [carregandoPendentes, setCarregandoPendentes] = useState(true);
  const [carregandoAprovados, setCarregandoAprovados] = useState(false);
  const [carregandoBloqueio, setCarregandoBloqueio] = useState(false);
  
  const [reservaSelecionada, setReservaSelecionada] = useState<Reserva | null>(null);
  const [editandoReserva, setEditandoReserva] = useState<Reserva | null>(null);
  const [reservaParaCancelar, setReservaParaCancelar] = useState<Reserva | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  const [reservasSelecionadasParaLote, setReservasSelecionadasParaLote] = useState<string[]>([]);
  const [confirmandoCancelamentoLote, setConfirmandoCancelamentoLote] = useState(false);
  const [mesAprovadas, setMesAprovadas] = useState(new Date());

  const router = useRouter();
  const { toast } = useToast();
  
  const emailsAdmin = ["dtie@seduc.to.gov.br", "centrodemidias@seduc.to.gov.br"];
  const podeGerenciarUsuarios = usuario && emailsAdmin.includes(usuario.email || '');

  const abrirModalDetalhes = (reserva: Reserva) => {
    setReservaSelecionada(reserva);
    setEditandoReserva(null);
    setModalAberto(true);
  }

  const abrirModalEdicao = (reserva: Reserva) => {
    setEditandoReserva(reserva);
    setReservaSelecionada(null);
    setModalAberto(true);
  }

  const fecharModal = () => {
    setModalAberto(false);
    setReservaSelecionada(null);
    setEditandoReserva(null);
  }

  const onSucessoEdicao = () => {
    fecharModal();
    buscarTodasReservas();
  }

  const buscarTodasReservas = () => {
     buscarReservasPendentes();
     buscarReservasAprovadas(true);
     buscarDadosBloqueio(true);
     setReservasSelecionadasParaLote([]);
  }

  const buscarReservasPendentes = () => {
    setCarregandoPendentes(true);
    getReservasPendentes().then(data => {
        setReservasPendentes(data);
        setCarregandoPendentes(false);
        setCarregamentoInicial(false);
    }).catch(err => {
        toast({ title: "Erro ao buscar pendentes", description: err.message, variant: "destructive"});
        setCarregandoPendentes(false);
        setCarregamentoInicial(false);
    });
  };

  const buscarReservasAprovadas = (force = false) => {
    if (reservasAprovadas && !force && isSameMonth(mesAprovadas, new Date())) return;
    setCarregandoAprovados(true);
    setReservasSelecionadasParaLote([]);
    getReservasAprovadas(mesAprovadas).then(data => {
        setReservasAprovadas(data);
        setCarregandoAprovados(false);
    }).catch(err => {
        toast({ title: "Erro ao buscar aprovados", description: err.message, variant: "destructive"});
        setCarregandoAprovados(false);
    });
  };

  const buscarDadosBloqueio = (force = false) => {
    if (dadosBloqueio && !force) return; 
    setCarregandoBloqueio(true);
    Promise.all([getReservasParaBloqueio(), getBloqueiosManuais()]).then(([reserved, manual]) => {
        setDadosBloqueio({ reserved, manual });
        setCarregandoBloqueio(false);
    }).catch(err => {
        toast({ title: "Erro ao buscar dados de bloqueio", description: err.message, variant: "destructive"});
        setCarregandoBloqueio(false);
    });
  };

  useEffect(() => {
    buscarReservasAprovadas(true);
  }, [mesAprovadas]);

  const handleMudancaAccordion = (value: string) => {
    if (value === "aprovado") {
      buscarReservasAprovadas(true);
    } else if (value === "block-slots" && !dadosBloqueio) {
      buscarDadosBloqueio();
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsuario(user);
        buscarReservasPendentes(); 
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleConfirmarCancelamento = async () => {
    if (!reservaParaCancelar || !usuario) return;

    if (!motivoCancelamento.trim()) {
      toast({ title: "Erro", description: "O motivo do cancelamento é obrigatório.", variant: "destructive"});
      return;
    }

    try {
        const adminUser = { nome: usuario.displayName || usuario.email, email: usuario.email };
        await atualizarStatusReserva(reservaParaCancelar.id, 'rejeitado', adminUser, motivoCancelamento);
        toast({
            title: "Sucesso!",
            description: `Agendamento cancelado.`,
        });
        buscarTodasReservas();
    } catch (error: any) {
        toast({
            title: "Erro",
            description: error.message || "Não foi possível cancelar o agendamento.",
            variant: "destructive",
        });
    } finally {
        setReservaParaCancelar(null);
        setMotivoCancelamento("");
    }
  }

  const handleAtualizacaoStatus = async (id: string, status: 'aprovado' | 'rejeitado', motivo?: string) => {
    if (!usuario) return;

    if (status === 'rejeitado' && !motivo) {
        const reserva = reservasPendentes.find(r => r.id === id);
        if (reserva) {
            setReservaParaCancelar(reserva);
        }
        return;
    }

    try {
        const adminUser = { nome: usuario.displayName || usuario.email, email: usuario.email };
        await atualizarStatusReserva(id, status, adminUser, motivo);
        toast({
            title: "Sucesso!",
            description: `Agendamento ${status === 'aprovado' ? 'aprovado' : 'rejeitado'}.`,
        });
        buscarTodasReservas();
    } catch (error: any) {
        toast({
            title: "Erro",
            description: error.message || "Não foi possível atualizar o status do agendamento.",
            variant: "destructive",
        });
    } finally {
        if(status === 'rejeitado') {
          setReservaParaCancelar(null);
          setMotivoCancelamento("");
        }
    }
  }

   const handleSelecaoLote = (reservaId: string) => {
    setReservasSelecionadasParaLote(prev =>
      prev.includes(reservaId) ? prev.filter(id => id !== reservaId) : [...prev, reservaId]
    );
  };

  const handleSelecionarTodas = () => {
    if (reservasSelecionadasParaLote.length === (reservasAprovadas?.length || 0)) {
      setReservasSelecionadasParaLote([]);
    } else {
      setReservasSelecionadasParaLote(reservasAprovadas?.map(r => r.id) || []);
    }
  };

  const handleConfirmarCancelamentoLote = async () => {
    if (reservasSelecionadasParaLote.length === 0 || !usuario) return;
    
    if (!motivoCancelamento.trim()) {
      toast({ title: "Erro", description: "O motivo do cancelamento é obrigatório.", variant: "destructive"});
      return;
    }

    try {
      const adminUser = { nome: usuario.displayName || usuario.email, email: usuario.email };
      await cancelarReservasEmLote(reservasSelecionadasParaLote, adminUser, motivoCancelamento);
      toast({
        title: "Sucesso!",
        description: `${reservasSelecionadasParaLote.length} agendamento(s) foram cancelado(s).`,
      });
      buscarTodasReservas(); // Isso já vai limpar a seleção
    } catch (error: any) {
       toast({
        title: "Erro",
        description: error.message || "Não foi possível cancelar os agendamentos.",
        variant: "destructive",
      });
    } finally {
      setConfirmandoCancelamentoLote(false);
      setMotivoCancelamento("");
    }
  };

  if (carregamentoInicial && !usuario) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!usuario) {
    return null;
  }
  
  const formatarDataParaExibicao = (dateString: string | Date) => {
      try {
        const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
        return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      } catch (error) {
        return "Data inválida";
      }
  };

   const formatarTimestamp = (ts: any): string => {
    if (!ts) return 'Data indisponível';
    
    // Se for um objeto com _seconds e _nanoseconds (de um server component), converta
    if (ts && typeof ts === 'object' && ('_seconds' in ts)) {
      const date = new Date(ts._seconds * 1000);
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    }
    
    // Se for um Timestamp do cliente ou um objeto Date
    if (ts instanceof Timestamp || ts instanceof Date) {
        const date = ts instanceof Timestamp ? ts.toDate() : ts;
        return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    }

    // Se já for uma string
    try {
        const date = parseISO(ts);
        return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
        return 'Data inválida';
    }
}

  const criarLinkGoogleAgenda = (reserva: Reserva): string => {
    const date = Object.keys(reserva.horariosSelecionados)[0];
    const startTimeStr = reserva.horariosSelecionados[date]?.[0];
    const endTimeStr = reserva.horariosSelecionados[date]?.[reserva.horariosSelecionados[date].length - 1];

    if (!date || !startTimeStr || !endTimeStr) return '';

    const startDateTime = parseISO(`${date}T${startTimeStr}:00`);
    const endDateTime = addHours(parseISO(`${date}T${endTimeStr}:00`), 1);

    const formatarParaGoogle = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");

    const dates = `${formatarParaGoogle(startDateTime)}/${formatarParaGoogle(endDateTime)}`;
    const text = `Gravação: ${reserva.tituloGravacao || reserva.nomeCompleto} [${reserva.estudio}] - ${reserva.modalidadesReserva}`;
    
    const orgao = reserva.tipoOrgao === 'interno' ? reserva.departamento : reserva.organizacaoExterna;
    
    const formatarDetalhe = (value: any) => (value ? value : '-');
    const formatarMateriais = (value: any) => (value && value.toLowerCase() !== 'nenhum' ? value : '-');

    const details = `Agendamento no Centro de Mídias.
Estúdio: ${formatarDetalhe(reserva.estudio)}
Solicitante: ${formatarDetalhe(reserva.nomeCompleto)}
Órgão: ${formatarDetalhe(orgao)}
Modalidade: ${formatarDetalhe(reserva.modalidadesReserva)}
Participantes: ${formatarDetalhe(reserva.numeroParticipantes)}
Mesas: ${formatarDetalhe(reserva.numeroMesas)}
Cadeiras: ${formatarDetalhe(reserva.numeroCadeiras)}
Materiais: ${formatarMateriais(reserva.materiaisNecessarios)}`;

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text,
        details,
        location: 'Centro de Mídias Educacionais - Palmas, TO',
    });

    return `https://www.google.com/calendar/render?${params.toString()}`;
  }

const criarLinkEmail = (reserva: Reserva, tipo: 'confirmacao' | 'cancelamento'): string => {
    const { email, nomeCompleto, dataReserva, horariosSelecionados, tituloGravacao, estudio } = reserva;
    const date = Object.keys(horariosSelecionados)[0];
    const times = horariosSelecionados[date].join(', ');
    const parsedDate = parseISO(date);
    const dia = format(parsedDate, 'dd');
    const mes = format(parsedDate, 'MMMM', { locale: ptBR });
    const ano = format(parsedDate, 'yyyy');
    
    let subject = '';
    let body = '';

    if (tipo === 'confirmacao') {
        subject = 'Seu agendamento no Centro de Mídias foi APROVADO';

        if (estudio === 'Estúdio 1') {
            body = `Olá ${nomeCompleto},

Seu agendamento para o Estúdio 1 , do Centro de Mídias Educacionais, está confirmado! Seguem abaixo orientações importantes para garantir que tudo ocorra bem:

📅 Data: ${dia} de ${mes}, ${ano}
🕑 Horário(s): ${times}

📅 Antes da gravação / transmissão:

a) Compareça com antecedência para ajustes de áudio, iluminação e preparação do roteiro;

b) Tenha sua apresentação, slides ou pauta definidos e enviados previamente, se necessário;

c) Revise todo o material antes da gravação para evitar contratempos.

🧰 Durante o uso:

d) Somente os técnicos do CME operam câmeras, microfones e demais equipamentos;

e) Não altere iluminação ou posicionamento sem orientação da equipe técnica;

f) Respeite normas de silêncio e evite distrações durante a gravação;

🚫 Outras regras importantes:

g) Não é permitido entrar com alimentos ou bebidas;

i) Celulares devem ficar desligados ou em modo silencioso;

j) Respeite o horário agendado — atrasos podem comprometer as sessões seguintes.



Lembre-se de chegar com 30 minutos de antecedência. Caso precise de auxílio com materiais (slides, vídeos), envie-os para centrodemidias@seduc.to.gov.br com 72h de antecedência.

Para mais informações, consulte as normas de uso em nosso site.
Para ver as normas completas de uso (horários, responsabilidades, termos de imagem etc.), acesse:
👉 https://centrodemidiasto.vercel.app/normasdeuso

Atenciosamente,
Centro de Mídias Educacionais – Seduc TO
Contato: centrodemidias@seduc.to.gov.br`;
        } else if (estudio === 'Estúdio 2') {
            body = `Olá ${nomeCompleto},

Seu agendamento para o Estúdio 2 do Centro de Mídias Educacionais foi aprovado! Confira abaixo orientações importantes:

📅 Data: ${dia} de ${mes}, ${ano}
🕑 Horário(s): ${times}

📅 Antes da gravação / transmissão:

a) Evite roupas verdes ou em tons semelhantes ao chroma. Também não use peças muito brilhantes, listradas ou com estampas miúdas;

b) Chegue com antecedência para ajustes técnicos e testes de áudio, vídeo e cenário;

c) Slides e materiais de apoio devem ser enviados com antecedência para análise técnica;

🧰 Durante o uso:

d) A operação de câmeras, iluminação e chroma key é feita exclusivamente pelos técnicos do CME;

e) Evite acessórios que causem reflexos ou ruídos (brincos grandes, pulseiras barulhentas etc.);

f) Maquiagem deve ser natural, sem brilho que interfira na iluminação;

🚫 Outras regras importantes:

g) Não é permitido entrar com alimentos ou bebidas no estúdio;

h) Celulares devem ficar em modo silencioso ou desligados;

i) Respeite o tempo reservado para não comprometer outras sessões.

Para acesso às normas completas de uso (envio de materiais, termos legais, restrições etc.), acesse:
👉 https://centrodemidiasto.vercel.app/normasdeuso

Atenciosamente,
Centro de Mídias Educacionais – Seduc TO
Contato: centrodemidias@seduc.to.gov.br`;
        } else { // Fallback para outros estúdios ou caso o nome esteja diferente
             body = `Olá, ${nomeCompleto}!

Seu agendamento para a gravação "${tituloGravacao}" foi confirmado.

Detalhes:
Data: ${formatarDataParaExibicao(date)}
Horário(s): ${times}
Estúdio: ${estudio}

Lembre-se de chegar com 30 minutos de antecedência. Caso precise de auxílio com materiais (slides, vídeos), envie-os para centrodemidias@seduc.to.gov.br com 72h de antecedência.

Para mais informações, consulte as normas de uso em nosso site.

Atenciosamente,
Equipe do Centro de Mídias Educacionais.`;
        }
    } else { // 'cancelamento'
        subject = 'Cancelamento de Agendamento no Estúdio do Centro de Mídias';
        body = `Olá ${nomeCompleto},

Informamos que seu agendamento para o Estúdio ${estudio}, que estava marcado para o dia ${dia} de ${mes} de ${ano}, às ${times}, foi cancelado.

Pedimos desculpas por qualquer inconveniente que isso possa causar.

Para realizar um novo agendamento, por favor, acesse nossa plataforma e verifique os horários disponíveis:
👉 https://centrodemidiasto.vercel.app/agendamento

Caso tenha alguma dúvida ou precise de mais informações, entre em contato conosco pelo e-mail: centrodemidias@seduc.to.gov.br.

Agradecemos a sua compreensão.

Atenciosamente,

Centro de Mídias Educacionais – Seduc TO
Contato: centrodemidias@seduc.to.gov.br`;
    }
    
    const params = new URLSearchParams({
        to: email,
        su: subject,
        body: body,
    });

    return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
  };


  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="space-y-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-headline">
            Painel de Controle
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground font-body">
            Gerencie os agendamentos e horários do Centro de Mídias.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-8">
            <Dialog>
                <DialogTrigger asChild>
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                        <FileText className="mr-2 h-5 w-5" />
                        Gerar Grade de Horários
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gerar Grade de Horários</DialogTitle>
                        <DialogDescription>
                            Selecione o mês e o ano para gerar uma grade de horários para impressão.
                        </DialogDescription>
                    </DialogHeader>
                    <GeradorDeGrade />
                </DialogContent>
            </Dialog>
            <Dialog>
                <DialogTrigger asChild>
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                        <Download className="mr-2 h-5 w-5" />
                        Gerar Relatório de Gravações
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gerar Relatório de Gravações</DialogTitle>
                        <DialogDescription>
                            Selecione o mês e o ano para gerar um relatório em formato .csv.
                        </DialogDescription>
                    </DialogHeader>
                    <GeradorRelatorio />
                </DialogContent>
            </Dialog>
        </div>


        <Card>
          <CardHeader>
            <CardTitle>Agendamentos Pendentes</CardTitle>
            <CardDescription>
              Aprove ou rejeite as solicitações de agendamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {carregandoPendentes ? (
                 <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
            ) : (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Estúdio</TableHead>
                    <TableHead>Horários</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reservasPendentes.length > 0 ? (
                    reservasPendentes.map((reserva) => {
                        const date = Object.keys(reserva.horariosSelecionados)[0];
                        const formattedDate = formatarDataParaExibicao(date);
                        const times = reserva.horariosSelecionados[date].join(', ');
                        return (
                        <TableRow key={reserva.id}>
                            <TableCell className="font-medium">{reserva.nomeCompleto}<br/><span className="text-xs text-muted-foreground">{reserva.email}</span></TableCell>
                            <TableCell>{formattedDate}</TableCell>
                            <TableCell><Badge variant="secondary">{reserva.estudio}</Badge></TableCell>
                            <TableCell>{times}</TableCell>
                            <TableCell>{reserva.modalidadesReserva}</TableCell>
                            <TableCell className="text-right space-x-2">
                               <Button variant="ghost" size="icon" onClick={() => abrirModalDetalhes(reserva)}>
                                <Info className="h-4 w-4" />
                               </Button>
                              <Button variant="outline" size="sm" onClick={() => handleAtualizacaoStatus(reserva.id, 'aprovado')}>Aprovar</Button>
                              <Button variant="destructive" size="sm" onClick={() => handleAtualizacaoStatus(reserva.id, 'rejeitado')}>Rejeitar</Button>
                            </TableCell>
                        </TableRow>
                        );
                    })
                    ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center">
                        Nenhum agendamento pendente.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>

        <Accordion type="single" collapsible>
            <AccordionItem value="aprovado">
                <Card>
                    <AccordionTrigger className="p-6 w-full">
                        <div className="flex justify-between items-center w-full">
                           <div className="text-left">
                                <CardTitle>Próximas Gravações</CardTitle>
                                <CardDescription>Estes são os agendamentos confirmados.</CardDescription>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent>
                            <div className="flex justify-center items-center gap-4 mb-6">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setMesAprovadas(prev => addMonths(prev, -1))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <h3 className="text-xl font-semibold text-center capitalize w-64">
                                    {format(mesAprovadas, 'MMMM, yyyy', { locale: ptBR })}
                                </h3>
                                <Button variant="outline" size="icon" onClick={() => setMesAprovadas(prev => addMonths(prev, 1))}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            {carregandoAprovados ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : reservasAprovadas && reservasAprovadas.length > 0 ? (
                                <>
                                    <div className="flex flex-col sm:flex-row gap-2 items-center mb-6 p-4 border rounded-lg bg-muted/30">
                                        <div className="flex items-center gap-3 flex-1">
                                            <Button variant="outline" size="sm" onClick={handleSelecionarTodas}>
                                                 {reservasSelecionadasParaLote.length === reservasAprovadas.length ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
                                                Selecionar Todas
                                            </Button>
                                            <span className="text-sm text-muted-foreground">{reservasSelecionadasParaLote.length} de {reservasAprovadas.length} selecionado(s)</span>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={reservasSelecionadasParaLote.length === 0}
                                            onClick={() => setConfirmandoCancelamentoLote(true)}
                                            >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Cancelar Selecionados
                                        </Button>
                                    </div>
                                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-6">
                                        {reservasAprovadas.map((reserva) => {
                                            const date = Object.keys(reserva.horariosSelecionados)[0];
                                            const formattedDate = formatarDataParaExibicao(date);
                                            const times = reserva.horariosSelecionados[date].join(', ');
                                            const calendarLink = criarLinkGoogleAgenda(reserva);
                                            const organization = reserva.tipoOrgao === 'interno' ? reserva.departamento : reserva.organizacaoExterna;
                                            const cardTitle = reserva.tituloGravacao || reserva.nomeCompleto;
                                            const isSelected = reservasSelecionadasParaLote.includes(reserva.id);

                                            return (
                                                <Card key={reserva.id} className={`flex flex-col relative ${isSelected ? 'border-primary ring-2 ring-primary' : ''}`}>
                                                    <div className="absolute top-2 right-2">
                                                        <Checkbox
                                                            id={`select-${reserva.id}`}
                                                            checked={isSelected}
                                                            onCheckedChange={() => handleSelecaoLote(reserva.id)}
                                                            aria-label={`Selecionar reserva de ${reserva.nomeCompleto}`}
                                                        />
                                                    </div>
                                                    <CardHeader className="pb-4">
                                                        <div className="flex justify-between items-start">
                                                            <CardTitle className="text-xl font-headline pr-8">{cardTitle}</CardTitle>
                                                            <Badge variant="outline">{reserva.estudio}</Badge>
                                                        </div>
                                                        <CardDescription>{reserva.nomeCompleto} - {organization}</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="flex-grow space-y-2 text-sm">
                                                        <p><strong>Data:</strong> {formattedDate}</p>
                                                        <p><strong>Horários:</strong> {times}</p>
                                                        <p><strong>Modalidade:</strong> {reserva.modalidadesReserva}</p>
                                                    </CardContent>
                                                    <CardFooter className="flex-col items-start gap-3">
                                                        <div className='flex gap-2 w-full'>
                                                            <Button variant="outline" className="flex-1" onClick={() => abrirModalDetalhes(reserva)}>
                                                                <Info className="mr-2 h-4 w-4" /> Ver
                                                            </Button>
                                                            <Button variant="destructive" className="flex-1" onClick={() => setReservaParaCancelar(reserva)}>
                                                                <XCircle className="mr-2 h-4 w-4" /> Cancelar
                                                            </Button>
                                                        </div>
                                                        <div className='flex gap-2 w-full'>
                                                            <Button asChild variant="secondary" size="sm" className="flex-1">
                                                                <Link href={calendarLink} target="_blank" rel="noopener noreferrer">
                                                                    <CalendarPlus className="mr-2 h-4 w-4" />
                                                                    Agenda
                                                                </Link>
                                                            </Button>
                                                            <DropdownMenu>
                                                              <DropdownMenuTrigger asChild>
                                                                <Button variant="secondary" size="sm" className="flex-1">
                                                                    <Mail className="mr-2 h-4 w-4" /> E-mail
                                                                </Button>
                                                              </DropdownMenuTrigger>
                                                              <DropdownMenuContent align="end">
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={criarLinkEmail(reserva, 'confirmacao')} target="_blank">E-mail de Confirmação</Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={criarLinkEmail(reserva, 'cancelamento')} target="_blank">E-mail de Cancelamento</Link>
                                                                </DropdownMenuItem>
                                                              </DropdownMenuContent>
                                                            </DropdownMenu>
                                                            <Button variant="secondary" size="sm" className="flex-1" onClick={() => abrirModalEdicao(reserva)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Alterar
                                                            </Button>
                                                        </div>
                                                    </CardFooter>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">Nenhuma gravação confirmada para este período.</p>
                            )}
                        </CardContent>
                    </AccordionContent>
                </Card>
            </AccordionItem>
            <AccordionItem value="block-slots">
                 <Card>
                    <AccordionTrigger className="p-6">
                       <div className="text-left">
                            <CardTitle>Bloquear Horários</CardTitle>
                            <CardDescription>Selecione os horários no calendário abaixo para bloquear ou desbloquear manualmente.</CardDescription>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent>
                           {carregandoBloqueio ? (
                                 <div className="flex items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                 </div>
                            ) : dadosBloqueio ? (
                                <FormularioBloqueioHorarios 
                                    reservasIniciais={dadosBloqueio.reserved}
                                    bloqueiosManuaisIniciais={dadosBloqueio.manual}
                                />
                            ) : (
                                <div className="text-center text-muted-foreground py-8">Clique para carregar o calendário.</div>
                            )}
                        </CardContent>
                    </AccordionContent>
                </Card>
            </AccordionItem>
            
            <AccordionItem value="my-profile">
                <Card>
                    <AccordionTrigger className="p-6">
                        <div className="flex items-center gap-3">
                            <UserCircle className="h-6 w-6" />
                            <div className="text-left">
                                <CardTitle>Meu Perfil</CardTitle>
                                <CardDescription>Altere seu nome e senha.</CardDescription>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent>
                            <GerenciadorPerfil usuario={usuario} />
                        </CardContent>
                    </AccordionContent>
                </Card>
            </AccordionItem>
            
            {podeGerenciarUsuarios && (
              <AccordionItem value="manage-users">
                  <Card>
                      <AccordionTrigger className="p-6">
                          <div className="flex items-center gap-3">
                              <UserCog className="h-6 w-6" />
                              <div className="text-left">
                                  <CardTitle>Gerenciar Usuários</CardTitle>
                                  <CardDescription>Adicione, remova e gerencie os usuários do sistema.</CardDescription>
                              </div>
                          </div>
                      </AccordionTrigger>
                      <AccordionContent>
                          <CardContent>
                              <GerenciadorUsuarios />
                          </CardContent>
                      </AccordionContent>
                  </Card>
              </AccordionItem>
            )}
        </Accordion>
      </div>
      
       <Dialog open={modalAberto} onOpenChange={(isOpen) => !isOpen && fecharModal()}>
            <DialogContent className="sm:max-w-[800px]">
                {reservaSelecionada && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="font-headline">Detalhes do Agendamento</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4 text-sm max-h-[70vh] overflow-y-auto pr-4">
                            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                <span className="font-semibold text-right">Título:</span>
                                <span>{reservaSelecionada.tituloGravacao || reservaSelecionada.nomeCompleto}</span>
                            </div>
                            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                <span className="font-semibold text-right">Estúdio:</span>
                                <Badge variant="default">{reservaSelecionada.estudio}</Badge>
                            </div>
                            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                <span className="font-semibold text-right">Solicitante:</span>
                                <span>{reservaSelecionada.nomeCompleto}</span>
                            </div>
                            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                <span className="font-semibold text-right">E-mail:</span>
                                <span>{reservaSelecionada.email}</span>
                            </div>
                            {reservaSelecionada.telefone && (
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <span className="font-semibold text-right">Telefone:</span>
                                    <span>{reservaSelecionada.telefone}</span>
                                </div>
                            )}
                            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                <span className="font-semibold text-right">Data da Solicitação:</span>
                                <span>{formatarTimestamp(reservaSelecionada.criadoEm)}</span>
                            </div>
                            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                <span className="font-semibold text-right">Data da Gravação:</span>
                                <span>{formatarDataParaExibicao(Object.keys(reservaSelecionada.horariosSelecionados)[0])}</span>
                            </div>
                            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                <span className="font-semibold text-right">Horários:</span>
                                <span>{Object.values(reservaSelecionada.horariosSelecionados)[0].join(', ')}</span>
                            </div>
                            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                <span className="font-semibold text-right">Órgão:</span>
                                <span>{reservaSelecionada.tipoOrgao === 'interno' ? 'Interno (SEDUC)' : 'Externo'}</span>
                            </div>
                            {reservaSelecionada.departamento && (
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <span className="font-semibold text-right">Departamento:</span>
                                    <span>{reservaSelecionada.departamento}</span>
                                </div>
                            )}
                            {reservaSelecionada.organizacaoExterna && (
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <span className="font-semibold text-right">Órgão Externo:</span>
                                    <span>{reservaSelecionada.organizacaoExterna}</span>
                                </div>
                            )}
                            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                <span className="font-semibold text-right">Modalidade:</span>
                                <span>{reservaSelecionada.modalidadesReserva}</span>
                            </div>
                            {reservaSelecionada.numeroParticipantes && (
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <span className="font-semibold text-right">Participantes:</span>
                                    <span>{reservaSelecionada.numeroParticipantes}</span>
                                </div>
                            )}
                            {reservaSelecionada.numeroMesas !== undefined && (
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <span className="font-semibold text-right">Mesas:</span>
                                    <span>{reservaSelecionada.numeroMesas}</span>
                                </div>
                            )}
                            {reservaSelecionada.numeroCadeiras !== undefined && (
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <span className="font-semibold text-right">Cadeiras:</span>
                                    <span>{reservaSelecionada.numeroCadeiras}</span>
                                </div>
                            )}
                            {reservaSelecionada.materiaisNecessarios && (
                                <div className="grid grid-cols-[150px_1fr] items-start gap-4">
                                    <span className="font-semibold text-right">Materiais:</span>
                                    <span className="break-words">{reservaSelecionada.materiaisNecessarios}</span>
                                </div>
                            )}

                             {(reservaSelecionada.aprovadoPor || reservaSelecionada.ultimaAlteracaoPor) && (
                                <>
                                    <Separator className="my-4" />
                                     <div className="flex items-center gap-2 text-muted-foreground">
                                        <History className="h-4 w-4" />
                                        <h3 className="font-semibold text-base text-card-foreground">Histórico de Alterações</h3>
                                    </div>
                                </>
                             )}

                            {reservaSelecionada.aprovadoPor && (
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <span className="font-semibold text-right text-green-600">Aprovado por:</span>
                                    <span>{reservaSelecionada.aprovadoPor}</span>
                                </div>
                            )}
                            {reservaSelecionada.ultimaAlteracaoPor && (
                                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                                    <span className="font-semibold text-right text-blue-600">Alterado por:</span>
                                    <span>{reservaSelecionada.ultimaAlteracaoPor}</span>
                                </div>
                            )}
                            
                            {reservaSelecionada.historico && reservaSelecionada.historico.length > 0 && (
                                 <div className="grid grid-cols-[150px_1fr] items-start gap-4">
                                    <span className="font-semibold text-right pt-2">Registro:</span>
                                    <div className="text-xs space-y-2 text-muted-foreground border rounded-md p-2 bg-muted/50">
                                        {[...reservaSelecionada.historico].reverse().map((item, index) => (
                                            <p key={index}>
                                               <span className="font-semibold">{item.acao}</span> por <span className="font-semibold">{item.usuario}</span> em {formatarTimestamp(item.data)}.
                                            </p>
                                        ))}
                                    </div>
                                 </div>
                            )}
                        </div>
                    </>
                )}
                {editandoReserva && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="font-headline">Alterar Agendamento</DialogTitle>
                            <DialogDescription>
                                Faça as alterações necessárias e clique em salvar. A disponibilidade de horários será verificada.
                            </DialogDescription>
                        </DialogHeader>
                        <FormularioEdicaoReserva
                            reserva={editandoReserva}
                            reservasExistentes={dadosBloqueio?.reserved || []}
                            bloqueiosManuais={dadosBloqueio?.manual || []}
                            onSuccess={onSucessoEdicao}
                            adminUser={usuario}
                        />
                    </>
                )}
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!reservaParaCancelar} onOpenChange={(isOpen) => !isOpen && setReservaParaCancelar(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive"/>
                    Confirmar Cancelamento
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Você tem certeza que deseja cancelar o agendamento de <span className="font-bold">{reservaParaCancelar?.nomeCompleto}</span> para o dia <span className="font-bold">{reservaParaCancelar && formatarDataParaExibicao(reservaParaCancelar.dataReserva)}</span>? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Textarea 
                      placeholder="Digite o motivo do cancelamento aqui..."
                      value={motivoCancelamento}
                      onChange={(e) => setMotivoCancelamento(e.target.value)}
                    />
                     {reservaParaCancelar && (
                        <div className="mt-4">
                            <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button variant="secondary" className="w-full">
                                     <Mail className="mr-2 h-4 w-4" /> Notificar usuário por e-mail
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end" className="w-64">
                                 <DropdownMenuItem asChild>
                                     <Link href={criarLinkEmail(reservaParaCancelar, 'confirmacao')} target="_blank">E-mail de Confirmação</Link>
                                 </DropdownMenuItem>
                                 <DropdownMenuItem asChild>
                                     <Link href={criarLinkEmail(reservaParaCancelar, 'cancelamento')} target="_blank">E-mail de Cancelamento</Link>
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                        </div>
                    )}
                </div>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { setReservaParaCancelar(null); setMotivoCancelamento(""); }}>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmarCancelamento} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    Sim, cancelar
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmandoCancelamentoLote} onOpenChange={setConfirmandoCancelamentoLote}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive"/>
                    Confirmar Cancelamento em Lote
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Você tem certeza que deseja cancelar <span className="font-bold">{reservasSelecionadasParaLote.length} agendamento(s)</span>? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
                </AlertDialogHeader>
                 <div className="py-4">
                    <Textarea 
                      placeholder="Digite o motivo do cancelamento aqui..."
                      value={motivoCancelamento}
                      onChange={(e) => setMotivoCancelamento(e.target.value)}
                    />
                </div>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { setConfirmandoCancelamentoLote(false); setMotivoCancelamento(""); }}>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmarCancelamentoLote} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    Sim, cancelar selecionados
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
