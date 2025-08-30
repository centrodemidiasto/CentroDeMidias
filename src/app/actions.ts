
"use server";

import { validateBookingRequest } from "@/ai/flows/validate-booking-request";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { z } from "zod";

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


type FormState = {
  success: boolean;
  message: string;
} | null;

export async function handleBookingRequest(
  selectedSlots: Record<string, string[]>,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  
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
      await addDoc(collection(db, "bookings"), {
        ...data,
        selectedSlots,
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

export async function blockSlots(slotsToBlock: Record<string, string[]>): Promise<FormState> {
    console.log("[Action: blockSlots] Received data:", JSON.stringify(slotsToBlock, null, 2));
    if (!slotsToBlock || Object.keys(slotsToBlock).length === 0) {
        return { success: false, message: 'Nenhum horário selecionado para bloquear.' };
    }

    try {
        const batch = writeBatch(db);
        const blockedSlotsRef = collection(db, 'blockedSlots');

        for (const date in slotsToBlock) {
            if (slotsToBlock[date] && slotsToBlock[date].length > 0) {
                const q = query(blockedSlotsRef, where("date", "==", date));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    console.log(`[Action: blockSlots] No existing doc for date ${date}. Creating new one.`);
                    const newDocRef = doc(blockedSlotsRef); // Create a new document reference
                    batch.set(newDocRef, { date, times: slotsToBlock[date] });
                } else {
                    const docSnapshot = querySnapshot.docs[0];
                    const docRef = docSnapshot.ref;
                    const existingTimes = docSnapshot.data().times || [];
                    const updatedTimes = [...new Set([...existingTimes, ...slotsToBlock[date]])];
                    console.log(`[Action: blockSlots] Existing doc for date ${date}. Updating times to:`, updatedTimes);
                    batch.update(docRef, { times: updatedTimes });
                }
            }
        }
        await batch.commit();
        console.log("[Action: blockSlots] Batch commit successful.");
        return { success: true, message: 'Horários bloqueados com sucesso!' };
    } catch (error) {
        console.error("[Action: blockSlots] Error caught:", error);
        if (error instanceof Error) {
            return { success: false, message: `Ocorreu um erro ao bloquear os horários: ${error.message}` };
        }
        return { success: false, message: 'Ocorreu um erro desconhecido ao bloquear os horários.' };
    }
}

export async function unblockSlots(slotsToUnblock: Record<string, string[]>): Promise<FormState> {
     console.log("[Action: unblockSlots] Received data:", JSON.stringify(slotsToUnblock, null, 2));
     if (!slotsToUnblock || Object.keys(slotsToUnblock).length === 0) {
        return { success: false, message: 'Nenhum horário selecionado para desbloquear.' };
    }
    try {
        const batch = writeBatch(db);
        const blockedSlotsRef = collection(db, 'blockedSlots');

         for (const date in slotsToUnblock) {
            const timesToUnblock = slotsToUnblock[date];
            if (timesToUnblock && timesToUnblock.length > 0) {
                 const q = query(blockedSlotsRef, where("date", "==", date));
                 const querySnapshot = await getDocs(q);
                 if (!querySnapshot.empty) {
                     const docSnapshot = querySnapshot.docs[0];
                     const docRef = docSnapshot.ref;
                     const existingTimes = docSnapshot.data().times || [];
                     const updatedTimes = existingTimes.filter((time: string) => !timesToUnblock.includes(time));
                     
                     if (updatedTimes.length > 0) {
                        console.log(`[Action: unblockSlots] Updating doc for date ${date}. New times:`, updatedTimes);
                        batch.update(docRef, { times: updatedTimes });
                     } else {
                        console.log(`[Action: unblockSlots] No times left for date ${date}. Deleting doc.`);
                        batch.delete(docRef);
                     }
                 }
            }
        }
        await batch.commit();
        console.log("[Action: unblockSlots] Batch commit successful.");
        return { success: true, message: 'Horários desbloqueados com sucesso!' };
    } catch (error) {
         console.error("[Action: unblockSlots] Error caught:", error);
        if (error instanceof Error) {
            return { success: false, message: `Ocorreu um erro ao desbloquear os horários: ${error.message}` };
        }
        return { success: false, message: 'Ocorreu um erro desconhecido ao desbloquear os horários.' };
    }
}

    