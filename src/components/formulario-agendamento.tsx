
'use client';

import { useState, useMemo, useEffect } from "react";
import {
  addDays,
  format,
  startOfWeek,
  eachDayOfInterval,
  isBefore,
  startOfToday,
  addWeeks,
  isAfter,
  isMonday,
  nextMonday,
  previousMonday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2, Info, CalendarX2, CalendarPlus, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import FormularioReservaAdmin from "./formulario-reserva-admin";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import LegendaCalendario from "./legenda-calendario";
import FormularioAgendamentoEspecial from "./formulario-agendamento-especial";
import FormularioAgendamentoRecorrente from "./formulario-agendamento-recorrente";
import { Reserva, BloqueioManual, ReservaExistente } from "@/lib/types";
import FormularioAgendamentoUsuario from "./formulario-agendamento-usuario";

export type { BloqueioManual, ReservaExistente };

export type HorariosSelecionados = {
  [key: string]: string[];
};

export const SLOTS_DE_TEMPO = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const DIAS_MIN_ANTECEDENCIA = 7;
const MAX_SEMANAS_ANTECEDENCIA = 8;
const ESTUDIOS = ["Estúdio 1", "Estúdio 2"];

async function getReservasExistentes(): Promise<ReservaExistente[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('reservas')
    .select('id, horarios_selecionados, status, estudio')
    .in('status', ['pendente', 'aprovado']);

  if (error) throw error;

  const slotsReservados: ReservaExistente[] = [];
  (data || []).forEach((row: any) => {
    const horarios = row.horarios_selecionados as Record<string, string[]>;
    for (const data in horarios) {
      slotsReservados.push({ id: row.id, data, horarios: horarios[data], status: row.status, estudio: row.estudio });
    }
  });
  return slotsReservados;
}

async function getBloqueiosManuais(): Promise<BloqueioManual[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('horarios_bloqueados').select('id, data, horarios, estudio');
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: row.id, data: row.data, horarios: row.horarios, estudio: row.estudio }));
}

const getHorarioQuebradoAnterior = (horario: string): string => {
    const [h] = horario.split(':').map(Number);
    return `${String(h).padStart(2, '0')}:30`;
};

const getHorarioQuebradoPosterior = (horario: string): string => {
    const [h] = horario.split(':').map(Number);
    const horaAnterior = h - 1;
    return `${String(horaAnterior).padStart(2, '0')}:30`;
};


