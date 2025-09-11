
"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { z } from "zod";

const DetalhesReservaSchema = z.object({
    nomeCompleto: z.string().min(3, { message: "Nome completo é obrigatório." }),
    email: z.string().email({ message: "E-mail inválido." }),
    telefone: z.string().min(15, { message: "Telefone inválido." }),
    tituloGravacao: z.string().min(3, { message: "Título da gravação é obrigatório." }),
    tipoOrgao: z.enum(["interno", "externo"], {
        errorMap: () => ({ message: "Selecione o tipo de órgão." }),
    }),
    departamento: z.string().optional(),
    organizacaoExterna: z.string().optional(),
    modalidadesReserva: z.string({ required_error: "Selecione uma modalidade." }),
    materiaisNecessarios: z.string().optional(),
    numeroParticipantes: z.coerce.number().min(1, { message: "Informe o número de participantes." }),
    numeroMesas: z.coerce.number().min(0, "Mínimo 0.").max(3, "Máximo 3 mesas."),
    numeroCadeiras: z.coerce.number().min(0, "Mínimo 0.").max(10, "Máximo 10 cadeiras."),
    termosDeUso: z.literal(true, {
        errorMap: () => ({ message: "Você deve aceitar as normas de uso para continuar." }),
    }),
    estudio: z.string() // Adicionado para identificar o estúdio
}).superRefine((data, ctx) => {
    if (data.tipoOrgao === 'interno' && (!data.departamento || data.departamento.trim().length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Departamento é obrigatório para órgão interno.",
            path: ["departamento"],
        });
    }
    if (data.tipoOrgao === 'externo' && (!data.organizacaoExterna || data.organizacaoExterna.trim().length === 0)) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Nome do órgão é obrigatório.",
            path: ["organizacaoExterna"],
        });
    }
});

const ReservaAdminSchema = z.object({
    tituloGravacao: z.string().min(3, { message: "Título da gravação é obrigatório." }),
    nomeCompleto: z.string().min(3, { message: "Nome do responsável é obrigatório." }),
    departamento: z.string().min(2, { message: "Setor/Departamento é obrigatório." }),
    modalidadesReserva: z.string({ required_error: "Selecione uma modalidade." }),
    estudio: z.string() // Adicionado para identificar o estúdio
});


type EstadoFormulario = {
    sucesso: boolean;
    mensagem: string;
    dados?: any;
} | null;


export async function atualizarStatusReserva(
    reservaId: string, 
    status: 'aprovado' | 'rejeitado',
    adminUser: { nome: string | null; email: string | null; }
) {
    const reservaRef = adminDb.collection("reservas").doc(reservaId);
    const usuarioResponsavel = adminUser.nome || adminUser.email || 'Sistema';
    const timestamp = new Date();

    try {
        const dadosAtualizacao: any = { 
            status,
            historico: FieldValue.arrayUnion({
                acao: `Status alterado para ${status}`,
                usuario: usuarioResponsavel,
                data: timestamp
            })
        };

        if (status === 'aprovado') {
            dadosAtualizacao.aprovadoPor = usuarioResponsavel;
        }

        await reservaRef.update(dadosAtualizacao);

    } catch (error: any) {
        throw new Error(`Falha ao atualizar o status da reserva: ${error.message}`);
    }
}


export async function handleSolicitacaoReserva(
    horariosSelecionados: Record<string, string[]>,
    estadoAnterior: EstadoFormulario,
    formData: FormData
): Promise<EstadoFormulario> {
    
    const rawData = Object.fromEntries(formData.entries());
    const parsedData = {
      ...rawData,
      termosDeUso: rawData.termosDeUso === 'on',
    };

    const dadosParseados = DetalhesReservaSchema.safeParse(parsedData);

    if (!dadosParseados.success) {
        const mensagensErro = dadosParseados.error.errors.map(e => `- ${e.message}`).join("\n");
        return { sucesso: false, mensagem: `Por favor, corrija os seguintes erros:\n${mensagensErro}` };
    }

    const { termosDeUso, ...dados } = dadosParseados.data;
    
    if (!horariosSelecionados || Object.keys(horariosSelecionados).length === 0) {
        return { sucesso: false, mensagem: "Nenhum horário selecionado." };
    }

    try {
        const datasSelecionadas = Object.entries(horariosSelecionados).flatMap(([data, horarios]) =>
            (horarios as string[]).map(horario => new Date(`${data}T${horario}:00`).toISOString())
        );

        if (datasSelecionadas.length === 0) {
            return { sucesso: false, mensagem: "Por favor, selecione ao menos um horário." };
        }
        
        const dataReserva = Object.keys(horariosSelecionados)[0]; // Formato YYYY-MM-DD
        const timestamp = new Date();
        await adminDb.collection("reservas").add({
            ...dados,
            horariosSelecionados,
            dataReserva: dataReserva,
            criadoEm: timestamp,
            status: "pendente",
            historico: FieldValue.arrayUnion({
                acao: "Solicitação de reserva criada",
                usuario: dados.email,
                data: timestamp
            })
        });
        return { sucesso: true, mensagem: "Seu agendamento foi solicitado com sucesso e está pendente de aprovação!" };
        
    } catch (error) {
        return { sucesso: false, mensagem: "Ocorreu um erro inesperado. Tente novamente." };
    }
}

