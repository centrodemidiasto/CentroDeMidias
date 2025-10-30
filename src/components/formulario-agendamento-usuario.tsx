
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { handleSolicitacaoReserva } from '@/app/actions';
import { HorariosSelecionados } from './formulario-agendamento';
import { Checkbox } from './ui/checkbox';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { cn } from '@/lib/utils';
import { DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

const DetalhesReservaSchema = z.object({
    nomeCompleto: z.string().min(3, { message: "Nome completo é obrigatório." }),
    email: z.string().email({ message: "E-mail inválido." }),
    telefone: z.string().min(15, { message: "Telefone inválido." }),
    tituloGravacao: z.string().min(3, { message: "Título da gravação é obrigatório." }),
    tipoOrgao: z.enum(["interno", "externo"], { errorMap: () => ({ message: "Selecione o tipo de órgão." }) }),
    departamento: z.string().optional(),
    organizacaoExterna: z.string().optional(),
    modalidadesReserva: z.string({ required_error: "Selecione uma modalidade." }),
    materiaisNecessarios: z.string().optional(),
    numeroParticipantes: z.coerce.number().min(1, { message: "Informe o número de participantes." }),
    numeroMesas: z.coerce.number().min(0, "Mínimo 0.").max(3, "Máximo 3 mesas."),
    numeroCadeiras: z.coerce.number().min(0, "Mínimo 0.").max(10, "Máximo 10 cadeiras."),
    termosDeUso: z.literal(true, { errorMap: () => ({ message: "Você deve aceitar as normas de uso." }) }),
});

const EdicaoVideoSchema = z.object({
    entregaMaterial: z.string({ required_error: "Selecione como deseja receber o material." }),
    formatoVideo: z.string({ required_error: "Selecione o formato do vídeo." }),
    plataformaVideo: z.string({ required_error: "Selecione a plataforma de destino." }),
    plataformaVideoOutro: z.string().optional(),
    participantes: z.array(z.object({
        nome: z.string().min(1, 'Nome do participante é obrigatório.'),
        funcao: z.string().min(1, 'Função do participante é obrigatória.')
    })),
});

const FormSchema = DetalhesReservaSchema.merge(EdicaoVideoSchema);


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
    return all.map(item => ({ ...item, disabled: false }));
};

function formatarTelefone(value: string) {
    if (!value) return value;
    const numeros = value.replace(/[^\d]/g, '');
    const tamanho = numeros.length;
    if (tamanho < 3) return `(${numeros}`;
    if (tamanho < 8) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
}

interface FormularioAgendamentoUsuarioProps {
    horariosSelecionados: HorariosSelecionados;
    estudio: string;
    onSucessoReserva: () => void;
}