export default function FormularioAgendamento() {
  const hoje = startOfToday();
  const primeiraDataAgendavelInicial = addDays(hoje, DIAS_MIN_ANTECEDENCIA);
  const ultimaDataAgendavel = addWeeks(hoje, MAX_SEMANAS_ANTECEDENCIA);

  const [dataAtual, setDataAtual] = useState(primeiraDataAgendavelInicial);
  const [horariosSelecionados, setHorariosSelecionados] = useState<HorariosSelecionados>({});
  const [estudioSelecionado, setEstudioSelecionado] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [reservasExistentes, setReservasExistentes] = useState<ReservaExistente[]>([]);
  const [bloqueiosManuais, setBloqueiosManuais] = useState<BloqueioManual[]>([]);
  const [carregandoReservas, setCarregandoReservas] = useState(true);
  const [usuario, setUsuario] = useState<User | null>(null);
  const [clienteRenderizou, setClienteRenderizou] = useState(false);
  const [modalEspecialAberto, setModalEspecialAberto] = useState(false);
  const [modalRecorrenteAberto, setModalRecorrenteAberto] = useState(false);

  const { toast } = useToast();
  
  useEffect(() => {
    setClienteRenderizou(true);
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const primeiraDataAgendavel = usuario ? hoje : primeiraDataAgendavelInicial;

  useEffect(() => {
    if (usuario && isBefore(dataAtual, hoje)) {
        setDataAtual(hoje);
    } else if (!usuario && isBefore(dataAtual, primeiraDataAgendavelInicial)) {
        setDataAtual(primeiraDataAgendavelInicial);
    }
  }, [usuario, dataAtual, hoje, primeiraDataAgendavelInicial]);
  
  const buscarTodasReservas = () => {
    setCarregandoReservas(true);
    Promise.all([getReservasExistentes(), getBloqueiosManuais()]).then(([reservas, bloqueios]) => {
        setReservasExistentes(reservas);
        setBloqueiosManuais(bloqueios);
        setCarregandoReservas(false);
    });
  }

  useEffect(() => {
    buscarTodasReservas();
  }, []);

  const diasDaSemana = useMemo(() => {
    let inicioDaSemana = startOfWeek(dataAtual, { weekStartsOn: 1 });
    if (!isMonday(inicioDaSemana)) {
        inicioDaSemana = isBefore(inicioDaSemana, dataAtual) ? nextMonday(inicioDaSemana) : previousMonday(inicioDaSemana);
    }
    return eachDayOfInterval({ start: inicioDaSemana, end: addDays(inicioDaSemana, 4) });
  }, [dataAtual]);
  
  const desabilitarBtnSemanaAnterior = useMemo(() => {
    if (!clienteRenderizou) return true;
    const primeiraDataVisivel = diasDaSemana[0];
    const primeiroDiaPermitido = startOfWeek(primeiraDataAgendavel, { weekStartsOn: 1 });
    return isBefore(primeiraDataVisivel, primeiroDiaPermitido);
  }, [diasDaSemana, primeiraDataAgendavel, clienteRenderizou]);


  const desabilitarBtnProximaSemana = useMemo(() => {
    const ultimaDataVisivel = diasDaSemana[diasDaSemana.length - 1];
    return isAfter(ultimaDataVisivel, ultimaDataAgendavel);
  }, [diasDaSemana, ultimaDataAgendavel]);

  
  const calendarioForaDoIntervalo = useMemo(() => {
     const primeiraDataVisivel = diasDaSemana[0];
     return isAfter(primeiraDataVisivel, ultimaDataAgendavel);
  }, [diasDaSemana, ultimaDataAgendavel]);


  const handleSelecaoHorario = (dia: Date, horario: string, estudio: string) => {
    const chaveData = format(dia, "yyyy-MM-dd");
    const diasSelecionados = Object.keys(horariosSelecionados).filter(
      (chave) => horariosSelecionados[chave].length > 0
    );
  
    if (diasSelecionados.length > 0 && !diasSelecionados.includes(chaveData)) {
      toast({
        title: "Atenção",
        description: "Você só pode selecionar horários para um único dia.",
        variant: "destructive",
      });
      return;
    }

    if (estudioSelecionado && estudioSelecionado !== estudio) {
        toast({
            title: "Atenção",
            description: "Você só pode selecionar horários para um único estúdio por vez.",
            variant: "destructive",
        });
        return;
    }
  
    setHorariosSelecionados((prev) => {
      const horariosDoDia = prev[chaveData] ? [...prev[chaveData]] : [];
      if (horariosDoDia.includes(horario)) {
        const novosHorariosDia = horariosDoDia.filter((h) => h !== horario);
        const novosHorarios = { ...prev, [chaveData]: novosHorariosDia };
        if (novosHorariosDia.length === 0) {
          delete novosHorarios[chaveData];
          setEstudioSelecionado(null);
        }
        return novosHorarios;
      } else {
        setEstudioSelecionado(estudio);
        return { ...prev, [chaveData]: [...horariosDoDia, horario] };
      }
    });
  };

  const mudarSemana = (quantidade: number) => {
    setDataAtual(prev => addDays(prev, quantidade * 7));
  };
  
  const totalHorariosSelecionados = Object.values(horariosSelecionados).reduce((acc, curr) => acc + curr.length, 0);
  
  const onSucessoReserva = () => {
    setHorariosSelecionados({});
    setEstudioSelecionado(null);
    setModalAberto(false);
    setModalEspecialAberto(false);
    setModalRecorrenteAberto(false);
    buscarTodasReservas();
  }


  return (
    <Card>
      {usuario && (
         <div className="p-4 border-b space-y-4">
            <Alert variant="default" className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="font-headline text-primary">Modo de Agendamento Simplificado</AlertTitle>
                <AlertDescription>
                    Você está autenticado com uma conta do Centro de Mídias. Os agendamentos realizados serão aprovados automaticamente e usarão um formulário simplificado.
                </AlertDescription>
            </Alert>
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                    <Dialog open={modalEspecialAberto} onOpenChange={setModalEspecialAberto}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                               <CalendarPlus className="mr-2 h-4 w-4" /> Agendamento Especial
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Agendamento Especial</DialogTitle>
                                <DialogDescription>
                                    Selecione o horário de início. Cada agendamento tem a duração de 60 minutos.
                                </DialogDescription>
                            </DialogHeader>
                            <FormularioAgendamentoEspecial
                               reservasExistentes={reservasExistentes}
                               bloqueiosManuais={bloqueiosManuais}
                               onSucessoReserva={onSucessoReserva}
                            />
                        </DialogContent>
                    </Dialog>
                    <p className="text-xs text-muted-foreground text-center">Permite agendar em qualquer data ou horário, sem as restrições normais.</p>
                </div>

                <div className="flex-1 space-y-2">
                    <Dialog open={modalRecorrenteAberto} onOpenChange={setModalRecorrenteAberto}>
                        <DialogTrigger asChild>
                             <Button variant="outline" className="w-full">
                                <Repeat className="mr-2 h-4 w-4" /> Agendamento Recorrente
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-4xl">
                             <DialogHeader>
                                <DialogTitle>Agendamento Recorrente</DialogTitle>
                            </DialogHeader>
                            <FormularioAgendamentoRecorrente
                               reservasExistentes={reservasExistentes}
                               bloqueiosManuais={bloqueiosManuais}
                               onSucessoReserva={onSucessoReserva}
                            />
                        </DialogContent>
                    </Dialog>
                    <p className="text-xs text-muted-foreground text-center">Permite agendar o mesmo horário para várias datas de uma só vez.</p>
                </div>
            </div>
         </div>
      )}
      <CardHeader>
        <div className="flex justify-between items-center">
          <Button variant="outline" size="icon" onClick={() => mudarSemana(-1)} disabled={desabilitarBtnSemanaAnterior}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold text-center font-headline">
            {format(diasDaSemana[0], "d 'de' MMMM", { locale: ptBR })} - {format(diasDaSemana[diasDaSemana.length - 1], "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => mudarSemana(1)} disabled={desabilitarBtnProximaSemana}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
       <TooltipProvider delayDuration={100}>
        <CardContent>
        {carregandoReservas || !clienteRenderizou ? (
          <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : calendarioForaDoIntervalo ? (
           <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground bg-muted/50 rounded-lg p-4">
                <CalendarX2 className="w-12 h-12 mb-4"/>
                <h3 className="font-bold text-lg">Indisponível</h3>
                <p className="text-sm max-w-xs">Não é possível realizar agendamentos com mais de {MAX_SEMANAS_ANTECEDENCIA} semanas de antecedência.</p>
           </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-border overflow-hidden rounded-lg border">
            {diasDaSemana.map(dia => {
                let diaDesabilitado = isBefore(dia, primeiraDataAgendavel);
                if (usuario) {
                   diaDesabilitado = isBefore(dia, hoje);
                }
                const chaveDataParaReserva = format(dia, "yyyy-MM-dd");
                
                return (
                <div key={dia.toString()} className={cn("flex flex-col", diaDesabilitado ? "bg-muted" : "bg-background")}>
                <div className="text-center font-bold py-2 border-b font-headline capitalize">
                    {format(dia, "EEE", { locale: ptBR })}
                    <div className="font-normal text-sm text-muted-foreground">{format(dia, "d/MM")}</div>
                </div>
                <div className="text-center text-xs py-1 border-b grid grid-cols-2 gap-px">
                    <div className="bg-background">Estúdio 1</div>
                    <div className="bg-background">Estúdio 2</div>
                </div>

                <div className="flex flex-col p-1 gap-1">
                    {SLOTS_DE_TEMPO.map(horario => (
                        <div key={horario} className="grid grid-cols-2 gap-1">
                            {ESTUDIOS.map(estudio => {
                                const chaveData = format(dia, "yyyy-MM-dd");
                                const estaSelecionado = horariosSelecionados[chaveData]?.includes(horario) && estudioSelecionado === estudio;
                                
                                const horarioQuebradoAntes = getHorarioQuebradoPosterior(horario); // Ex: 11:30 para o slot das 12:00
                                const horarioQuebradoDepois = getHorarioQuebradoAnterior(horario); // Ex: 12:30 para o slot das 12:00

                                const slotReservado = reservasExistentes.find(r => 
                                    r.data === chaveDataParaReserva && 
                                    r.estudio === estudio &&
                                    (r.horarios.includes(horario) || r.horarios.includes(horarioQuebradoAntes) || r.horarios.includes(horarioQuebradoDepois))
                                );

                                const bloqueadoManualmente = bloqueiosManuais.find(b => 
                                    b.data === chaveDataParaReserva && 
                                    b.estudio === estudio &&
                                    (b.horarios.includes(horario) || b.horarios.includes(horarioQuebradoAntes) || b.horarios.includes(horarioQuebradoDepois))
                                );


                                if (diaDesabilitado) {
                                return ( <Button key={estudio} variant="outline" className="h-8 w-full text-xs bg-muted cursor-not-allowed" disabled> {horario} </Button> );
                                }
                                
                                if (!usuario) {
                                    if (bloqueadoManualmente || (slotReservado && slotReservado.status === 'aprovado')) {
                                    return ( <Button key={estudio} variant="outline" className="h-8 w-full text-xs bg-muted cursor-not-allowed" disabled> {horario} </Button> );
                                    }
                                    if (slotReservado && slotReservado.status === 'pendente') {
                                        return (
                                            <Tooltip key={estudio}>
                                            <TooltipTrigger asChild>
                                                <span tabIndex={0} className="w-full">
                                                    <Button variant="outline" className="h-8 w-full text-xs bg-accent/80 hover:bg-accent/80 text-accent-foreground cursor-not-allowed" disabled> {horario} </Button>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Aguardando Aprovação</p></TooltipContent>
                                            </Tooltip>
                                        );
                                    }
                                }

                                if (usuario && (bloqueadoManualmente || slotReservado)) {
                                    const estaPendente = slotReservado?.status === 'pendente';
                                    const estaAprovado = slotReservado?.status === 'aprovado';
                                    const estaBloqueado = bloqueadoManualmente;

                                    let tooltipContent = "";
                                    let buttonColorClass = "";

                                    if (estaPendente) {
                                        tooltipContent = "Agendamento pendente";
                                        buttonColorClass = "bg-accent/80 hover:bg-accent/80 text-accent-foreground cursor-not-allowed";
                                    } else if (estaAprovado) {
                                        tooltipContent = "Horário confirmado";
                                        buttonColorClass = "bg-green-400 hover:bg-green-400 text-green-900 cursor-not-allowed";
                                    } else if (estaBloqueado) {
                                        return ( <Button key={estudio} variant="outline" className="h-8 w-full text-xs bg-muted cursor-not-allowed" disabled> {horario} </Button> );
                                    }

                                    return (
                                        <div key={estudio}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span tabIndex={0} className="w-full">
                                                        <Button variant="outline" className={cn("h-8 w-full text-xs", buttonColorClass)} disabled> {horario} </Button>
                                                    </span>
                                                </TooltipTrigger>
                                                {tooltipContent && ( <TooltipContent><p>{tooltipContent}</p></TooltipContent> )}
                                            </Tooltip>
                                        </div>
                                    )
                                }
                            
                                return (
                                    <Button
                                        key={estudio}
                                        type="button"
                                        variant={estaSelecionado ? "default" : "outline"}
                                        className={cn("h-8 text-xs", estaSelecionado && "bg-primary hover:bg-primary/90")}
                                        onClick={() => handleSelecaoHorario(dia, horario, estudio)}
                                        disabled={diaDesabilitado}
                                    >
                                    {horario}
                                    </Button>
                                );
                            })}
                        </div>
                    ))}
                </div>
                </div>
            )})}
            </div>
        )}
        </CardContent>
        <LegendaCalendario />
      </TooltipProvider>
      {totalHorariosSelecionados > 0 && (
        <CardFooter className="flex-col items-start gap-4 pt-4">
           <div className="text-sm text-muted-foreground">
            {totalHorariosSelecionados} horário(s) selecionado(s) para o <span className="font-bold">{estudioSelecionado}</span>.
          </div>
          <Dialog open={modalAberto} onOpenChange={setModalAberto}>
            <DialogTrigger asChild>
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                Continuar Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
                {usuario ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="font-headline">Agendamento Simplificado</DialogTitle>
                            <DialogDescription>Agendamento para o {estudioSelecionado}.</DialogDescription>
                        </DialogHeader>
                        <FormularioReservaAdmin horariosSelecionados={horariosSelecionados} estudio={estudioSelecionado!} onSucessoReserva={onSucessoReserva}/>
                    </>
                ) : (
                    <FormularioAgendamentoUsuario 
                        horariosSelecionados={horariosSelecionados} 
                        estudio={estudioSelecionado!} 
                        onSucessoReserva={onSucessoReserva}
                    />
                )}
            </DialogContent>
          </Dialog>
        </CardFooter>
      )}
    </Card>
  );
}
