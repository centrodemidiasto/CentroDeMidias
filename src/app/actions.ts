
"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from 'firebase-admin/firestore';
import { z } from "zod";
import { google } from 'googleapis';
const { JWT } = google.auth; // Importa o JWT para autenticação com personificação

const BookingDetailsSchema = z.object({
    fullName: z.string().min(3, { message: "Nome completo é obrigatório." }),
    email: z.string().email({ message: "E-mail inválido." }),
    phone: z.string().min(15, { message: "Telefone inválido." }),
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


// Helper to get Google Calendar API client (VERSÃO ATUALIZADA)
async function getGoogleCalendarClient() {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const userToImpersonate = process.env.GOOGLE_CALENDAR_ID; // O alvo da delegação

    if (!clientEmail || !privateKey || !userToImpersonate) {
        console.error("Firebase/Google credentials or Calendar ID are missing.");
        throw new Error("API configuration is missing on the server.");
    }
    
    // Usando JWT para incluir a personificação (subject)
    const auth = new JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/calendar"],
        subject: userToImpersonate, // <-- A MUDANÇA CRUCIAL ESTÁ AQUI
    });

    const calendar = google.calendar({ version: "v3", auth });
    return calendar;
}


export async function updateBookingStatus(bookingId: string, status: 'approved' | 'rejected') {
    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    
    try {
        const bookingSnap = await bookingRef.get();
        if (!bookingSnap.exists) {
            throw new Error("Agendamento não encontrado.");
        }
        const bookingData = bookingSnap.data()!;
        const calendarEventId = bookingData.calendarEventId;

        const calendar = await getGoogleCalendarClient();
        const calendarId = process.env.GOOGLE_CALENDAR_ID;
        
        if (!calendarId) {
            console.error("GOOGLE_CALENDAR_ID is not defined in environment variables.");
            throw new Error("Google Calendar ID not configured.");
        }

        if (status === 'approved') {
            const date = Object.keys(bookingData.selectedSlots)[0];
            const times = bookingData.selectedSlots[date].sort();
            const startTimeStr = times[0];
            
            // Calculate end time - assumes 1 hour slot per selected time
            const lastTimeStr = times[times.length - 1];
            const endHour = parseInt(lastTimeStr.split(':')[0]) + 1;

            const event = {
                summary: `Gravação: ${bookingData.fullName}`,
                description: `Modalidade: ${bookingData.bookingModalities}\nSolicitante: ${bookingData.fullName} (${bookingData.email})\nÓrgão: ${bookingData.organizationType === 'interno' ? bookingData.department : bookingData.externalOrganization}`,
                start: {
                    dateTime: `${date}T${startTimeStr}:00`,
                    timeZone: "America/Araguaina",
                },
                end: {
                    dateTime: `${date}T${String(endHour).padStart(2, '0')}:00:00`,
                    timeZone: "America/Araguaina",
                },
                attendees: bookingData.email ? [{ email: bookingData.email }] : [],
                reminders: {
                    useDefault: true,
                },
            };

            const createdEvent = await calendar.events.insert({
                calendarId,
                requestBody: event,
            });

            await bookingRef.update({ status, calendarEventId: createdEvent.data.id });

        } else if (status === 'rejected') {
            await bookingRef.update({ status }); // Update status first
             if (calendarEventId) {
                try {
                    await calendar.events.delete({
                        calendarId,
                        eventId: calendarEventId,
                    });
                } catch (err: any) {
                    if (err.code !== 410 && err.code !== 404) { // 410: Gone, 404: Not Found
                        console.error("Error deleting Google Calendar event, but proceeding:", err.message);
                        // Do not re-throw, as the main goal (rejecting booking) is done.
                    }
                }
                await bookingRef.update({ calendarEventId: null });
             }
        }
    } catch (error) {
        console.error("Detailed error in updateBookingStatus:", error);
        throw new Error("Failed to update booking status or sync with Google Calendar.");
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
        console.error("--- DETAILED ERROR IN handleBookingRequest ---");
        if (error instanceof Error) {
            console.error("Error Name:", error.name);
            console.error("Error Message:", error.message);
            console.error("Error Stack:", error.stack);
        } else {
            console.error("Caught a non-Error object:", error);
        }
        console.error("--- END OF DETAILED ERROR ---");
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
       
       // SINTAXE DO ADMIN SDK CORRIGIDA AQUI
       const newBookingRef = await adminDb.collection("bookings").add({
            ...data,
            organizationType: 'interno',
            email: 'centrodemidias@seduc.to.gov.br', // Add default email for admin bookings
            selectedSlots,
            bookingDate: bookingDate, 
            createdAt: FieldValue.serverTimestamp(), // SINTAXE CORRIGIDA
            status: "pending" // Set to pending to trigger the approval flow
       });

       await updateBookingStatus(newBookingRef.id, 'approved');

       return { success: true, message: "Agendamento rápido realizado e aprovado com sucesso!" };

    } catch (error) {
       console.error("--- DETAILED ERROR IN handleAdminBookingRequest ---");
       if (error instanceof Error) {
            console.error("Error Name:", error.name);
            console.error("Error Message:", error.message);
            console.error("Error Stack:", error.stack);
        } else {
            console.error("Caught a non-Error object:", error);
        }
       console.error("--- END OF DETAILED ERROR ---");
       return { success: false, message: "Ocorreu um erro inesperado. Tente novamente." };
    }
}

// Adicione esta função no final do seu arquivo src/app/actions.ts
export async function testFirestoreWrite() {
    console.log("--- INICIANDO TESTE DE ESCRITA NO FIRESTORE ---");
    try {
      const testData = {
        timestamp: FieldValue.serverTimestamp(),
        status: "SUCCESS",
        message: "A conexão com o Admin SDK e a escrita no Firestore funcionaram.",
      };
  
      const docRef = await adminDb.collection("testLogs").add(testData);
      console.log("--- SUCESSO! Documento de teste escrito com o ID:", docRef.id);
      return { success: true, message: `Teste bem-sucedido! Documento criado em testLogs com o ID: ${docRef.id}` };
  
    } catch (error: any) {
      console.error("--- ERRO NO TESTE DE ESCRITA ---");
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      console.error("--- FIM DO ERRO DE TESTE ---");
      return { success: false, message: `O teste de escrita falhou: ${error.message}` };
    }
  }
