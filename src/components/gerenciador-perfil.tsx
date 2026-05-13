
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { atualizarNomeUsuario, atualizarSenhaUsuario } from '@/app/actions';
import type { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { Separator } from './ui/separator';

interface GerenciadorPerfilProps {
  usuario: User | null;
}

const AtualizarNomeSchema = z.object({
  nome: z.string().min(3, "O nome deve ter no mínimo 3 caracteres."),
  uid: z.string(),
});

const AtualizarSenhaSchema = z.object({
  senha: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres."),
  uid: z.string(),
});

export default function GerenciadorPerfil({ usuario }: GerenciadorPerfilProps) {
  const [enviandoNome, setEnviandoNome] = useState(false);
  const [enviandoSenha, setEnviandoSenha] = useState(false);
  const { toast } = useToast();

  const formNome = useForm<z.infer<typeof AtualizarNomeSchema>>({
    resolver: zodResolver(AtualizarNomeSchema),
    defaultValues: {
      nome: usuario?.user_metadata?.nome || '',
      uid: usuario?.id,
    },
  });

  const formSenha = useForm<z.infer<typeof AtualizarSenhaSchema>>({
    resolver: zodResolver(AtualizarSenhaSchema),
    defaultValues: {
      senha: '',
      uid: usuario?.id,
    },
  });

  const handleAtualizarNome = async (data: z.infer<typeof AtualizarNomeSchema>) => {
    setEnviandoNome(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));

    const resultado = await atualizarNomeUsuario(null, formData);
    if (resultado) {
      toast({
        title: resultado.sucesso ? "Sucesso!" : "Erro",
        description: resultado.mensagem,
        variant: resultado.sucesso ? "default" : "destructive",
      });
    }
    setEnviandoNome(false);
  };

  const handleAtualizarSenha = async (data: z.infer<typeof AtualizarSenhaSchema>) => {
    setEnviandoSenha(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));

    const resultado = await atualizarSenhaUsuario(null, formData);
    if (resultado) {
      toast({
        title: resultado.sucesso ? "Sucesso!" : "Erro",
        description: resultado.mensagem,
        variant: resultado.sucesso ? "default" : "destructive",
      });
      if (resultado.sucesso) {
        formSenha.reset({ senha: '', uid: usuario?.id });
      }
    }
    setEnviandoSenha(false);
  };
  
  if (!usuario) {
    return <p>Usuário não encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Alterar Nome</CardTitle>
          <CardDescription>Este nome será usado para identificar suas ações no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...formNome}>
            <form onSubmit={formNome.handleSubmit(handleAtualizarNome)} className="space-y-4">
              <FormField
                control={formNome.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Exibição</FormLabel>
                    <FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={formNome.control} name="uid" render={({ field }) => <Input type="hidden" {...field} />} />
              <Button type="submit" disabled={enviandoNome}>
                {enviandoNome && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Nome
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
          <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...formSenha}>
            <form onSubmit={formSenha.handleSubmit(handleAtualizarSenha)} className="space-y-4">
              <FormField
                control={formSenha.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl><Input type="password" placeholder="Mínimo de 6 caracteres" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={formSenha.control} name="uid" render={({ field }) => <Input type="hidden" {...field} />} />
              <Button type="submit" variant="destructive" disabled={enviandoSenha}>
                {enviandoSenha && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alterar Senha
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
