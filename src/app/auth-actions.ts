"use server";

import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

type ActionState = {
  success: boolean;
  message: string;
};

export async function handleSignIn(email: string, password: string):Promise<ActionState> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true, message: "Login realizado com sucesso." };
  } catch (error: any) {
    return { success: false, message: "Email ou senha inválidos." };
  }
}

export async function handleSignOut(): Promise<ActionState> {
    try {
        await signOut(auth);
        return { success: true, message: "Logout realizado com sucesso." };
    } catch (error: any) {
        return { success: false, message: "Erro ao fazer logout." };
    }
}