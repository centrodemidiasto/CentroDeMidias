
'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { handleBookingRequest } from '@/app/actions';
import { SelectedSlots } from './scheduling-form';

// The schema is now only used for type inference on the client
const BookingDetailsSchema = z.object({
    fullName: z.string(),
    email: z.string(),
    phone: z.string(),
    organizationType: z.enum(["interno", "externo"]),
    department: z.string().optional(),
    externalOrganization: z.string().optional(),
    bookingModalities: z.string(),
    requiredMaterials: z.string().optional(),
    participantCount: z.coerce.number(),
    tableCount: z.coerce.number(),
    chairCount: z.coerce.number(),
});


const bookingModalities = [
    { id: 'audio_video', label: 'Gravação de áudio e vídeo' },
    { id: 'audio_only', label: 'Gravação de áudio' },
    { id: 'live_stream', label: 'Transmissão ao vivo (Live)' },
];

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando Solicitação...
                </>
            ) : (
                'Finalizar Agendamento'
            )}
        </Button>
    );
}

function formatPhoneNumber(value: string) {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 3) return `(${phoneNumber}`;
    if (phoneNumberLength < 8) return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
}

interface BookingDetailsFormProps {
    selectedSlots: SelectedSlots;
    onBookingSuccess: () => void;
}

export default function BookingDetailsForm({ selectedSlots, onBookingSuccess }: BookingDetailsFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof BookingDetailsSchema>>({
        // resolver: zodResolver(BookingDetailsSchema), // Removed resolver to prevent client-side validation
        defaultValues: {
            fullName: '',
            email: '',
            phone: '',
            organizationType: undefined,
            department: '',
            externalOrganization: '',
            bookingModalities: undefined,
            requiredMaterials: '',
            participantCount: 1,
            tableCount: 0,
            chairCount: 0,
        },
    });

    const formAction = async (data: z.infer<typeof BookingDetailsSchema>) => {
        setIsSubmitting(true);
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        const result = await handleBookingRequest(selectedSlots, null, formData);
        
        if (result && result.message) {
            const variant = result.success ? 'default' : 'destructive';
            toast({
                title: result.success ? 'Sucesso!' : 'Erro na Solicitação',
                description: <div className="whitespace-pre-wrap">{result.message}</div>,
                variant: variant,
            });
             if (result.success) {
                form.reset();
                onBookingSuccess();
            }
        }
        setIsSubmitting(false);
    };
    
    const organizationType = form.watch('organizationType');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(formAction)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="fullName"
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
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Número de telefone</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="(00) 00000-0000"
                                        {...field}
                                        onChange={(e) => {
                                            const formatted = formatPhoneNumber(e.target.value);
                                            field.onChange(formatted);
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
                    name="organizationType"
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

                {organizationType === 'interno' && (
                    <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Informe o Departamento</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Diretoria de Ensino" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {organizationType === 'externo' && (
                    <FormField
                        control={form.control}
                        name="externalOrganization"
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
                    name="bookingModalities"
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
                                    {bookingModalities.map((item) => (
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
                    name="requiredMaterials"
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
                        name="participantCount"
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
                        name="tableCount"
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
                        name="chairCount"
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
                     <Button type="submit" disabled={isSubmitting} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                        {isSubmitting ? (
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