export async function handleSolicitacaoReservaAdmin(
    horariosSelecionados: Record<string, string[]>,
    estadoAnterior: EstadoFormulario,
    formData: FormData
): Promise<EstadoFormulario> {
    const dadosParseados = ReservaAdminSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!dadosParseados.success) {
        const mensagensErro = dadosParseados.error.errors.map(e => `- ${e.message}`).join("\n");
        return { sucesso: false, mensagem: `Por favor, corrija os seguintes erros:\n${mensagensErro}` };
    }
    
    const dados = dadosParseados.data;

    if (!horariosSelecionados || Object.keys(horariosSelecionados).length === 0) {
        return { sucesso: false, mensagem: "Nenhum horário selecionado." };
    }

    try {
       const dataReserva = Object.keys(horariosSelecionados)[0];
       const timestamp = new Date();
       
       await adminDb.collection("reservas").add({
            ...dados,
            tipoOrgao: 'interno',
            email: 'centrodemidias@seduc.to.gov.br', // Adiciona email padrão para reservas admin
            horariosSelecionados,
            dataReserva: dataReserva, 
            criadoEm: timestamp,
            status: "aprovado", // Reservas admin são auto-aprovadas
            aprovadoPor: 'Sistema (Admin)',
            historico: FieldValue.arrayUnion({
                acao: "Agendamento rápido criado e aprovado",
                usuario: "Sistema (Admin)",
                data: timestamp
            })
       });

       return { sucesso: true, mensagem: "Agendamento rápido realizado e aprovado com sucesso!" };

    } catch (error) {
       return { sucesso: false, mensagem: "Ocorreu um erro inesperado. Tente novamente." };
    }
}


export async function handleSolicitacaoReservaRecorrente(
    datasSelecionadas: string[],
    horariosSelecionados: string[],
    estadoAnterior: EstadoFormulario,
    formData: FormData
): Promise<EstadoFormulario> {
    const ReservaAdminRecorrenteSchema = z.object({
        tituloGravacao: z.string().min(3, { message: "Título da gravação é obrigatório." }),
        nomeCompleto: z.string().min(3, { message: "Nome do responsável é obrigatório." }),
        departamento: z.string().min(2, { message: "Setor/Departamento é obrigatório." }),
        modalidadesReserva: z.string({ required_error: "Selecione uma modalidade." }),
    });

     const dadosParseados = ReservaAdminRecorrenteSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!dadosParseados.success) {
        const mensagensErro = dadosParseados.error.errors.map(e => `- ${e.message}`).join("\n");
        return { sucesso: false, mensagem: `Por favor, corrija os seguintes erros:\n${mensagensErro}` };
    }
    
    const dados = dadosParseados.data;
    const estudio = formData.get('estudio') as string;

    if (!datasSelecionadas || datasSelecionadas.length === 0 || !horariosSelecionados || horariosSelecionados.length === 0 || !estudio) {
        return { sucesso: false, mensagem: "Nenhuma data, horário ou estúdio selecionado." };
    }

    try {
        const batch = adminDb.batch();
        const reservasRef = adminDb.collection("reservas");
        const timestamp = new Date();

        datasSelecionadas.forEach(data => {
            const novaReservaRef = reservasRef.doc();
            batch.set(novaReservaRef, {
                ...dados,
                tipoOrgao: 'interno',
                email: 'centrodemidias@seduc.to.gov.br',
                horariosSelecionados: { [data]: horariosSelecionados },
                dataReserva: data,
                estudio: estudio, 
                criadoEm: timestamp,
                status: "aprovado",
                aprovadoPor: 'Sistema (Admin Recorrente)',
                historico: FieldValue.arrayUnion({
                    acao: "Agendamento recorrente criado e aprovado",
                    usuario: "Sistema (Admin Recorrente)",
                    data: timestamp
                })
            });
        });

       await batch.commit();

       return { sucesso: true, mensagem: `${datasSelecionadas.length} agendamentos recorrentes realizados e aprovados com sucesso!` };

    } catch (error) {
       return { sucesso: false, mensagem: "Ocorreu um erro inesperado. Tente novamente." };
    }
}


