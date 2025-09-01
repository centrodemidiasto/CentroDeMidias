
"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from 'firebase-admin/firestore';
import { z } from "zod";

const BookingDetailsSchema = z.object({
    fullName: z.string().min(3, { message: "Nome completo é obrigatório." }),
    email: z.string().email({ message: "E-mail inválido." }),
    phone: z.string().min(15, { message: "Telefone inválido." }),
    recordingTitle: z.string().min(3, { message: "Título da gravação é obrigatório." }),
    organizationType: z.enum(["interno", "externo"], {
        errorMap: () => ({ message: "Selecione o tipo de órgão." }),
    }),
    department: z.string().optional(),
    externalOrganization: z.string().optional(),
    bookingModalities: z.string({ required_error: "Selecione uma modalidade." }),
    requiredMaterials: z.string().optional(),
    participantCount: z.coerce.number().min(1, { message: "Informe o número de participantes." }),
    tableCount: z.coerce.number().min(0, "Mínimo 0.").max(3, "Máximo 3 mesas."),
    chairCount: z.coerce.number().min(0, "Mínimo 0.").max(10, "Máximo 10 cadeiras."),
}).superRefine((data, ctx) => {
    if (data.organizationType === 'interno' && (!data.department || data.department.trim().length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Departamento é obrigatório para órgão interno.",
            path: ["department"],
        });
    }
    if (data.organizationType === 'externo' && (!data.externalOrganization || data.externalOrganization.trim().length === 0)) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Nome do órgão é obrigatório.",
            path: ["externalOrganization"],
        });
    }
});

const AdminBookingSchema = z.object({
    fullName: z.string().min(3, { message: "Nome do responsável é obrigatório." }),
    department: z.string().min(2, { message: "Setor/Departamento é obrigatório." }),
    bookingModalities: z.string({ required_error: "Selecione uma modalidade." }),
});


type FormState = {
    success: boolean;
    message: string;
} | null;


export async function updateBookingStatus(bookingId: string, status: 'approved' | 'rejected') {
    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    
    try {
        await bookingRef.update({ status });
    } catch (error) {
        console.error("Error updating booking status:", error);
        throw new Error("Failed to update booking status.");
    }
}


export async function handleBookingRequest(
    selectedSlots: Record<string, string[]>,
    prevState: FormState,
    formData: FormData
): Promise<FormState> {

    const parsedData = BookingDetailsSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!parsedData.success) {
        const errorMessages = parsedData.error.errors.map(e => `- ${e.message}`).join("\n");
        return { success: false, message: `Por favor, corrija os seguintes erros:\n${errorMessages}` };
    }

    const data = parsedData.data;
    
    if (!selectedSlots || Object.keys(selectedSlots).length === 0) {
        return { success: false, message: "Nenhum horário selecionado." };
    }

    try {
        const selectedDates = Object.entries(selectedSlots).flatMap(([date, times]) =>
            (times as string[]).map(time => new Date(`${date}T${time}:00`).toISOString())
        );

        if (selectedDates.length === 0) {
            return { success: false, message: "Por favor, selecione ao menos um horário." };
        }
        
        const bookingDate = Object.keys(selectedSlots)[0]; // YYYY-MM-DD format
        await adminDb.collection("bookings").add({
            ...data,
            selectedSlots,
            bookingDate: bookingDate,
            createdAt: FieldValue.serverTimestamp(),
            status: "pending"
        });
        return { success: true, message: "Seu agendamento foi solicitado com sucesso e está pendente de aprovação!" };
        
    } catch (error) {
        console.error("Error in handleBookingRequest:", error);
        return { success: false, message: "Ocorreu um erro inesperado. Tente novamente." };
    }
}

export async function handleAdminBookingRequest(
    selectedSlots: Record<string, string[]>,
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    const parsedData = AdminBookingSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!parsedData.success) {
        const errorMessages = parsedData.error.errors.map(e => `- ${e.message}`).join("\n");
        return { success: false, message: `Por favor, corrija os seguintes erros:\n${errorMessages}` };
    }
    
    const data = parsedData.data;

    if (!selectedSlots || Object.keys(selectedSlots).length === 0) {
        return { success: false, message: "Nenhum horário selecionado." };
    }

    try {
       const bookingDate = Object.keys(selectedSlots)[0];
       
       await adminDb.collection("bookings").add({
            ...data,
            organizationType: 'interno',
            email: 'centrodemidias@seduc.to.gov.br', // Add default email for admin bookings
            selectedSlots,
            bookingDate: bookingDate, 
            createdAt: FieldValue.serverTimestamp(),
            status: "approved" // Admin bookings are auto-approved
       });

       return { success: true, message: "Agendamento rápido realizado e aprovado com sucesso!" };

    } catch (error) {
       console.error("Error in handleAdminBookingRequest:", error);
       return { success: false, message: "Ocorreu um erro inesperado. Tente novamente." };
    }
}
