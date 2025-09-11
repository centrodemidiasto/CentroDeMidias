
'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMemo, useState } from 'react';
import { Loader2, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { handleSolicitacaoReservaAdmin } from '@/app/actions';
import { HorariosSelecionados } from './formulario-agendamento';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const ReservaAdminSchema = z.object({
    tituloGravacao: z.string().min(3, { message: "Título da gravação é obrigatório." }),
    nomeCompleto: z.string().min(3, { message: "Nome do responsável é obrigatório." }),
    departamento: z.string().min(2, { message: "Setor/Departamento é obrigatório." }),
    modalidadesReserva: z.string({ required_error: "Selecione uma modalidade." }),
    estudio: z.string(),
});

const getModalidadesReserva = (estudio: string) => {
    const all = [
        { id: 'admin_audio_video', label: 'Gravação de áudio e vídeo' },
        { id: 'admin_audio_only', label: 'Gravação de áudio' },
        { id: 'admin_live_stream', label: 'Transmissão ao vivo (Live)' },
        { id: 'admin_podcast', label: 'Podcast' },
    ];
    if (estudio === 'Estúdio 2') {
        return all.map(item => 
            item.id === 'admin_podcast' 
            ? { ...item, disabled: true, label: 'Podcast (apenas Estúdio 1)' } 
            : item
        );
    }
    return all.map(item => ({...item, disabled: false}));
};


interface FormularioReservaAdminProps {
    horariosSelecionados: HorariosSelecionados;
    estudio: string;
    onSucessoReserva: () => void;
}

export default function FormularioReservaAdmin({ horariosSelecionados, estudio, onSucessoReserva }: FormularioReservaAdminProps) {
    const [enviando, setEnviando] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof ReservaAdminSchema>>({
        resolver: zodResolver(ReservaAdminSchema),
        defaultValues: {
            tituloGravacao: '',
            nomeCompleto: '',
            departamento: 'GMEACM',
            modalidadesReserva: undefined,
            estudio: estudio,
        },
    });

    const modalidadesDisponiveis = useMemo(() => getModalidadesReserva(estudio), [estudio]);

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

                 <FormField
                    control={form.control}
                    name="tituloGravacao"
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
                    name="nomeCompleto"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome do Responsável</FormLabel>
                            <FormControl>
                                <Input placeholder="Nome e sobrenome" {...field} />
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
                    name="estudio"
                    render={({ field }) => (
                        <FormItem className="hidden">
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
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
                                    {modalidadesDisponiveis.map((item) => (
                                        <FormItem key={item.id} className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value={item.label} id={item.id} disabled={item.disabled} />
                                            </FormControl>
                                            <FormLabel htmlFor={item.id} className={cn("font-normal", item.disabled && "text-muted-foreground")}>{item.label}</FormLabel>
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
