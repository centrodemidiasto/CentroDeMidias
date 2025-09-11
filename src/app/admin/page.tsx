

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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Loader2, Info, XCircle, CalendarPlus, Pencil, AlertTriangle, UserCog, History, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfToday, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FormularioBloqueioHorarios from '@/components/formulario-bloqueio-horarios';
import { atualizarStatusReserva } from '@/app/actions';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import FormularioEdicaoReserva from '@/components/formulario-edicao-reserva';
import { Reserva, ReservaExistente } from '@/lib/types';
import { BloqueioManual } from '@/components/formulario-bloqueio-horarios';
import GerenciadorUsuarios from '@/components/gerenciador-usuarios';
import GerenciadorPerfil from '@/components/gerenciador-perfil';
import { Separator } from '@/components/ui/separator';

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

async function getReservasAprovadas(): Promise<Reserva[]> {
  const hoje = format(startOfToday(), 'yyyy-MM-dd');
  const reservasRef = collection(clientDb, "reservas");

  const q = query(
    reservasRef,
    where("status", "==", "aprovado"),
    where("dataReserva", ">=", hoje),
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
    if (reservasAprovadas && !force) return; 
    setCarregandoAprovados(true);
    getReservasAprovadas().then(data => {
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

  const handleMudancaAccordion = (value: string) => {
    if (value === "aprovado" && !reservasAprovadas) {
      buscarReservasAprovadas();
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

    try {
        const adminUser = { nome: usuario.displayName || usuario.email, email: usuario.email };
        await atualizarStatusReserva(reservaParaCancelar.id, 'rejeitado', adminUser);
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
    }
  }

  const handleAtualizacaoStatus = async (id: string, status: 'aprovado' | 'rejeitado') => {
    if (!usuario) return;
    try {
        const adminUser = { nome: usuario.displayName || usuario.email, email: usuario.email };
        await atualizarStatusReserva(id, status, adminUser);
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
    }
  }

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
        return format(date, "dd 'de' MMMM, yyyy", { locale: ptBR });
      } catch (error) {
        return "Data inválida";
      }
  };

   const formatarTimestamp = (ts: any) => {
    if (!ts) return 'Data indisponível';
    const date = ts.toDate();
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
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
                              <Button variant="destructive" size="sm" onClick={() => setReservaParaCancelar(reserva)}>Rejeitar</Button>
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

        <Accordion type="single" collapsible onValueChange={handleMudancaAccordion}>
            <AccordionItem value="aprovado">
                <Card>
                    <AccordionTrigger className="p-6">
                        <div className="text-left">
                            <CardTitle>Próximas Gravações</CardTitle>
                            <CardDescription>Estes são os agendamentos confirmados para os próximos dias.</CardDescription>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent>
                            {carregandoAprovados ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : reservasAprovadas && reservasAprovadas.length > 0 ? (
                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-6">
                                    {reservasAprovadas.map((reserva) => {
                                        const date = Object.keys(reserva.horariosSelecionados)[0];
                                        const formattedDate = formatarDataParaExibicao(date);
                                        const times = reserva.horariosSelecionados[date].join(', ');
                                        const calendarLink = criarLinkGoogleAgenda(reserva);
                                        const organization = reserva.tipoOrgao === 'interno' ? reserva.departamento : reserva.organizacaoExterna;
                                        const cardTitle = reserva.tituloGravacao || reserva.nomeCompleto;

                                        return (
                                            <Card key={reserva.id} className="flex flex-col">
                                                <CardHeader className="pb-4">
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle className="text-xl font-headline">{cardTitle}</CardTitle>
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
                                                        <Button variant="outline" className="w-full" onClick={() => abrirModalDetalhes(reserva)}>
                                                            <Info className="mr-2 h-4 w-4" /> Ver
                                                        </Button>
                                                        <Button variant="destructive" className="w-full" onClick={() => setReservaParaCancelar(reserva)}>
                                                            <XCircle className="mr-2 h-4 w-4" /> Cancelar
                                                        </Button>
                                                    </div>
                                                    <div className='flex gap-2 w-full'>
                                                        <Button asChild variant="secondary" size="sm" className="flex-1">
                                                            <Link href={calendarLink} target="_blank" rel="noopener noreferrer">
                                                                <CalendarPlus className="mr-2 h-4 w-4" />
                                                                Google Agenda
                                                            </Link>
                                                        </Button>
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
                            ) : (
                                <p className="text-center text-muted-foreground py-8">Nenhuma gravação confirmada para os próximos dias.</p>
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
                                <span className="font-semibold text-right">Data:</span>
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
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setReservaParaCancelar(null)}>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmarCancelamento} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    Sim, cancelar
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