export default function FormularioAgendamentoUsuario({ horariosSelecionados, estudio, onSucessoReserva }: FormularioAgendamentoUsuarioProps) {
    const [step, setStep] = useState(1);
    const [enviando, setEnviando] = useState(false);
    const { toast } = useToast();

    const methods = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(step === 1 ? DetalhesReservaSchema : FormSchema),
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
            termosDeUso: false,
            // Step 2
            entregaMaterial: undefined,
            formatoVideo: undefined,
            plataformaVideo: undefined,
            plataformaVideoOutro: '',
            participantes: [{ nome: '', funcao: '' }],
        },
    });

    const { control, watch, trigger } = methods;

    const { fields, replace } = useFieldArray({
        control,
        name: "participantes",
    });

    const numeroParticipantes = watch('numeroParticipantes');
    const tipoOrgao = watch('tipoOrgao');
    const modalidadeReserva = watch('modalidadesReserva');
    const plataformaVideo = watch('plataformaVideo');
    
    useEffect(() => {
        const num = isNaN(numeroParticipantes) ? 0 : numeroParticipantes;
        const currentCount = fields.length;
        if (num > currentCount) {
            const newFields = Array.from({ length: num - currentCount }, () => ({ nome: '', funcao: '' }));
            replace([...fields, ...newFields]);
        } else if (num < currentCount) {
            replace(fields.slice(0, num));
        }
    }, [numeroParticipantes, fields, replace]);

    const handleNextStep = async () => {
        const isValid = await trigger(Object.keys(DetalhesReservaSchema.shape) as any);
        if (isValid) {
            setStep(2);
        }
    };
    
    const formAction = async (data: z.infer<typeof FormSchema>) => {
        setEnviando(true);
        const formData = new FormData();
        
        // Adiciona todos os dados ao FormData, incluindo os participantes
        Object.entries(data).forEach(([key, value]) => {
            if (key === 'participantes' && Array.isArray(value)) {
                value.forEach((participante, index) => {
                    formData.append(`participantes[${index}].nome`, participante.nome || '');
                    formData.append(`participantes[${index}].funcao`, participante.funcao || '');
                });
            } else if (value !== undefined && value !== null) {
                if (typeof value === 'boolean') {
                    formData.append(key, value ? 'on' : 'off');
                } else {
                    formData.append(key, String(value));
                }
            }
        });
        formData.append('estudio', estudio);


        const resultado = await handleSolicitacaoReserva(horariosSelecionados, null, formData);

        if (resultado && resultado.mensagem) {
            const variant = resultado.sucesso ? 'default' : 'destructive';
            toast({
                title: resultado.sucesso ? 'Sucesso!' : 'Erro na Solicitação',
                description: <div className="whitespace-pre-wrap">{resultado.mensagem}</div>,
                variant: variant,
            });
            if (resultado.sucesso) {
                methods.reset();
                onSucessoReserva();
            }
        }
        setEnviando(false);
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(formAction)} className="flex flex-col h-full">
                {step === 1 && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="font-headline">Informações para o agendamento</DialogTitle>
                            <DialogDescription>Agendamento para o {estudio}.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-4 flex-grow">
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
                                <FormField control={control} name="nomeCompleto" render={({ field }) => (
                                    <FormItem><FormLabel>Nome/Sobrenome</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={control} name="telefone" render={({ field }) => (
                                    <FormItem><FormLabel>Número de telefone</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} onChange={(e) => field.onChange(formatarTelefone(e.target.value))}/></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>

                            <FormField control={control} name="tituloGravacao" render={({ field }) => (
                                <FormItem><FormLabel>Título da Gravação</FormLabel><FormControl><Input placeholder="Ex: Matriz de Recomposição - CNT" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={control} name="email" render={({ field }) => (
                                <FormItem><FormLabel>Endereço de e-mail institucional</FormLabel><FormControl><Input placeholder="seuemail@seduc.to.gov.br" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            
                            <FormField control={control} name="tipoOrgao" render={({ field }) => (
                                <FormItem className="space-y-3"><FormLabel>Órgão</FormLabel><FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4" name={field.name}>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="interno" id="interno" /></FormControl><FormLabel htmlFor="interno" className="font-normal">Interno (SEDUC)</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="externo" id="externo" /></FormControl><FormLabel htmlFor="externo" className="font-normal">Externo</FormLabel></FormItem>
                                    </RadioGroup></FormControl><FormMessage /></FormItem>
                            )}/>

                            {tipoOrgao === 'interno' && <FormField control={control} name="departamento" render={({ field }) => (<FormItem><FormLabel>Informe o Departamento</FormLabel><FormControl><Input placeholder="Ex: DTIE" {...field} /></FormControl><FormMessage /></FormItem>)}/>}
                            {tipoOrgao === 'externo' && <FormField control={control} name="organizacaoExterna" render={({ field }) => (<FormItem><FormLabel>Informe o Órgão/Departamento</FormLabel><FormControl><Input placeholder="Ex: UFT - Letras" {...field} /></FormControl><FormMessage /></FormItem>)}/>}
                            
                            <FormField control={control} name="modalidadesReserva" render={({ field }) => (
                                <FormItem className="space-y-3"><FormLabel>Modalidade do Agendamento</FormLabel><FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2" name={field.name}>
                                        {getModalidadesReserva(estudio).map((item) => (
                                            <FormItem key={item.id} className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value={item.label} id={item.id} disabled={item.disabled} /></FormControl>
                                                <FormLabel htmlFor={item.id} className={cn("font-normal", item.disabled && "text-muted-foreground")}>{item.label}</FormLabel>
                                            </FormItem>
                                        ))}
                                    </RadioGroup></FormControl><FormMessage /></FormItem>
                            )}/>

                            {modalidadeReserva === 'Transmissão ao vivo (Live)' && (
                                <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive">
                                    <AlertTriangle className="h-4 w-4 text-destructive" /><AlertTitle className="font-headline">Atenção sobre a Live</AlertTitle>
                                    <AlertDescription className="font-body">O link do Google Meet será criado e fornecido pelos estúdios do Centro de Mídias. Caso já tenha sido criado/divulgado pelo setor demandante, o setor deverá entrar em contato imediato com o centro de mídias após o agendamento.</AlertDescription>
                                </Alert>
                            )}

                            <FormField control={control} name="materiaisNecessarios" render={({ field }) => (
                                <FormItem><FormLabel>Materiais necessários (Opcional)</FormLabel><FormControl><Textarea placeholder="Ex: Mesa, tapetes, cadeira, luminária, e outros..." {...field}/></FormControl><FormMessage /></FormItem>
                            )}/>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={control} name="numeroParticipantes" render={({ field }) => (<FormItem><FormLabel>Nº de Participantes</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={control} name="numeroMesas" render={({ field }) => (<FormItem><FormLabel>Nº de Mesas</FormLabel><FormControl><Input type="number" min="0" max="3" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={control} name="numeroCadeiras" render={({ field }) => (<FormItem><FormLabel>Nº de Cadeiras</FormLabel><FormControl><Input type="number" min="0" max="10" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            </div>

                            <FormField control={control} name="termosDeUso" render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Eu li e concordo com as <Link href="/normasdeuso" target="_blank" className="text-primary hover:underline">normas de uso</Link> do estúdio.</FormLabel>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}/>
                        </div>
                        <div className="pt-4">
                            <Button type="button" onClick={handleNextStep} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">Continuar agendamento</Button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                         <DialogHeader>
                            <DialogTitle className="font-headline">Informações para equipe de edição de vídeo</DialogTitle>
                         </DialogHeader>
                         <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-4 flex-grow">
                             <FormField control={control} name="entregaMaterial" render={({ field }) => (
                                <FormItem className="space-y-3"><FormLabel>Como você deseja receber o material</FormLabel><FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1" name={field.name}>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Gravação bruta" id="bruta" /></FormControl><FormLabel htmlFor="bruta" className="font-normal">Gravação bruta</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Vídeo já editado" id="editado" /></FormControl><FormLabel htmlFor="editado" className="font-normal">Vídeo já editado</FormLabel></FormItem>
                                    </RadioGroup></FormControl><FormMessage /></FormItem>
                             )}/>
                             <FormField control={control} name="formatoVideo" render={({ field }) => (
                                <FormItem className="space-y-3"><FormLabel>Formato do vídeo</FormLabel><FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4" name={field.name}>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Horizontal" id="horizontal" /></FormControl><FormLabel htmlFor="horizontal" className="font-normal">Horizontal</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Vertical" id="vertical" /></FormControl><FormLabel htmlFor="vertical" className="font-normal">Vertical</FormLabel></FormItem>
                                    </RadioGroup></FormControl><FormMessage /></FormItem>
                             )}/>
                             <FormField control={control} name="plataformaVideo" render={({ field }) => (
                                <FormItem className="space-y-3"><FormLabel>Qual plataforma será direcionado o vídeo</FormLabel><FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1" name={field.name}>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Instagram" id="instagram" /></FormControl><FormLabel htmlFor="instagram" className="font-normal">Instagram</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="YouTube" id="youtube" /></FormControl><FormLabel htmlFor="youtube" className="font-normal">YouTube</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Outros" id="outros" /></FormControl><FormLabel htmlFor="outros" className="font-normal">Outros</FormLabel></FormItem>
                                    </RadioGroup></FormControl><FormMessage /></FormItem>
                             )}/>
                             {plataformaVideo === 'Outros' && <FormField control={control} name="plataformaVideoOutro" render={({ field }) => (<FormItem><FormLabel className="sr-only">Especifique outra plataforma</FormLabel><FormControl><Input placeholder="Especifique a plataforma" {...field} /></FormControl><FormMessage /></FormItem>)}/>}
                            
                             <div className="space-y-4 pt-4">
                                <FormLabel>Detalhes dos Participantes</FormLabel>
                                {fields.map((item, index) => (
                                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                                        <FormField control={control} name={`participantes.${index}.nome`} render={({ field }) => (
                                            <FormItem><FormLabel>Nome do Participante {index + 1}</FormLabel><FormControl><Input placeholder={`Nome do participante ${index + 1}`} {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={control} name={`participantes.${index}.funcao`} render={({ field }) => (
                                            <FormItem><FormLabel>Função do Participante {index + 1}</FormLabel><FormControl><Input placeholder={`Ex: Apresentador, Convidado`} {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                ))}
                             </div>
                         </div>
                         <div className="pt-4 flex gap-4">
                             <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full">Voltar</Button>
                             <Button type="submit" disabled={enviando} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                                 {enviando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : 'Finalizar Agendamento'}
                             </Button>
                         </div>
                    </>
                )}
            </form>
        </FormProvider>
    );
}
