
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
import { collection, getDocs, writeBatch, doc, query, where } from "firebase/firestore";
import { db as clientDb } from "@/lib/firebase";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import LegendaCalendarioAdmin from "./legenda-calendario-admin";
import { ReservaExistente, BloqueioManual } from "@/lib/types";

type HorariosSelecionados = {
  [key: string]: string[]; // Ex: { "2024-08-15_Estúdio 1": ["09:00", "10:00"] }
};


interface FormularioBloqueioHorariosProps {
    reservasIniciais: ReservaExistente[];
    bloqueiosManuaisIniciais: BloqueioManual[];
}


const SLOTS_DE_TEMPO = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const ESTUDIOS = ["Estúdio 1", "Estúdio 2"];


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
    const novosBloqueios = querySnapshot.docs.map(doc => ({ ...doc.data() }) as BloqueioManual);
    setBloqueiosManuais(novosBloqueios);
  }

  const diasDaSemana = useMemo(() => {
    const inicioDaSemana = startOfWeek(dataAtual, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicioDaSemana, end: addDays(inicioDaSemana, 4) });
  }, [dataAtual]);

  const desabilitarBtnSemanaAnterior = useMemo(() => {
    const primeiroDiaSemanaAtual = startOfWeek(dataAtual, { weekStartsOn: 1 });
    const ultimoDiaSemanaAnterior = addDays(primeiroDiaSemanaAtual, -1);
    return isBefore(ultimoDiaSemanaAnterior, hoje);
  }, [dataAtual, hoje]);

  const handleSelecaoHorario = (dia: Date, horario: string, estudio: string) => {
    const chaveDataEstudio = `${format(dia, "yyyy-MM-dd")}_${estudio}`;
  
    setHorariosSelecionados((prev) => {
        const horariosDoSlot = prev[chaveDataEstudio] || [];
        const novosHorarios = { ...prev };

        if (horariosDoSlot.includes(horario)) {
            const novosHorariosDoSlot = horariosDoSlot.filter(h => h !== horario);
            if (novosHorariosDoSlot.length > 0) {
                novosHorarios[chaveDataEstudio] = novosHorariosDoSlot;
            } else {
                delete novosHorarios[chaveDataEstudio];
            }
        } else {
             novosHorarios[chaveDataEstudio] = [...horariosDoSlot, horario];
        }
      
        return novosHorarios;
    });
  };

  const mudarSemana = (quantidade: number) => {
    setDataAtual(prev => addDays(prev, quantidade * 7));
  };

  const totalHorariosSelecionados = Object.values(horariosSelecionados).reduce(
    (total, horarios) => total + horarios.length, 0
  );


  const handleSalvarMudancas = async () => {
    setEnviando(true);
    try {
      const batch = writeBatch(clientDb);
      const bloqueiosRef = collection(clientDb, 'horariosBloqueados');
      
      const mudancas: { data: string, estudio: string, horarios: string[] }[] = [];
      for (const chave in horariosSelecionados) {
          const [data, estudio] = chave.split('_');
          mudancas.push({ data, estudio, horarios: horariosSelecionados[chave] });
      }

      // Agrupar mudanças por data e estudio
      const mudancasAgrupadas: Record<string, { paraBloquear: string[], paraDesbloquear: string[] }> = {};
      mudancas.forEach(({ data, estudio, horarios }) => {
          horarios.forEach(horario => {
            const key = `${data}_${estudio}`;
            if (!mudancasAgrupadas[key]) {
                mudancasAgrupadas[key] = { paraBloquear: [], paraDesbloquear: [] };
            }
            const estaBloqueadoAtualmente = bloqueiosManuais.some(b => b.data === data && b.estudio === estudio && b.horarios.includes(horario));
            if (estaBloqueadoAtualmente) {
                mudancasAgrupadas[key].paraDesbloquear.push(horario);
            } else {
                mudancasAgrupadas[key].paraBloquear.push(horario);
            }
          });
      });
      
      const promises = Object.keys(mudancasAgrupadas).map(async key => {
        const [data, estudio] = key.split('_');
        const { paraBloquear, paraDesbloquear } = mudancasAgrupadas[key];
        
        const q = query(bloqueiosRef, where("data", "==", data), where("estudio", "==", estudio));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          if (paraBloquear.length > 0) {
            batch.set(doc(bloqueiosRef), { data, estudio, horarios: paraBloquear.sort() });
          }
        } else {
          const docRef = snapshot.docs[0].ref;
          const docData = snapshot.docs[0].data();
          const horariosExistentes: string[] = docData.horarios || [];
          
          let horariosFinais = [...horariosExistentes, ...paraBloquear];
          horariosFinais = horariosFinais.filter(h => !paraDesbloquear.includes(h));
          horariosFinais = [...new Set(horariosFinais)].sort();
          
          if (horariosFinais.length > 0) {
            batch.update(docRef, { horarios: horariosFinais });
          } else {
            batch.delete(docRef);
          }
        }
      });

      await Promise.all(promises);
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
                     <div className="text-center text-xs py-1 border-b grid grid-cols-2 gap-px">
                        <div className="bg-background">Estúdio 1</div>
                        <div className="bg-background">Estúdio 2</div>
                    </div>

                    <div className="flex flex-col p-1 gap-1">
                       {SLOTS_DE_TEMPO.map(horario => (
                          <div key={horario} className="grid grid-cols-2 gap-1">
                            {ESTUDIOS.map(estudio => {
                                const chaveDataEstudio = `${format(dia, "yyyy-MM-dd")}_${estudio}`;
                                const estaSelecionado = horariosSelecionados[chaveDataEstudio]?.includes(horario);
                                const slotReservado = reservasIniciais.find(r => r.data === chaveDataParaReserva && r.horarios.includes(horario) && r.estudio === estudio);
                                const bloqueadoManualmente = bloqueiosManuais.find(b => b.data === chaveDataParaReserva && b.horarios.includes(horario) && b.estudio === estudio);

                                let classeBotao = "";
                                let estaDesabilitado = diaPassado;
                                let conteudoTooltip = "";

                                if (slotReservado) {
                                    estaDesabilitado = true;
                                    if (slotReservado.status === 'pendente') {
                                        classeBotao = "bg-accent/80 hover:bg-accent/80 text-accent-foreground cursor-not-allowed";
                                        conteudoTooltip = "Agendamento pendente";
                                    } else {
                                        classeBotao = "bg-green-400 hover:bg-green-400 text-green-900 cursor-not-allowed";
                                        conteudoTooltip = "Agendamento confirmado";
                                    }
                                } else if (bloqueadoManualmente) {
                                    classeBotao = "bg-destructive/80 hover:bg-destructive/80 text-destructive-foreground";
                                    conteudoTooltip = "Bloqueado. Clique para desbloquear.";
                                }
                                
                                if (diaPassado && !slotReservado) {
                                  return ( <Button key={estudio} variant="outline" className="h-8 w-full text-xs bg-muted cursor-not-allowed" disabled> {horario} </Button> );
                                }

                                if (estaDesabilitado) {
                                    return (
                                        <div key={estudio}>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                              <span tabIndex={0} className="w-full">
                                                  <Button variant="outline" className={cn("h-8 w-full text-xs", classeBotao)} disabled> {horario} </Button>
                                              </span>
                                              </TooltipTrigger>
                                              {conteudoTooltip && ( <TooltipContent><p>{conteudoTooltip}</p></TooltipContent> )}
                                          </Tooltip>
                                        </div>
                                    );
                                }
                                
                                if (bloqueadoManualmente) {
                                    return (
                                      <Tooltip key={estudio}>
                                          <TooltipTrigger asChild>
                                              <Button
                                                  type="button"
                                                  variant={estaSelecionado ? "default" : "outline"}
                                                  className={cn("h-8 text-xs", estaSelecionado ? "bg-primary hover:bg-primary/90" : classeBotao)}
                                                  onClick={() => handleSelecaoHorario(dia, horario, estudio)}
                                              >
                                                  {horario}
                                              </Button>
                                          </TooltipTrigger>
                                          {conteudoTooltip && !estaSelecionado && <TooltipContent><p>{conteudoTooltip}</p></TooltipContent>}
                                      </Tooltip>
                                    );
                                }

                                return (
                                <Tooltip key={estudio}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={estaSelecionado ? "default" : "outline"}
                                            className={cn("h-8 text-xs", estaSelecionado ? "bg-primary hover:bg-primary/90" : "", classeBotao)}
                                            onClick={() => handleSelecaoHorario(dia, horario, estudio)}
                                        >
                                            {horario}
                                        </Button>
                                    </TooltipTrigger>
                                    {conteudoTooltip && ( <TooltipContent><p>{conteudoTooltip}</p></TooltipContent> )}
                                </Tooltip>
                                );
                            })}
                          </div>
                       ))}
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
