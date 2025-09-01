
'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { handleSolicitacaoReserva } from '@/app/actions';
import { HorariosSelecionados } from './formulario-agendamento';

const DetalhesReservaSchema = z.object({
    nomeCompleto: z.string(),
    email: z.string(),
    telefone: z.string(),
    tituloGravacao: z.string(),
    tipoOrgao: z.enum(["interno", "externo"]),
    departamento: z.string().optional(),
    organizacaoExterna: z.string().optional(),
    modalidadesReserva: z.string(),
    materiaisNecessarios: z.string().optional(),
    numeroParticipantes: z.coerce.number(),
    numeroMesas: z.coerce.number(),
    numeroCadeiras: z.coerce.number(),
});

const MODALIDADES_RESERVA = [
    { id: 'audio_video', label: 'Gravação de áudio e vídeo' },
    { id: 'audio_only', label: 'Gravação de áudio' },
    { id: 'live_stream', label: 'Transmissão ao vivo (Live)' },
];

function formatarTelefone(value: string) {
    if (!value) return value;
    const numeros = value.replace(/[^\d]/g, '');
    const tamanho = numeros.length;
    if (tamanho < 3) return `(${numeros}`;
    if (tamanho < 8) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
}

interface FormularioDetalhesReservaProps {
    horariosSelecionados: HorariosSelecionados;
    onSucessoReserva: () => void;
}

export default function FormularioDetalhesReserva({ horariosSelecionados, onSucessoReserva }: FormularioDetalhesReservaProps) {
    const [enviando, setEnviando] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof DetalhesReservaSchema>>({
        defaultValues: {
            nomeCompleto: '',
            email: '',
            telefone: '',
            tituloGravacao: '',
            tipoOrgao: undefined,
            departamento: '',
            organizacaoExterna: '',
            modalidadesReserva: undefined,
            materiaisNecessarios: '',
            numeroParticipantes: 1,
            numeroMesas: 0,
            numeroCadeiras: 0,
        },
    });

    const formAction = async (data: z.infer<typeof DetalhesReservaSchema>) => {
        setEnviando(true);
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        const resultado = await handleSolicitacaoReserva(horariosSelecionados, null, formData);
        
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
    
    const tipoOrgao = form.watch('tipoOrgao');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(formAction)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

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
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex space-x-4"
                                    name={field.name}
                                >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="interno" id="interno" />
                                        </FormControl>
                                        <FormLabel htmlFor="interno" className="font-normal">Interno (SEDUC)</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="externo" id="externo" />
                                        </FormControl>
                                        <FormLabel htmlFor="externo" className="font-normal">Externo</FormLabel>
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
                    name="modalidadesReserva"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Modalidade do Agendamento</FormLabel>
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-2"
                                    name={field.name}
                                >
                                    {MODALIDADES_RESERVA.map((item) => (
                                        <FormItem key={item.id} className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value={item.label} id={item.id} />
                                            </FormControl>
                                            <FormLabel htmlFor={item.id} className="font-normal">{item.label}</FormLabel>
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
                                <Textarea
                                    placeholder="Ex: Mesa, tapetes, cadeira, luminária, e outros..."
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <FormField
                        control={form.control}
                        name="numeroParticipantes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nº de Participantes</FormLabel>
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
                                <FormLabel>Nº de Mesas</FormLabel>
                                <FormControl>
                                    <Input type="number" min="0" max="3" {...field} />
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
                                <FormLabel>Nº de Cadeiras</FormLabel>
                                <FormControl>
                                    <Input type="number" min="0" max="10" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                <div className="pt-4">
                     <Button type="submit" disabled={enviando} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                        {enviando ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando Solicitação...
                            </>
                        ) : (
                            'Finalizar Agendamento'
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