const EdicaoReservaSchema = z.object({
    nomeCompleto: z.string().optional(),
    email: z.string().optional(),
    telefone: z.string().optional(),
    tituloGravacao: z.string().optional(),
    tipoOrgao: z.enum(["interno", "externo"]),
    departamento: z.string().optional(),
    organizacaoExterna: z.string().optional(),
    modalidadesReserva: z.string(),
    materiaisNecessarios: z.string().optional(),
    numeroParticipantes: z.coerce.number().optional(),
    numeroMesas: z.coerce.number().optional(),
    numeroCadeiras: z.coerce.number().optional(),
    estudio: z.string(),
}).superRefine((data, ctx) => {
    if (data.tipoOrgao === 'interno' && (!data.departamento || data.departamento.trim().length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Departamento é obrigatório para órgão interno.",
            path: ["departamento"],
        });
    }
    if (data.tipoOrgao === 'externo' && (!data.organizacaoExterna || data.organizacaoExterna.trim().length === 0)) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Nome do órgão é obrigatório.",
            path: ["organizacaoExterna"],
        });
    }
});


export async function handleUpdateReserva(
    reservaId: string,
    horariosSelecionados: Record<string, string[]>,
    adminUser: { nome: string | null; email: string | null; },
    estadoAnterior: EstadoFormulario,
    formData: FormData
): Promise<EstadoFormulario> {
    const rawData = Object.fromEntries(formData.entries());
    
    const dadosParseados = EdicaoReservaSchema.safeParse(rawData);

    if (!dadosParseados.success) {
        const mensagensErro = dadosParseados.error.errors.map(e => `- ${e.path.join('.')} ${e.message}`).join("\n");
        return { sucesso: false, mensagem: `Por favor, corrija os seguintes erros:\n${mensagensErro}` };
    }

    const dados = dadosParseados.data;
    
    if (!horariosSelecionados || Object.keys(horariosSelecionados).length === 0) {
        return { sucesso: false, mensagem: "Nenhum horário selecionado." };
    }

    const usuarioResponsavel = adminUser.nome || adminUser.email || 'Sistema';
    const timestamp = new Date();

    try {
        const dataReserva = Object.keys(horariosSelecionados)[0];
        
        const reservaRef = adminDb.collection("reservas").doc(reservaId);

        await reservaRef.update({
            ...dados,
            horariosSelecionados,
            dataReserva: dataReserva,
            ultimaAlteracaoPor: usuarioResponsavel,
            historico: FieldValue.arrayUnion({
                acao: "Reserva atualizada",
                usuario: usuarioResponsavel,
                data: timestamp
            })
        });

        return { sucesso: true, mensagem: "Agendamento atualizado com sucesso!" };
        
    } catch (error: any) {
        return { sucesso: false, mensagem: `Ocorreu um erro inesperado ao atualizar. Causa: ${error.message}` };
    }
}

// --- Funções de Gerenciamento de Usuários ---

