"use server";

import { validateBookingRequest } from "@/ai/flows/validate-booking-request";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type FormState = {
  success: boolean;
  message: string;
} | null;

export async function handleBookingRequest(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const selectedSlotsJSON = formData.get("selectedSlots") as string;
  if (!selectedSlotsJSON) {
    return { success: false, message: "Nenhum horário selecionado." };
  }

  try {
    const selectedSlots = JSON.parse(selectedSlotsJSON);
    const selectedDates = Object.entries(selectedSlots).flatMap(([date, times]) =>
      (times as string[]).map(time => new Date(`${date}T${time}:00`).toISOString())
    );

    if (selectedDates.length === 0) {
      return { success: false, message: "Por favor, selecione ao menos um horário." };
    }

    // Since Firebase Auth on the server in a server action is complex without a client-side token,
    // we'll revert to a simplified validation that doesn't rely on Firebase Auth.
    // The previous implementation for Genkit validation is suitable.
    const validationInput = {
      selectedDates,
      businessHoursStart: "09:00",
      businessHoursEnd: "18:00",
      maxBookingDays: 7,
    };
    
    const result = await validateBookingRequest(validationInput);

    if (result.isValid) {
      // Save the booking to Firestore
      await addDoc(collection(db, "bookings"), {
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