
"use server";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

// This file can be removed or repurposed later if all auth logic moves to the client-side.
// For now, it's kept to avoid breaking imports, but the core logic is now client-side.

type ActionState = {
  success: boolean;
  message: string;
};

// This function is no longer the primary method for login but can be kept for other server-side auth tasks if needed.
export async function handleSignIn(
  email: string,
  password: string
): Promise<ActionState> {
  try {
    // This part is now handled on the client in login-form.tsx, 
    // but we can leave a server-side equivalent for other potential uses.
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true, message: "Login realizado com sucesso." };
    
  } catch (error: any) {
    let message = "Ocorreu um erro durante o login.";
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      message = "E-mail ou senha inválidos.";
    }
    return { success: false, message: message };
  }
}

    