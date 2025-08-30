"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { handleSignIn } from "@/app/auth-actions";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const formSchema = z.object({
  password: z.string().min(1, { message: "A senha é obrigatória." }),
});

export default function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const result = await handleSignIn(values.password);
    
    if (result.success) {
      toast({
        title: "Login bem-sucedido!",
        description: "Você será redirecionado para o painel.",
      });
      // Force a hard navigation to ensure the server reads the new cookie.
      window.location.href = "/admin";
    } else {
      setLoading(false);
      toast({
        title: "Erro de login",
        description: result.message,
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full max-w-sm">
        <CardHeader>
            <CardTitle className="text-2xl font-bold font-headline">Acesso Restrito</CardTitle>
            <CardDescription className="font-body">Acesse o painel de gerenciamento de agendamentos.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Senha de Acesso</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
                </Button>
            </form>
            </Form>
        </CardContent>
    </Card>
    
  );
}
