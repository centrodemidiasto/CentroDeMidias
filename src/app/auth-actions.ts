"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

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

export async function handleSignIn(password: string): Promise<ActionState> {
  if (password === process.env.ADMIN_PASSWORD) {
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const sessionPayload = {
      isLoggedIn: true,
      expires,
    };

    const session = await encrypt(sessionPayload);

    cookies().set("session", session, { expires, httpOnly: true });

    return { success: true, message: "Login realizado com sucesso." };
  }
  return { success: false, message: "Senha inválida." };
}

export async function handleSignOut() {
  cookies().set("session", "", { expires: new Date(0) });
  redirect('/');
}

export async function verifySession() {
  const cookie = cookies().get("session")?.value;
  const session = await decrypt(cookie);

  if (!session?.isLoggedIn) {
    return { isLoggedIn: false };
  }
  
  return { isLoggedIn: true };
}
