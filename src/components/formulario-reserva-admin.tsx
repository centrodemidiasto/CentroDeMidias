
'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { handleSolicitacaoReservaAdmin } from '@/app/actions';
import { HorariosSelecionados } from './formulario-agendamento';

const ReservaAdminSchema = z.object({
    nomeCompleto: z.string(),
    departamento: z.string(),
    modalidadesReserva: z.string(),
});

const MODALIDADES_RESERVA = [
    { id: 'admin_audio_video', label: 'Gravação de áudio e vídeo' },
    { id: 'admin_audio_only', label: 'Gravação de áudio' },
    { id: 'admin_live_stream', label: 'Transmissão ao vivo (Live)' },
    { id: 'admin_podcast', label: 'Podcast' },
];

interface FormularioReservaAdminProps {
    horariosSelecionados: HorariosSelecionados;
    onSucessoReserva: () => void;
}

export default function FormularioReservaAdmin({ horariosSelecionados, onSucessoReserva }: FormularioReservaAdminProps) {
    const [enviando, setEnviando] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof ReservaAdminSchema>>({
        defaultValues: {
            nomeCompleto: '',
            departamento: 'GMEACM',
            modalidadesReserva: undefined,
        },
    });

    const formAction = async (data: z.infer<typeof ReservaAdminSchema>) => {
        setEnviando(true);
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        const resultado = await handleSolicitacaoReservaAdmin(horariosSelecionados, null, formData);
        
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
            <form onSubmit={form.handleSubmit(formAction)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
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
                        <FormItem className="space-y-3">
                            <FormLabel>Modalidade da Gravação</FormLabel>
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
                
                <div className="pt-4">
                     <Button type="submit" disabled={enviando} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                        {enviando ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Confirmando...
                            </>
                        ) : (
                            'Confirmar Agendamento'
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
