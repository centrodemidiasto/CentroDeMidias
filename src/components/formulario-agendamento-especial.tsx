
'use client';

import { useState, useMemo } from "react";
import { format, startOfToday, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import FormularioReservaAdmin from "./formulario-reserva-admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { Calendar } from "./ui/calendar";
import { HorariosSelecionados } from "./formulario-agendamento";
import {ReservaExistente, BloqueioManual } from "@/lib/types";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Calendar as CalendarIcon, Tv } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";

interface FormularioAgendamentoEspecialProps {
    reservasExistentes: ReservaExistente[];
    bloqueiosManuais: BloqueioManual[];
    onSucessoReserva: () => void;
}

const SLOTS_DE_TEMPO_ESPECIAL = Array.from({ length: (22 - 8) * 2 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${String(hour).padStart(2, '0')}:${minute}`;
});


const LegendaItem = ({ cor, texto }: { cor: string, texto: string }) => (
    <div className="flex items-center gap-2">
        <div className={cn("w-3 h-3 rounded-full", cor)}></div>
        <span className="text-xs text-muted-foreground">{texto}</span>
    </div>
)

const getSlotAnterior = (horario: string): string | null => {
    const [h, m] = horario.split(':').map(Number);
    if (h === 8 && m === 0) return null;

    const date = new Date();
    date.setHours(h, m, 0);
    date.setMinutes(date.getMinutes() - 30);
    
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function FormularioAgendamentoEspecial({ 
    reservasExistentes, 
    bloqueiosManuais, 
    onSucessoReserva 
}: FormularioAgendamentoEspecialProps) {
    const hoje = startOfToday();
    const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>(hoje);
    const [horariosSelecionados, setHorariosSelecionados] = useState<HorariosSelecionados>({});
    const [estudioSelecionado, setEstudioSelecionado] = useState<string | null>(null);
    const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);

    const chaveData = dataSelecionada ? format(dataSelecionada, "yyyy-MM-dd") : "";

    const diasComSelecaoAtual = useMemo(() => {
        return Object.keys(horariosSelecionados)
            .filter(data => horariosSelecionados[data]?.length > 0)
            .map(d => parseISO(d));
    }, [horariosSelecionados]);

    const handleSelecaoHorario = (horario: string) => {
        if (!dataSelecionada || !estudioSelecionado) return;

        setHorariosSelecionados(prev => {
            const horariosDoDia = prev[chaveData] || [];
            if (horariosDoDia.includes(horario)) {
                return { ...prev, [chaveData]: horariosDoDia.filter(h => h !== horario) };
            } else {
                return { ...prev, [chaveData]: [...horariosDoDia, horario] };
            }
        });
    };

    const totalHorariosSelecionados = Object.values(horariosSelecionados).reduce((total, horarios) => total + horarios.length, 0);

    const handleSucesso = () => {
        onSucessoReserva();
        setModalDetalhesAberto(false);
        setHorariosSelecionados({});
        setEstudioSelecionado(null);
        setDataSelecionada(hoje);
    }
    
    return (
        <TooltipProvider>
            <div className="space-y-6">
                 <div>
                    <Label className="font-semibold">1. Selecione o Estúdio</Label>
                    <RadioGroup
                        value={estudioSelecionado ?? ''}
                        onValueChange={setEstudioSelecionado}
                        className="flex gap-4 mt-2"
                    >
                        <Label htmlFor="especial-estudio-1" className="flex items-center gap-2 border rounded-md p-3 flex-1 cursor-pointer hover:bg-accent hover:text-accent-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground">
                            <RadioGroupItem value="Estúdio 1" id="especial-estudio-1" />
                            Estúdio 1
                        </Label>
                        <Label htmlFor="especial-estudio-2" className="flex items-center gap-2 border rounded-md p-3 flex-1 cursor-pointer hover:bg-accent hover:text-accent-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground">
                            <RadioGroupItem value="Estúdio 2" id="especial-estudio-2" />
                            Estúdio 2
                        </Label>
                    </RadioGroup>
                </div>


               <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8", !estudioSelecionado && "opacity-50 pointer-events-none")}>
                    <div className="flex flex-col items-center justify-center">
                         <Label className="font-semibold mb-2">2. Selecione a Data</Label>
                        <Calendar
                            mode="single"
                            selected={dataSelecionada}
                            onSelect={setDataSelecionada}
                            className="rounded-md border"
                            initialFocus
                            modifiers={{ com_selecao: diasComSelecaoAtual }}
                            modifiersStyles={{
                                com_selecao: { 
                                    color: 'hsl(var(--primary-foreground))',
                                    backgroundColor: 'hsl(var(--primary))'
                                },
                            }}
                        />
                        <div className="flex flex-col gap-2 mt-4 p-2 border rounded-md">
                            <div className="flex gap-4">
                                <LegendaItem cor="bg-primary" texto="Com seleção atual" />
                                <LegendaItem cor="bg-background border" texto="Disponível" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {dataSelecionada ? (
                            <>
                                <h3 className="text-lg font-medium text-center">
                                   3. Horários para {format(dataSelecionada, "dd/MM/yyyy")}
                                </h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {SLOTS_DE_TEMPO_ESPECIAL.map(horario => {
                                        const slotReservado = reservasExistentes.find(r => r.data === chaveData && r.horarios.includes(horario) && r.estudio === estudioSelecionado);
                                        const bloqueadoManualmente = bloqueiosManuais.find(b => b.data === chaveData && b.horarios.includes(horario) && b.estudio === estudioSelecionado);
                                        
                                        const slotAnterior = getSlotAnterior(horario);
                                        const slotAnteriorReservado = slotAnterior ? reservasExistentes.find(r => r.data === chaveData && r.horarios.includes(slotAnterior) && r.estudio === estudioSelecionado) : null;
                                        const slotAnteriorBloqueado = slotAnterior ? bloqueiosManuais.find(b => b.data === chaveData && b.horarios.includes(slotAnterior) && b.estudio === estudioSelecionado) : null;

                                        const estaDesabilitado = !!slotReservado || !!bloqueadoManualmente || !!slotAnteriorReservado || !!slotAnteriorBloqueado;
                                        const estaSelecionado = horariosSelecionados[chaveData]?.includes(horario);

                                        if (estaDesabilitado) {
                                            return (
                                                <Tooltip key={horario}>
                                                    <TooltipTrigger asChild>
                                                        <span>
                                                            <Button variant="outline" className="h-9 w-full text-xs cursor-not-allowed text-muted-foreground" disabled>
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
                                    <DialogDescription>
                                        Cada agendamento tem a duração de 60 minutos. Agendando para o {estudioSelecionado}.
                                    </DialogDescription>
                                </DialogHeader>
                                    <FormularioReservaAdmin 
                                        horariosSelecionados={horariosSelecionados} 
                                        estudio={estudioSelecionado!}
                                        onSucessoReserva={handleSucesso}
                                    />
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>
            </div>
            
            {!estudioSelecionado && (
                <Alert className="mt-6">
                    <Tv className="h-4 w-4" />
                    <AlertTitle>Aguardando Seleção</AlertTitle>
                    <AlertDescription>
                        Por favor, selecione um estúdio para continuar com o agendamento.
                    </AlertDescription>
                </Alert>
            )}
        </TooltipProvider>
    );
}

    