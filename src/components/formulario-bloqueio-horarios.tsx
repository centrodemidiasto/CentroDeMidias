
'use client';

import { useState, useMemo } from "react";
import {
  addDays,
  format,
  startOfWeek,
  eachDayOfInterval,
  isBefore,
  startOfToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db as clientDb } from "@/lib/firebase";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import LegendaCalendarioAdmin from "./legenda-calendario-admin";

type HorariosSelecionados = {
  [key: string]: string[];
};

export type ReservaExistente = {
    data: string;
    horarios: string[];
    status: 'pendente' | 'aprovado';
}

export type BloqueioManual = {
    id: string; 
    data: string;
    horarios: string[];
}

interface FormularioBloqueioHorariosProps {
    reservasIniciais: ReservaExistente[];
    bloqueiosManuaisIniciais: BloqueioManual[];
}


const SLOTS_DE_TEMPO = Array.from({ length: 9 }, (_, i) => `${String(i + 9).padStart(2, "0")}:00`);


export default function FormularioBloqueioHorarios({ reservasIniciais, bloqueiosManuaisIniciais }: FormularioBloqueioHorariosProps) {
  const hoje = startOfToday();
  const [dataAtual, setDataAtual] = useState(new Date());
  const [horariosSelecionados, setHorariosSelecionados] = useState<HorariosSelecionados>({});
  const [reservasExistentes] = useState<ReservaExistente[]>(reservasIniciais);
  const [bloqueiosManuais, setBloqueiosManuais] = useState<BloqueioManual[]>(bloqueiosManuaisIniciais);
  const [enviando, setEnviando] = useState(false);

  const { toast } = useToast();
  
  const buscarBloqueiosManuais = async () => {
    const bloqueiosRef = collection(clientDb, "horariosBloqueados");
    const querySnapshot = await getDocs(bloqueiosRef);
    const novosBloqueios = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as BloqueioManual);
    setBloqueiosManuais(novosBloqueios);
  }

  const diasDaSemana = useMemo(() => {
    const inicio = startOfWeek(dataAtual, { locale: ptBR });
    return eachDayOfInterval({ start: inicio, end: addDays(inicio, 4) });
  }, [dataAtual]);

  const desabilitarBtnSemanaAnterior = useMemo(() => {
    const primeiroDiaSemanaAtual = startOfWeek(dataAtual, { locale: ptBR });
    const ultimoDiaSemanaAnterior = addDays(primeiroDiaSemanaAtual, -1);
    return isBefore(ultimoDiaSemanaAnterior, hoje);
  }, [dataAtual, hoje]);

  const handleSelecaoHorario = (dia: Date, horario: string) => {
    const chaveData = format(dia, "yyyy-MM-dd");
  
    setHorariosSelecionados((prev) => {
      const horariosDoDia = prev[chaveData] ? [...prev[chaveData]] : [];
      if (horariosDoDia.includes(horario)) {
        const novosHorariosDoDia = horariosDoDia.filter((t) => t !== horario);
        const novosHorarios = { ...prev, [chaveData]: novosHorariosDoDia };
        if (novosHorariosDoDia.length === 0) {
          delete novosHorarios[chaveData];
        }
        return novosHorarios;
      } else {
        return { ...prev, [chaveData]: [...horariosDoDia, horario] };
      }
    });
  };

  const mudarSemana = (quantidade: number) => {
    setDataAtual(prev => addDays(prev, quantidade * 7));
  };

  const totalHorariosSelecionados = Object.values(horariosSelecionados).reduce((acc, curr) => acc + curr.length, 0);

  const handleSalvarMudancas = async () => {
    setEnviando(true);
    try {
      const batch = writeBatch(clientDb);
      const bloqueiosRef = collection(clientDb, 'horariosBloqueados');
      
      const mudancasPorData: Record<string, { paraBloquear: string[], paraDesbloquear: string[] }> = {};

      for (const data in horariosSelecionados) {
        mudancasPorData[data] = { paraBloquear: [], paraDesbloquear: [] };
        for (const horario of horariosSelecionados[data]) {
          const estaBloqueadoAtualmente = bloqueiosManuais.some(b => b.data === data && b.horarios.includes(horario));
          if (estaBloqueadoAtualmente) {
            mudancasPorData[data].paraDesbloquear.push(horario);
          } else {
            mudancasPorData[data].paraBloquear.push(horario);
          }
        }
      }

      for (const data in mudancasPorData) {
        const { paraBloquear, paraDesbloquear } = mudancasPorData[data];
        const docExistente = bloqueiosManuais.find(d => d.data === data);
        const horariosExistentes = docExistente?.horarios || [];
        
        let horariosFinais = [...horariosExistentes];
        
        horariosFinais.push(...paraBloquear);
        horariosFinais = horariosFinais.filter(horario => !paraDesbloquear.includes(horario));
        horariosFinais = [...new Set(horariosFinais)].sort();

        if (docExistente) {
          if (horariosFinais.length > 0) {
            batch.update(doc(bloqueiosRef, docExistente.id), { horarios: horariosFinais });
          } else {
            batch.delete(doc(bloqueiosRef, docExistente.id));
          }
        } else if (horariosFinais.length > 0) {
          batch.set(doc(collection(clientDb, "horariosBloqueados")), { data: data, horarios: horariosFinais });
        }
      }

      await batch.commit();

      toast({
        title: "Sucesso!",
        description: "As alterações nos horários foram salvas.",
      });

    } catch (error) {
      console.error("[Cliente] Erro em handleSalvarMudancas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setHorariosSelecionados({});
      await buscarBloqueiosManuais();
      setEnviando(false);
    }
  }


  return (
    <>
      <CardHeader>
        <div className="flex justify-between items-center">
          <Button variant="outline" size="icon" onClick={() => mudarSemana(-1)} disabled={desabilitarBtnSemanaAnterior}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold text-center font-headline">
            {format(diasDaSemana[0], "d 'de' MMMM", { locale: ptBR })} - {format(diasDaSemana[diasDaSemana.length - 1], "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => mudarSemana(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <TooltipProvider delayDuration={100}>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-border overflow-hidden rounded-lg border">
              {diasDaSemana.map(dia => {
                const chaveDataParaReserva = format(dia, "yyyy-MM-dd");
                const diaPassado = isBefore(dia, hoje);

                return (
                  <div key={dia.toString()} className={cn("flex flex-col", diaPassado ? "bg-muted" : "bg-background")}>
                    <div className="text-center font-bold py-2 border-b font-headline capitalize">
                      {format(dia, "EEE", { locale: ptBR })}
                      <div className="font-normal text-sm text-muted-foreground">{format(dia, "d/MM")}</div>
                    </div>
                    <div className="flex flex-col p-1 gap-1">
                      {SLOTS_DE_TEMPO.map(horario => {
                        const chaveData = format(dia, "yyyy-MM-dd");
                        const estaSelecionado = horariosSelecionados[chaveData]?.includes(horario);
                        const slotReservado = reservasIniciais.find(r => r.data === chaveDataParaReserva && r.horarios.includes(horario));
                        const bloqueadoManualmente = bloqueiosManuais.find(b => b.data === chaveDataParaReserva && b.horarios.includes(horario));

                        let classeBotao = "";
                        let estaDesabilitado = diaPassado;
                        let conteudoTooltip = "";

                        if (slotReservado) {
                            estaDesabilitado = true;
                            if (slotReservado.status === 'pendente') {
                                classeBotao = "bg-accent/80 hover:bg-accent/80 text-accent-foreground cursor-not-allowed";
                                conteudoTooltip = "Agendamento pendente de aprovação";
                            } else {
                                classeBotao = "bg-green-400 hover:bg-green-400 text-green-900 cursor-not-allowed";
                                conteudoTooltip = "Agendamento confirmado";
                            }
                        } else if (bloqueadoManualmente) {
                            classeBotao = "bg-destructive/80 hover:bg-destructive/80 text-destructive-foreground";
                            conteudoTooltip = "Bloqueado pela equipe. Clique para selecionar/desbloquear.";
                        }
                        
                        if (diaPassado && !slotReservado) {
                           return (
                              <Button
                                key={horario}
                                variant="outline"
                                className="h-8 w-full text-xs bg-muted cursor-not-allowed"
                                disabled
                              >
                                {horario}
                              </Button>
                           );
                        }

                        if (estaDesabilitado) {
                             return (
                                <div key={horario}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span tabIndex={0}>
                                        <Button
                                          variant="outline"
                                          className={cn("h-8 w-full text-xs", classeBotao)}
                                          disabled
                                        >
                                          {horario}
                                        </Button>
                                      </span>
                                    </TooltipTrigger>
                                    {conteudoTooltip && (
                                    <TooltipContent>
                                      <p>{conteudoTooltip}</p>
                                    </TooltipContent>
                                    )}
                                  </Tooltip>
                                </div>
                              );
                        }

                        return (
                          <Tooltip key={horario}>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant={estaSelecionado ? "default" : "outline"}
                                    className={cn("h-8 text-xs", estaSelecionado ? "bg-primary hover:bg-primary/90" : "", classeBotao)}
                                    onClick={() => handleSelecaoHorario(dia, horario)}
                                >
                                    {horario}
                                </Button>
                            </TooltipTrigger>
                            {conteudoTooltip && (
                                <TooltipContent>
                                    <p>{conteudoTooltip}</p>
                                </TooltipContent>
                            )}
                           </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
        </CardContent>
        <LegendaCalendarioAdmin />
      </TooltipProvider>
      {totalHorariosSelecionados > 0 && (
        <CardFooter className="flex-col items-start gap-4 pt-4">
           <div className="text-sm text-muted-foreground">
            {totalHorariosSelecionados} horário(s) selecionado(s) para bloquear/desbloquear.
          </div>
          <Button 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={handleSalvarMudancas}
            disabled={enviando}
          >
            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Salvar Alterações'}
          </Button>
        </CardFooter>
      )}
    </>
  );
}

    