
"use server";

import { validateBookingRequest } from "@/ai/flows/validate-booking-request";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { z } from "zod";

export const BookingDetailsSchema = z.object({
  fullName: z.string().min(3, { message: "Nome completo é obrigatório." }),
  email: z.string().email({ message: "E-mail inválido." }),
  phone: z.string().min(15, { message: "Telefone inválido." }),
  organizationType: z.enum(["interno", "externo"], {
    errorMap: () => ({ message: "Selecione o tipo de órgão." }),
  }),
  department: z.string().optional(),
  externalOrganization: z.string().optional(),
  bookingModalities: z.array(z.string()).min(1, { message: "Selecione ao menos uma modalidade." }),
  requiredMaterials: z.string().optional(),
  participantCount: z.coerce.number().min(1, { message: "Informe o número de participantes." }),
  tableCount: z.coerce.number().min(0, "Mínimo 0.").max(3, "Máximo 3 mesas."),
  chairCount: z.coerce.number().min(0, "Mínimo 0.").max(10, "Máximo 10 cadeiras."),
}).refine(data => {
    if (data.organizationType === 'interno') return !!data.department && data.department.length > 0;
    return true;
}, { message: "Departamento é obrigatório para órgão interno.", path: ["department"]})
.refine(data => {
    if (data.organizationType === 'externo') return !!data.externalOrganization && data.externalOrganization.length > 0;
    return true;
}, { message: "Nome do órgão é obrigatório.", path: ["externalOrganization"]});


type FormState = {
  success: boolean;
  message: string;
} | null;

export async function handleBookingRequest(
  selectedSlots: Record<string, string[]>,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsedData = BookingDetailsSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    organizationType: formData.get("organizationType"),
    department: formData.get("department"),
    externalOrganization: formData.get("externalOrganization"),
    bookingModalities: formData.getAll("bookingModalities"),
    requiredMaterials: formData.get("requiredMaterials"),
    participantCount: formData.get("participantCount"),
    tableCount: formData.get("tableCount"),
    chairCount: formData.get("chairCount"),
  });

  if (!parsedData.success) {
    const errorMessages = parsedData.error.errors.map(e => e.message).join(", ");
    return { success: false, message: errorMessages };
  }
  
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
        ...parsedData.data,
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
