
'use client';

import { useState, useMemo } from "react";
import { format, startOfToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import FormularioReservaAdmin from "./formulario-reserva-admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Calendar } from "./ui/calendar";
import { HorariosSelecionados, ReservaExistente, BloqueioManual, SLOTS_DE_TEMPO } from "./formulario-agendamento";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Calendar as CalendarIcon } from "lucide-react";

interface FormularioAgendamentoEspecialProps {
    reservasExistentes: ReservaExistente[];
    bloqueiosManuais: BloqueioManual[];
    onSucessoReserva: () => void;
}

export default function FormularioAgendamentoEspecial({ 
    reservasExistentes, 
    bloqueiosManuais, 
    onSucessoReserva 
}: FormularioAgendamentoEspecialProps) {
    const hoje = startOfToday();
    const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>(hoje);
    const [horariosSelecionados, setHorariosSelecionados] = useState<HorariosSelecionados>({});
    const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);

    const chaveData = dataSelecionada ? format(dataSelecionada, "yyyy-MM-dd") : "";

    const handleSelecaoHorario = (horario: string) => {
        if (!dataSelecionada) return;

        setHorariosSelecionados(prev => {
            const horariosDoDia = prev[chaveData] || [];
            if (horariosDoDia.includes(horario)) {
                return { ...prev, [chaveData]: horariosDoDia.filter(h => h !== horario) };
            } else {
                return { ...prev, [chaveData]: [...horariosDoDia, horario] };
            }
        });
    };

    const totalHorariosSelecionados = horariosSelecionados[chaveData]?.length || 0;

    const handleSucesso = () => {
        onSucessoReserva();
        setModalDetalhesAberto(false);
        setHorariosSelecionados({});
        setDataSelecionada(hoje);
    }
    
    return (
        <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={dataSelecionada}
                        onSelect={setDataSelecionada}
                        className="rounded-md border"
                        initialFocus
                    />
                </div>
                <div className="space-y-4">
                    {dataSelecionada ? (
                        <>
                            <h3 className="text-lg font-medium text-center">
                                Horários para {format(dataSelecionada, "dd/MM/yyyy")}
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {SLOTS_DE_TEMPO.map(horario => {
                                    const slotReservado = reservasExistentes.find(r => r.data === chaveData && r.horarios.includes(horario));
                                    const bloqueadoManualmente = bloqueiosManuais.find(b => b.data === chaveData && b.horarios.includes(horario));
                                    const estaDesabilitado = !!slotReservado || !!bloqueadoManualmente;
                                    const estaSelecionado = horariosSelecionados[chaveData]?.includes(horario);

                                    if (estaDesabilitado) {
                                        return (
                                            <Tooltip key={horario}>
                                                <TooltipTrigger asChild>
                                                    <span>
                                                        <Button variant="outline" className="h-9 w-full text-xs cursor-not-allowed" disabled>
                                                            {horario}
                                                        </Button>
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Horário indisponível</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    }

                                    return (
                                        <Button
                                            key={horario}
                                            variant={estaSelecionado ? "default" : "outline"}
                                            className={cn("h-9 text-xs", estaSelecionado && "bg-primary hover:bg-primary/90")}
                                            onClick={() => handleSelecaoHorario(horario)}
                                        >
                                            {horario}
                                        </Button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <Alert>
                            <CalendarIcon className="h-4 w-4" />
                            <AlertTitle>Nenhuma data selecionada</AlertTitle>
                            <AlertDescription>
                                Por favor, selecione uma data no calendário para ver os horários disponíveis.
                            </AlertDescription>
                        </Alert>
                    )}

                    {totalHorariosSelecionados > 0 && (
                         <Dialog open={modalDetalhesAberto} onOpenChange={setModalDetalhesAberto}>
                            <DialogTrigger asChild>
                                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-4">
                                    Continuar ({totalHorariosSelecionados} selecionado(s))
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[625px]">
                            <DialogHeader>
                                <DialogTitle className="font-headline">
                                    Detalhes do Agendamento Especial
                                </DialogTitle>
                            </DialogHeader>
                                <FormularioReservaAdmin 
                                    horariosSelecionados={horariosSelecionados} 
                                    onSucessoReserva={handleSucesso}
                                />
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
