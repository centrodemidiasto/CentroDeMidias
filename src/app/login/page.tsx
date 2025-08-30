import LoginForm from "@/components/login-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)] items-center justify-center py-12 gap-8">
       <Image
          src="/img/centrologo.png"
          width={400}
          height={150}
          alt="Logotipo do Centro de Mídias Educacionais"
          className="object-contain"
        />
      <LoginForm />
    </div>
  );
}
