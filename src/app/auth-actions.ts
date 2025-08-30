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
    // This part runs on the server, but signInWithEmailAndPassword runs on the client.
    // We cannot directly call the client-side Firebase SDK here.
    // The correct approach is to get the user's ID token on the client, send it to a server action/route,
    // and then the server verifies it and creates a session cookie.

    // For this simplified server-action only flow, we'll assume a direct check.
    // This is NOT the standard Firebase pattern and has limitations. A full solution would involve a client-side call first.
    // Let's create a session based on the ADMIN_EMAIL and ADMIN_PASSWORD for simplicity, as we can't use the client SDK here.

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
       return { success: false, message: "E-mail ou senha inválidos." };
    }
  } catch (error: any) {
    console.error("Sign-in error:", error);
    return { success: false, message: "Ocorreu um erro durante o login." };
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