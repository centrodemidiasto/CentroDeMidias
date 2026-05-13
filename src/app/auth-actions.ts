
"use server";

// Login is handled client-side via supabase.auth.signInWithPassword in login-form.tsx
// This file is kept for potential future server-side auth utilities.

export type ActionState = {
  success: boolean;
  message: string;
};
