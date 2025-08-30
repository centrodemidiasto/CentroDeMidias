"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

type ActionState = {
  success: boolean;
  message: string;
};

const secretKey = process.env.SESSION_SECRET;
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h") // Token expires in 1 hour
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    // This can happen if the token is expired or invalid
    return null;
  }
}

export async function handleSignIn(
  email: string,
  password: string
): Promise<ActionState> {
  try {
    // We can't use the client SDK directly here, but a custom token approach
    // or admin SDK would be best. For this server-action flow, we will make
    // an exception and use environment variables for a specific admin user.
    // This simplifies the flow by not requiring client-side token generation.
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const sessionPayload = {
        user: { email },
        expires,
      };

      const session = await encrypt(sessionPayload);

      cookies().set("session", session, { expires, httpOnly: true });

      return { success: true, message: "Login realizado com sucesso." };
    } else {
      // Attempt to sign in with Firebase for other users if needed,
      // but for now, we only allow the admin.
      return { success: false, message: "E-mail ou senha inválidos." };
    }
  } catch (error: any) {
    let message = "Ocorreu um erro durante o login.";
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      message = "E-mail ou senha inválidos.";
    }
    console.error("Sign-in error:", error);
    return { success: false, message: message };
  }
}

export async function handleSignOut() {
  cookies().set("session", "", { expires: new Date(0) });
  redirect("/");
}

export async function verifySession() {
  const cookie = cookies().get("session")?.value;
  const session = await decrypt(cookie);

  if (!session?.user) {
    return { isLoggedIn: false, user: null };
  }

  return { isLoggedIn: true, user: session.user };
}
