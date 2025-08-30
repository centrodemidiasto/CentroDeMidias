"use server";

import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

type ActionState = {
  success: boolean;
  message: string;
};

export async function handleSignIn(email: string, password: string):Promise<ActionState> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Sign-in successful for:", userCredential.user.email);
    return { success: true, message: "Login realizado com sucesso." };
  } catch (error: any) {
    console.error("Sign-in error:", error.message);
    return { success: false, message: "Email ou senha inválidos." };
  }
}

export async function handleSignOut(): Promise<ActionState> {
    try {
        await signOut(auth);
        console.log("Sign-out successful.");
        return { success: true, message: "Logout realizado com sucesso." };
    } catch (error: any) {
        console.error("Sign-out error:", error.message);
        return { success: false, message: "Erro ao fazer logout." };
    }
}
