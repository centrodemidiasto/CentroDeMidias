
'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMemo, useState } from 'react';
import { Loader2, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { handleUpdateReserva } from '@/app/actions';
import { Reserva, ReservaExistente } from '@/lib/types';
import { BloqueioManual } from './formulario-bloqueio-horarios';
import { Calendar } from './ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { zodResolver } from '@hookform/resolvers/zod';
import { User } from 'firebase/auth';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const EdicaoReservaSchema = z.object({
    nomeCompleto: z.string().min(3, "Nome do responsável é obrigatório."),
    email: z.string().email("E-mail inválido."),
    telefone: z.string().optional(),
    tituloGravacao: z.string().min(3, "Título da gravação é obrigatório."),
    tipoOrgao: z.enum(["interno", "externo"]),
    departamento: z.string().optional(),
    organizacaoExterna: z.string().optional(),
    modalidadesReserva: z.string(),
    materiaisNecessarios: z.string().optional(),
    numeroParticipantes: z.coerce.number().optional(),
    numeroMesas: z.coerce.number().optional(),
    numeroCadeiras: z.coerce.number().optional(),
    estudio: z.string(),
}).superRefine((data, ctx) => {
    if (data.tipoOrgao === 'interno' && (!data.departamento || data.departamento.trim().length === 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Departamento é obrigatório.", path: ["departamento"] });
    }
    if (data.tipoOrgao === 'externo' && (!data.organizacaoExterna || data.organizacaoExterna.trim().length === 0)) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome do órgão é obrigatório.", path: ["organizacaoExterna"] });
    }
});

const ALL_SLOTS = Array.from({ length: (22 - 8) * 2 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${String(hour).padStart(2, '0')}:${minute}`;
});


const getModalidadesReserva = (estudio: string) => {
    const all = [
        { id: 'audio_video', label: 'Gravação de áudio e vídeo' },
        { id: 'audio_only', label: 'Gravação de áudio' },
        { id: 'live_stream', label: 'Transmissão ao vivo (Live)' },
        { id: 'podcast', label: 'Podcast' },
    ];
    if (estudio === 'Estúdio 2') {
        return all.map(item => 
            item.id === 'podcast' 
            ? { ...item, disabled: true, label: 'Podcast (apenas Estúdio 1)' } 
            : item
        );
    }
    return all.map(item => ({...item, disabled: false}));
};

function formatarTelefone(value: string) {
    if (!value) return value;
    const numeros = value.replace(/[^\d]/g, '');
    const tamanho = numeros.length;
    if (tamanho < 3) return `(${numeros}`;
    if (tamanho < 8) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
}

const getSlotAnterior = (horario: string): string | null => {
    const [h, m] = horario.split(':').map(Number);
    if (h === 8 && m === 0) return null;
    const date = new Date();
    date.setHours(h, m, 0);
    date.setMinutes(date.getMinutes() - 30);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

interface FormularioEdicaoReservaProps {
    reserva: Reserva;
    reservasExistentes: ReservaExistente[];
    bloqueiosManuais: BloqueioManual[];
    onSuccess: () => void;
    adminUser: User | null;
}

export default function FormularioEdicaoReserva({ reserva, reservasExistentes, bloqueiosManuais, onSuccess, adminUser }: FormularioEdicaoReservaProps) {
    const [enviando, setEnviando] = useState(false);
    
    const dataInicial = parseISO(reserva.dataReserva);
    const horariosIniciais = reserva.horariosSelecionados[reserva.dataReserva];
    
    const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>(dataInicial);
    const [horariosSelecionados, setHorariosSelecionados] = useState<string[]>(horariosIniciais);

    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof EdicaoReservaSchema>>({
        resolver: zodResolver(EdicaoReservaSchema),
        defaultValues: {
            ...reserva,
            nomeCompleto: reserva.nomeCompleto ?? '',
            email: reserva.email ?? '',
            tituloGravacao: reserva.tituloGravacao ?? '',
            telefone: reserva.telefone ?? '',
            departamento: reserva.departamento ?? '',
            organizacaoExterna: reserva.organizacaoExterna ?? '',
            materiaisNecessarios: reserva.materiaisNecessarios ?? '',
            numeroParticipantes: reserva.numeroParticipantes ?? 1,
            numeroMesas: reserva.numeroMesas ?? 0,
            numeroCadeiras: reserva.numeroCadeiras ?? 0,
        },
    });
    
    const tipoOrgao = form.watch('tipoOrgao');
    const estudio = form.watch('estudio');
    const modalidadesDisponiveis = useMemo(() => getModalidadesReserva(estudio), [estudio]);

    const formAction = async (data: z.infer<typeof EdicaoReservaSchema>) => {
        setEnviando(true);

        if (!adminUser) {
             toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
             setEnviando(false);
             return;
        }

        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        const chaveData = format(dataSelecionada!, 'yyyy-MM-dd');
        const novosHorariosSelecionados = { [chaveData]: horariosSelecionados };

        const resultado = await handleUpdateReserva(reserva.id, novosHorariosSelecionados, { nome: adminUser.displayName, email: adminUser.email }, null, formData);
        
        if (resultado && resultado.mensagem) {
            const variant = resultado.sucesso ? 'default' : 'destructive';
            toast({
                title: resultado.sucesso ? 'Sucesso!' : 'Erro na Atualização',
                description: <div className="whitespace-pre-wrap">{resultado.mensagem}</div>,
                variant: variant,
            });
            if (resultado.sucesso) {
                onSuccess();
            }
        }
        setEnviando(false);
    };

    const handleSelecaoHorario = (horario: string) => {
        setHorariosSelecionados(prev => {
            if (prev.includes(horario)) {
                return prev.filter(h => h !== horario);
            } else {
                return [...prev, horario].sort();
            }
        });
    };
    
    return (
        <TooltipProvider>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(formAction)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                 {estudio === 'Estúdio 2' && (
                    <Alert variant="default" className="bg-blue-50 border-blue-200">
                        <Shirt className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="font-headline text-blue-800">Vestuário para Gravação no Estúdio 2 (Fundo Verde)</AlertTitle>
                        <AlertDescription className="text-blue-700 space-y-2">
                             <p><strong>EVITE:</strong> Roupas ou acessórios de qualquer tom de VERDE. Também evite branco, tecidos brilhantes e estampas pequenas (listras finas, xadrez).</p>
                             <p><strong>PREFIRA:</strong> Roupas de cores sólidas e foscas, como azul, preto, cinza ou vinho.</p>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="tituloGravacao"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título da Gravação</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Matriz de Recomposição - CNT" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="nomeCompleto"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome/Sobrenome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Seu nome completo" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="telefone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número de telefone</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="(00) 00000-0000"
                                            {...field}
                                            onChange={(e) => {
                                                const formatado = formatarTelefone(e.target.value);
                                                field.onChange(formatado);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Endereço de e-mail institucional</FormLabel>
                                        <FormControl>
                                            <Input placeholder="seuemail@seduc.to.gov.br" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        
                        <FormField
                            control={form.control}
                            name="tipoOrgao"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Órgão</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4" name={field.name}>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="interno" id="edit-interno" /></FormControl>
                                                <FormLabel htmlFor="edit-interno" className="font-normal">Interno (SEDUC)</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="externo" id="edit-externo" /></FormControl>
                                                <FormLabel htmlFor="edit-externo" className="font-normal">Externo</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {tipoOrgao === 'interno' && (
                            <FormField
                                control={form.control}
                                name="departamento"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Informe o Departamento</FormLabel>
                                    <FormControl>
                                    <Input placeholder="Ex: DTIE" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}

                        {tipoOrgao === 'externo' && (
                            <FormField
                                control={form.control}
                                name="organizacaoExterna"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Informe o Órgão/Departamento</FormLabel>
                                    <FormControl>
                                    <Input placeholder="Ex: UFT - Letras" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}
                        
                        <FormField
                            control={form.control}
                            name="estudio"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Estúdio</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4" name={field.name}>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="Estúdio 1" id="edit-estudio1" /></FormControl>
                                                <FormLabel htmlFor="edit-estudio1" className="font-normal">Estúdio 1</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="Estúdio 2" id="edit-estudio2" /></FormControl>
                                                <FormLabel htmlFor="edit-estudio2" className="font-normal">Estúdio 2</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="modalidadesReserva"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Modalidade do Agendamento</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2" name={field.name}>
                                            {modalidadesDisponiveis.map((item) => (
                                                <FormItem key={item.id} className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value={item.label} id={`edit-${item.id}`} disabled={item.disabled} /></FormControl>
                                                    <FormLabel htmlFor={`edit-${item.id}`} className={cn("font-normal", item.disabled && "text-muted-foreground")}>{item.label}</FormLabel>
                                                </FormItem>
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="materiaisNecessarios"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Materiais necessários (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Ex: Mesa, tapetes, cadeira, luminária, e outros..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="numeroParticipantes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nº Partic.</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="numeroMesas"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nº Mesas</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="numeroCadeiras"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nº Cadeiras</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                     <div className="flex flex-col items-center">
                        <FormLabel className="mb-2">Data da Reserva</FormLabel>
                        <Calendar
                            mode="single"
                            selected={dataSelecionada}
                            onSelect={setDataSelecionada}
                            className="rounded-md border"
                        />
                     </div>
                      <div className="space-y-2">
                        <FormLabel className="text-center block">Horários Disponíveis</FormLabel>
                        {dataSelecionada ? (
                             <div className="grid grid-cols-4 gap-2">
                                {ALL_SLOTS.map(horario => {
                                    const chaveData = format(dataSelecionada, "yyyy-MM-dd");
                                    const slotReservado = reservasExistentes.find(r => r.data === chaveData && r.horarios.includes(horario) && r.estudio === estudio && r.status !== 'rejeitado' && reserva.id !== r.id);
                                    const bloqueadoManualmente = bloqueiosManuais.find(b => b.data === chaveData && b.horarios.includes(horario) && b.estudio === estudio);
                                    
                                    const slotAnterior = getSlotAnterior(horario);
                                    const slotAnteriorReservado = slotAnterior ? reservasExistentes.find(r => r.data === chaveData && r.horarios.includes(slotAnterior) && r.estudio === estudio && r.status !== 'rejeitado' && reserva.id !== r.id) : null;
                                    const slotAnteriorBloqueado = slotAnterior ? bloqueiosManuais.find(b => b.data === chaveData && b.horarios.includes(slotAnterior) && b.estudio === estudio) : null;

                                    const estaDesabilitado = !!slotReservado || !!bloqueadoManualmente || !!slotAnteriorReservado || !!slotAnteriorBloqueado;
                                    const estaSelecionado = horariosSelecionados.includes(horario);

                                    if (estaDesabilitado) {
                                        return (
                                            <Tooltip key={horario}>
                                                <TooltipTrigger asChild>
                                                    <span><Button variant="outline" className="h-9 w-full text-xs cursor-not-allowed text-muted-foreground" disabled>{horario}</Button></span>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Horário indisponível</p></TooltipContent>
                                            </Tooltip>
                                        );
                                    }

                                    return (
                                        <Button key={horario} type="button" variant={estaSelecionado ? "default" : "outline"} className={cn("h-9 text-xs", estaSelecionado && "bg-primary hover:bg-primary/90")} onClick={() => handleSelecaoHorario(horario)} >
                                            {horario}
                                        </Button>
                                    );
                                })}
                            </div>
                        ) : <p className="text-sm text-muted-foreground text-center">Selecione uma data</p>}
                      </div>
                </div>

                <div className="pt-4">
                     <Button type="submit" disabled={enviando} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                        {enviando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : 'Salvar Alterações'}
                    </Button>
                </div>
            </form>
        </Form>
        </TooltipProvider>
    );
}