const NovoUsuarioSchema = z.object({
  nome: z.string().min(3, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

export async function criarNovoUsuario(estadoAnterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const dadosParseados = NovoUsuarioSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!dadosParseados.success) {
    const mensagensErro = dadosParseados.error.errors.map(e => `- ${e.message}`).join("\n");
    return { sucesso: false, mensagem: `Por favor, corrija os seguintes erros:\n${mensagensErro}` };
  }
  
  const { nome, email, senha } = dadosParseados.data;
  
  try {
    const auth = getAuth();
    const userRecord = await auth.createUser({
      email: email,
      password: senha,
      displayName: nome,
      emailVerified: true,
      disabled: false,
    });

    await adminDb.collection('usuarios').doc(userRecord.uid).set({
      nome: nome,
      email: email,
    });

    return { sucesso: true, mensagem: `Usuário ${nome} criado com sucesso.` };
  } catch (error: any) {
    let mensagem = "Ocorreu um erro inesperado.";
    if (error.code === 'auth/email-already-exists') {
      mensagem = "Este endereço de e-mail já está em uso por outro usuário.";
    } else if (error.code === 'auth/invalid-password') {
      mensagem = "A senha fornecida é inválida. Deve ter pelo menos 6 caracteres.";
    }
    return { sucesso: false, mensagem: mensagem };
  }
}

export async function atualizarStatusUsuario(uid: string, disabled: boolean): Promise<EstadoFormulario> {
  try {
    const auth = getAuth();
    await auth.updateUser(uid, { disabled });
    const acao = disabled ? "desativado" : "ativado";
    return { sucesso: true, mensagem: `Usuário ${acao} com sucesso.` };
  } catch (error: any) {
    return { sucesso: false, mensagem: "Falha ao atualizar o status do usuário." };
  }
}


export async function listarUsuarios(): Promise<EstadoFormulario> {
  try {
    const auth = getAuth();
    const userRecords = await auth.listUsers();
    
    const usuarios = await Promise.all(userRecords.users.map(async (user) => {
        let nome = user.displayName || '';
        if (!nome) {
            try {
                const userDoc = await adminDb.collection('usuarios').doc(user.uid).get();
                if(userDoc.exists) {
                    nome = userDoc.data()?.nome || '';
                }
            } catch (dbError) {
                // se não encontrar o usuário no firestore, continua com o nome vazio
            }
        }
        return {
            uid: user.uid,
            email: user.email,
            nome: nome,
            disabled: user.disabled,
            lastSignInTime: user.metadata.lastSignInTime,
        };
    }));

    return { sucesso: true, mensagem: "Usuários listados com sucesso.", dados: usuarios };
  } catch (error: any) {
    return { sucesso: false, mensagem: "Falha ao buscar a lista de usuários." };
  }
}


const AtualizarNomeSchema = z.object({
  nome: z.string().min(3, "Nome é obrigatório"),
  uid: z.string(),
});

export async function atualizarNomeUsuario(estadoAnterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const dadosParseados = AtualizarNomeSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!dadosParseados.success) {
    const mensagensErro = dadosParseados.error.errors.map(e => `- ${e.message}`).join("\n");
    return { sucesso: false, mensagem: `Erro de validação:\n${mensagensErro}` };
  }

  const { nome, uid } = dadosParseados.data;
  
  try {
    const auth = getAuth();
    await auth.updateUser(uid, { displayName: nome });
    await adminDb.collection('usuarios').doc(uid).update({ nome });

    return { sucesso: true, mensagem: "Nome atualizado com sucesso." };
  } catch (error: any) {
    return { sucesso: false, mensagem: `Falha ao atualizar o nome: ${error.message}` };
  }
}

const AtualizarSenhaSchema = z.object({
  senha: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
  uid: z.string(),
});

export async function atualizarSenhaUsuario(estadoAnterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const dadosParseados = AtualizarSenhaSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  
  if (!dadosParseados.success) {
    const mensagensErro = dadosParseados.error.errors.map(e => `- ${e.message}`).join("\n");
    return { sucesso: false, mensagem: `Erro de validação:\n${mensagensErro}` };
  }
  
  const { senha, uid } = dadosParseados.data;

  try {
    const auth = getAuth();
    await auth.updateUser(uid, { password: senha });
    return { sucesso: true, mensagem: "Senha atualizada com sucesso." };
  } catch (error: any) {
    return { sucesso: false, mensagem: `Falha ao atualizar a senha: ${error.message}` };
  }
}

export async function cancelarReservasEmLote(
    reservaIds: string[],
    adminUser: { nome: string | null; email: string | null; }
) {
    const usuarioResponsavel = adminUser.nome || adminUser.email || 'Sistema';
    const timestamp = new Date();
    const batch = adminDb.batch();

    reservaIds.forEach(id => {
        const reservaRef = adminDb.collection("reservas").doc(id);
        batch.update(reservaRef, {
            status: 'rejeitado',
            historico: FieldValue.arrayUnion({
                acao: "Status alterado para rejeitado (em lote)",
                usuario: usuarioResponsavel,
                data: timestamp
            })
        });
    });

    try {
        await batch.commit();
    } catch (error: any) {
        throw new Error(`Falha ao cancelar as reservas em lote: ${error.message}`);
    }
}
