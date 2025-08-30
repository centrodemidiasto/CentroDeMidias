
"use server";

import { validateBookingRequest } from "@/ai/flows/validate-booking-request";
import { db } from "@/lib/firebase-admin"; // Use Firebase Admin SDK
import { collection, addDoc, serverTimestamp, getDocs, query, where, writeBatch, doc, getDoc, updateDoc } from "firebase/firestore";
import { z } from "zod";
import { google } from 'googleapis';

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


// Helper to get Google Calendar API client
async function getGoogleCalendarClient() {
    const credentials = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const calendar = google.calendar({ version: "v3", auth });
    return calendar;
}


export async function updateBookingStatus(bookingId: string, status: 'approved' | 'rejected') {
    if (!db) {
      throw new Error("A conexão com o banco de dados não foi inicializada.");
    }
    const bookingRef = doc(db, "bookings", bookingId);
    
    try {
        const bookingSnap = await getDoc(bookingRef);
        if (!bookingSnap.exists()) {
            throw new Error("Agendamento não encontrado.");
        }
        const bookingData = bookingSnap.data();
        const calendarEventId = bookingData.calendarEventId;

        // Update Firestore first
        await updateDoc(bookingRef, { status });

        const calendar = await getGoogleCalendarClient();
        const calendarId = process.env.GOOGLE_CALENDAR_ID;
        
        if (!calendarId) {
            throw new Error("ID do Google Calendar não configurado nas variáveis de ambiente.");
        }

        if (status === 'approved') {
            const date = Object.keys(bookingData.selectedSlots)[0];
            const times = bookingData.selectedSlots[date].sort();
            const startTimeStr = times[0];
            const lastTimeStr = times[times.length - 1];
            
            const startHour = parseInt(startTimeStr.split(':')[0]);
            const endHour = parseInt(lastTimeStr.split(':')[0]) + 1; // Assuming each slot is 1 hour

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

            // Store the event ID in Firestore so we can cancel it later
            await updateDoc(bookingRef, { calendarEventId: createdEvent.data.id });

        } else if (status === 'rejected' && calendarEventId) {
             // If the booking is rejected and there was a calendar event, delete it
            try {
                await calendar.events.delete({
                    calendarId,
                    eventId: calendarEventId,
                });
            } catch (err: any) {
                // If the event is already deleted on Google Calendar, ignore the error.
                if (err.code !== 410) {
                    throw err; // Re-throw other errors
                }
            }
            // Optionally remove the event ID from Firestore
            await updateDoc(bookingRef, { calendarEventId: null });
        }
    } catch (error) {
        console.error("Error updating booking status or calendar event:", error);
        // We don't revert the status, but we throw an error to be handled by the client
        throw new Error("Falha ao atualizar o status do agendamento ou sincronizar com o Google Calendar.");
    }
}


export async function handleBookingRequest(
  selectedSlots: Record<string, string[]>,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  if (!db) {
    return { success: false, message: "Ocorreu um erro de configuração do servidor. Tente novamente mais tarde." };
  }
  const rawFormData = Object.fromEntries(formData.entries());
  console.log("Raw form data received:", rawFormData);
  
  const parsedData = BookingDetailsSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    organizationType: formData.get("organizationType"),
    department: formData.get("department"),
    externalOrganization: formData.get("externalOrganization"),
    bookingModalities: formData.get("bookingModalities"),
    requiredMaterials: formData.get("requiredMaterials"),
    participantCount: formData.get("participantCount"),
    tableCount: formData.get("tableCount"),
    chairCount: formData.get("chairCount"),
  });


  if (!parsedData.success) {
    console.log("Zod validation failed:", parsedData.error.flatten());
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

    const validationInput = {
      selectedDates,
      businessHoursStart: "09:00",
      businessHoursEnd: "18:00",
      maxBookingDays: 7,
    };
    
    const result = await validateBookingRequest(validationInput);

    if (result.isValid) {
      const bookingDate = Object.keys(selectedSlots)[0]; // YYYY-MM-DD format
      await addDoc(collection(db, "bookings"), {
        ...data,
        selectedSlots,
        bookingDate: bookingDate, // Add this field for querying
        createdAt: serverTimestamp(),
        status: "pending"
      });
      return { success: true, message: "Seu agendamento foi solicitado com sucesso e está pendente de aprovação!" };
    } else {
      return { success: false, message: result.reason || "Ocorreu um erro na validação do agendamento." };
    }
  } catch (error) {
    console.error("Error handling booking request:", error);
    return { success: false, message: "Ocorreu um erro inesperado. Tente novamente." };
  }
}

export async function handleAdminBookingRequest(
    selectedSlots: Record<string, string[]>,
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    if (!db) {
      return { success: false, message: "Ocorreu um erro de configuração do servidor. Tente novamente mais tarde." };
    }
    const parsedData = AdminBookingSchema.safeParse({
        fullName: formData.get("fullName"),
        department: formData.get("department"),
        bookingModalities: formData.get("bookingModalities"),
    });

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
       const newBookingRef = await addDoc(collection(db, "bookings"), {
            ...data,
            organizationType: 'interno',
            email: 'centrodemidias@seduc.to.gov.br', // Add default email for admin bookings
            selectedSlots,
            bookingDate: bookingDate, 
            createdAt: serverTimestamp(),
            status: "pending" // Set to pending to trigger the approval flow
       });

       // Now, call the approval function which also creates the calendar event
       await updateBookingStatus(newBookingRef.id, 'approved');

       return { success: true, message: "Agendamento rápido realizado e aprovado com sucesso!" };

    } catch (error) {
        console.error("Error handling admin booking request:", error);
        return { success: false, message: "Ocorreu um erro inesperado. Tente novamente." };
    }
}
