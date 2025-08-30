
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
import { handleAdminBookingRequest } from '@/app/actions';
import { SelectedSlots } from './scheduling-form';

const AdminBookingSchema = z.object({
    fullName: z.string(),
    department: z.string(),
    bookingModalities: z.string(),
});

const bookingModalities = [
    { id: 'admin_audio_video', label: 'Gravação de áudio e vídeo' },
    { id: 'admin_audio_only', label: 'Gravação de áudio' },
    { id: 'admin_live_stream', label: 'Transmissão ao vivo (Live)' },
];

interface AdminBookingFormProps {
    selectedSlots: SelectedSlots;
    onBookingSuccess: () => void;
}

export default function AdminBookingForm({ selectedSlots, onBookingSuccess }: AdminBookingFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof AdminBookingSchema>>({
        defaultValues: {
            fullName: '',
            department: '',
            bookingModalities: undefined,
        },
    });

    const formAction = async (data: z.infer<typeof AdminBookingSchema>) => {
        setIsSubmitting(true);
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        const result = await handleAdminBookingRequest(selectedSlots, null, formData);
        
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

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(formAction)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                 <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome do Responsável</FormLabel>
                            <FormControl>
                                <Input placeholder="Nome completo do responsável" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="department"
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
                    name="bookingModalities"
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
                
                <div className="pt-4">
                     <Button type="submit" disabled={isSubmitting} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                        {isSubmitting ? (
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
