
'use client';

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import FormularioReservaAdmin from "./formulario-reserva-admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Calendar } from "./ui/calendar";
import { ReservaExistente, BloqueioManual, SLOTS_DE_TEMPO } from "./formulario-agendamento";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { handleSolicitacaoReservaRecorrente } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Loader2 } from "lucide-react";

interface FormularioAgendamentoRecorrenteProps {
    reservasExistentes: ReservaExistente[];
    bloqueiosManuais: BloqueioManual[];
    onSucessoReserva: () => void;
}

const ReservaAdminSchema = z.object({
    nomeCompleto: z.string().min(3, { message: "Nome do responsável é obrigatório." }),
    departamento: z.string().min(2, { message: "Setor/Departamento é obrigatório." }),
    modalidadesReserva: z.string({ required_error: "Selecione uma modalidade." }),
});

const MODALIDADES_RESERVA = [
    { id: 'admin_audio_video', label: 'Gravação de áudio e vídeo' },
    { id: 'admin_audio_only', label: 'Gravação de áudio' },
    { id: 'admin_live_stream', label: 'Transmissão ao vivo (Live)' },
];


export default function FormularioAgendamentoRecorrente({ 
    reservasExistentes, 
    bloqueiosManuais, 
    onSucessoReserva 
}: FormularioAgendamentoRecorrenteProps) {
    
    const [datasSelecionadas, setDatasSelecionadas] = useState<Date[] | undefined>([]);
    const [horariosSelecionados, setHorariosSelecionados] = useState<string[]>([]);
    const [enviando, setEnviando] = useState(false);

    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof ReservaAdminSchema>>({
        defaultValues: {
            nomeCompleto: '',
            departamento: 'GMEACM',
            modalidadesReserva: undefined,
        },
    });

    const isSlotDisabled = (date: Date, horario: string) => {
        const chaveData = format(date, "yyyy-MM-dd");
        const slotReservado = reservasExistentes.find(r => r.data === chaveData && r.horarios.includes(horario));
        const bloqueadoManualmente = bloqueiosManuais.find(b => b.data === chaveData && b.horarios.includes(horario));
        return !!slotReservado || !!bloqueadoManualmente;
    }
    
    const disabledDays = useMemo(() => {
        if (horariosSelecionados.length === 0) return [];
        
        let disabled: Date[] = [];
        // Simular um range grande de dias para checar, poderia otimizar
        for (let i = 0; i < 365; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const todosHorariosOcupados = horariosSelecionados.every(horario => isSlotDisabled(date, horario));
            if (todosHorariosOcupados) {
                disabled.push(date);
            }
        }
        return disabled;

    }, [horariosSelecionados, reservasExistentes, bloqueiosManuais]);


    const handleSelecaoHorario = (horario: string) => {
        setHorariosSelecionados(prev => {
            if (prev.includes(horario)) {
                return prev.filter(h => h !== horario);
            } else {
                return [...prev, horario].sort();
            }
        });
        setDatasSelecionadas([]);
    };
    
    const formAction = async (data: z.infer<typeof ReservaAdminSchema>) => {
        if (!datasSelecionadas || datasSelecionadas.length === 0 || horariosSelecionados.length === 0) {
             toast({
                title: 'Erro',
                description: 'Por favor, selecione os horários e pelo menos uma data.',
                variant: 'destructive'
             });
             return;
        }

        setEnviando(true);
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        const datasFormatadas = datasSelecionadas.map(d => format(d, "yyyy-MM-dd"));

        const resultado = await handleSolicitacaoReservaRecorrente(datasFormatadas, horariosSelecionados, null, formData);
        
        if (resultado && resultado.mensagem) {
            const variant = resultado.sucesso ? 'default' : 'destructive';
            toast({
                title: resultado.sucesso ? 'Sucesso!' : 'Erro na Solicitação',
                description: <div className="whitespace-pre-wrap">{resultado.mensagem}</div>,
                variant: variant,
            });
             if (resultado.sucesso) {
                form.reset();
                onSucessoReserva();
            }
        }
        setEnviando(false);
    };


    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(formAction)} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="space-y-2">
                    <h3 className="font-medium">1. Selecione os Horários</h3>
                     <div className="grid grid-cols-3 gap-2">
                        {SLOTS_DE_TEMPO.map(horario => {
                            const estaSelecionado = horariosSelecionados.includes(horario);
                            return (
                                <Button
                                    key={horario}
                                    type="button"
                                    variant={estaSelecionado ? "default" : "outline"}
                                    className={cn("h-9 text-xs", estaSelecionado && "bg-primary hover:bg-primary/90")}
                                    onClick={() => handleSelecaoHorario(horario)}
                                >
                                    {horario}
                                </Button>
                            );
                        })}
                    </div>
                </div>
                 <div className="space-y-2">
                    <h3 className="font-medium">3. Detalhes da Reserva</h3>
                    <div className="space-y-4 rounded-md border p-4">
                        <FormField
                            control={form.control}
                            name="nomeCompleto"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título da Gravação</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Aula Prof. Fraga" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="departamento"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Setor/Departamento</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: DTIE, GMEACM, etc." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="modalidadesReserva"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel>Modalidade da Gravação</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-col space-y-1"
                                            name={field.name}
                                        >
                                            {MODALIDADES_RESERVA.map((item) => (
                                                <FormItem key={item.id} className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value={item.label} id={item.id} />
                                                    </FormControl>
                                                    <FormLabel htmlFor={item.id} className="font-normal text-sm">{item.label}</FormLabel>
                                                </FormItem>
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                 </div>
                 <Button type="submit" disabled={enviando} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    {enviando ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Confirmando...
                        </>
                    ) : (
                        'Confirmar Agendamentos Recorrentes'
                    )}
                </Button>
            </div>
            <div className="space-y-2">
                <div className="p-2 border rounded-md text-center">
                    <h3 className="font-medium">2. Selecione as Datas</h3>
                </div>
                {horariosSelecionados.length > 0 ? (
                    <div className="flex justify-center">
                        <Calendar
                            mode="multiple"
                            min={1}
                            selected={datasSelecionadas}
                            onSelect={setDatasSelecionadas}
                            className="rounded-md border"
                            disabled={disabledDays}
                        />
                    </div>
                ): (
                    <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertTitle>Selecione um horário</AlertTitle>
                        <AlertDescription>
                            Primeiro, escolha um ou mais horários para habilitar o calendário.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </form>
        </Form>
    );
}
