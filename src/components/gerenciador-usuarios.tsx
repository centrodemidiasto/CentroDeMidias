
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { listarUsuarios, criarNovoUsuario, atualizarStatusUsuario } from '@/app/actions';
import { Usuario } from '@/lib/types';
import { Loader2, PlusCircle, UserX, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const NovoUsuarioSchema = z.object({
  nome: z.string().min(3, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

export default function GerenciadorUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [modalNovoUsuarioAberto, setModalNovoUsuarioAberto] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof NovoUsuarioSchema>>({
    resolver: zodResolver(NovoUsuarioSchema),
    defaultValues: { nome: '', email: '', senha: '' },
  });

  const carregarUsuarios = async () => {
    setCarregando(true);
    const resultado = await listarUsuarios();
    if (resultado?.sucesso) {
      setUsuarios(resultado.dados || []);
    } else if (resultado) {
      toast({ title: "Erro", description: resultado.mensagem, variant: "destructive" });
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const handleCriarUsuario = async (data: z.infer<typeof NovoUsuarioSchema>) => {
    setEnviando(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    
    const resultado = await criarNovoUsuario(null, formData);
    if (resultado) {
      toast({
        title: resultado.sucesso ? "Sucesso!" : "Erro",
        description: resultado.mensagem,
        variant: resultado.sucesso ? "default" : "destructive",
      });
      if (resultado.sucesso) {
        setModalNovoUsuarioAberto(false);
        form.reset();
        await carregarUsuarios();
      }
    }
    setEnviando(false);
  };

  const handleMudarStatus = async (uid: string, disabled: boolean) => {
    const resultado = await atualizarStatusUsuario(uid, disabled);
    if (resultado) {
      toast({
        title: resultado.sucesso ? "Sucesso!" : "Erro",
        description: resultado.mensagem,
        variant: resultado.sucesso ? "default" : "destructive",
      });
      if (resultado.sucesso) {
        await carregarUsuarios();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Lista de Usuários</h3>
        <Dialog open={modalNovoUsuarioAberto} onOpenChange={setModalNovoUsuarioAberto}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>Preencha os dados para criar um novo acesso ao painel.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCriarUsuario)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl><Input placeholder="Nome do usuário" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl><Input type="email" placeholder="email@seduc.to.gov.br" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="senha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={enviando} className="w-full">
                  {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Usuário
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border rounded-md">
            <TooltipProvider>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {usuarios.length > 0 ? (
                    usuarios.map((user) => (
                        <TableRow key={user.uid}>
                        <TableCell className="font-medium">{user.nome || 'Não informado'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                            {user.lastSignInTime ? format(new Date(user.lastSignInTime), 'dd/MM/yyyy HH:mm') : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-center">
                            <span className={`px-2 py-1 text-xs rounded-full ${user.disabled ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                            {user.disabled ? 'Inativo' : 'Ativo'}
                            </span>
                        </TableCell>
                        <TableCell className="text-right">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleMudarStatus(user.uid, !user.disabled)}
                                    >
                                        {user.disabled ? <UserCheck className="h-4 w-4 text-green-600"/> : <UserX className="h-4 w-4 text-red-600" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{user.disabled ? 'Ativar usuário' : 'Desativar usuário'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center">Nenhum usuário encontrado.</TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </TooltipProvider>
        </div>
      )}
    </div>
  );
}
