"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { sendEmail } from "@/lib/mail";
import { formatarIntervalosHorarios } from "@/lib/utils";

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
    estudio: z.string(),
    // Campos da segunda etapa
    entregaMaterial: z.string({ required_error: "Selecione como deseja receber o material." }),
    formatoVideo: z.string({ required_error: "Selecione o formato do vídeo." }),
    plataformaVideo: z.string({ required_error: "Selecione a plataforma de destino." }),
    plataformaVideoOutro: z.string().optional(),
    participantes: z.array(z.object({
        nome: z.string().optional(),
        funcao: z.string().optional()
    })).optional(),

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
    if (data.plataformaVideo === 'Outros' && (!data.plataformaVideoOutro || data.plataformaVideoOutro.trim().length === 0)) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Especifique a plataforma.",
            path: ["plataformaVideoOutro"],
        });
    }
});

const ReservaAdminSchema = z.object({
    tituloGravacao: z.string().min(3, { message: "Título da gravação é obrigatório." }),
    nomeCompleto: z.string().min(3, { message: "Nome do responsável é obrigatório." }),
    departamento: z.string().min(2, { message: "Setor/Departamento é obrigatório." }),
    modalidadesReserva: z.string({ required_error: "Selecione uma modalidade." }),
    estudio: z.string()
});


type EstadoFormulario = {
    sucesso: boolean;
    mensagem: string;
    dados?: any;
} | null;


export async function atualizarStatusReserva(
    reservaId: string, 
    status: 'aprovado' | 'rejeitado',
    adminUser: { nome: string | null; email: string | null; },
    motivo?: string
) {
    const reservaRef = adminDb.collection("reservas").doc(reservaId);
    const usuarioResponsavel = adminUser.nome || adminUser.email || 'Sistema';
    const timestamp = new Date();

    try {
        const docReserva = await reservaRef.get();
        if (!docReserva.exists) {
            throw new Error("Reserva não encontrada.");
        }
        const dadosReserva = docReserva.data();

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
            dadosAtualizacao.motivoCancelamento = FieldValue.delete();
        }

        if (status === 'rejeitado') {
            if (!motivo) {
                throw new Error("O motivo do cancelamento é obrigatório.");
            }
            dadosAtualizacao.motivoCancelamento = motivo;
        }

        await reservaRef.update(dadosAtualizacao);
        
        // Notificação por E-mail automática após a decisão
        if (dadosReserva && dadosReserva.email) {
            const dataReserva = dadosReserva.dataReserva;
            const horarios = formatarIntervalosHorarios(dadosReserva.horariosSelecionados[dataReserva]);
            const dataFormatada = format(parseISO(dataReserva), 'dd/MM/yyyy');
            
            const subject = status === 'aprovado' 
                ? 'Agendamento CONFIRMADO - Centro de Mídias' 
                : 'Agendamento REJEITADO - Centro de Mídias';
            
            const statusLabel = status === 'aprovado' ? 'APROVADO' : 'REJEITADO';
            
            const html = `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2>Olá, ${dadosReserva.nomeCompleto}!</h2>
                    <p>O status do seu agendamento para a gravação "<strong>${dadosReserva.tituloGravacao}</strong>" foi atualizado para: <strong style="color: ${status === 'aprovado' ? '#28a745' : '#dc3545'};">${statusLabel}</strong>.</p>
                    
                    <h3>Detalhes do Agendamento:</h3>
                    <ul>
                        <li><strong>Data:</strong> ${dataFormatada}</li>
                        <li><strong>Horário:</strong> ${horarios}</li>
                        <li><strong>Estúdio:</strong> ${dadosReserva.estudio}</li>
                    </ul>
                    
                    ${status === 'rejeitado' ? `
                        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px;">
                            <p style="margin: 0; color: #721c24;"><strong>Motivo do Indeferimento:</strong> ${motivo}</p>
                        </div>
                        <p>Caso tenha dúvidas, você pode entrar em contato conosco respondendo a este e-mail.</p>
                    ` : `
                        <p><strong>Orientações Importantes:</strong></p>
                        <ul>
                            <li>Chegue com pelo menos 30 minutos de antecedência.</li>
                            <li>Traga seus materiais de apoio em pendrive (se aplicável).</li>
                            <li>Revise as normas de uso no nosso site.</li>
                        </ul>
                    `}
                    
                    <p>Atenciosamente,<br><strong>Equipe do Centro de Mídias Educacionais</strong></p>
                </div>
            `;

            await sendEmail({ to: dadosReserva.email, subject, html });
        }

    } catch (error: any) {
        throw new Error(`Falha ao atualizar o status da reserva: ${error.message}`);
    }
}


export async function handleSolicitacaoReserva(
    horariosSelecionados: Record<string, string[]>,
    estadoAnterior: EstadoFormulario,
    formData: FormData
): Promise<EstadoFormulario> {
    
    let rawData = Object.fromEntries(formData.entries());

    // Processar campos de participantes
    const participantes: { nome?: string; funcao?: string }[] = [];
    const numeroParticipantes = parseInt(String(rawData.numeroParticipantes) || '0', 10);
    if (numeroParticipantes > 0) {
        for (let i = 0; i < numeroParticipantes; i++) {
            participantes.push({
                nome: String(rawData[`participantes[${i}].nome`]),
                funcao: String(rawData[`participantes[${i}].funcao`])
            });
        }
    }
    
    Object.keys(rawData).forEach(key => {
        if (key.startsWith('participantes[')) {
            delete rawData[key];
        }
    });

    const parsedData = {
      ...rawData,
      termosDeUso: rawData.termosDeUso === 'on',
      participantes: participantes,
    };
    
    const dadosParseados = DetalhesReservaSchema.safeParse(parsedData);

    if (!dadosParseados.success) {
        const mensagensErro = dadosParseados.error.errors.map(e => `- ${e.path.join('.')}: ${e.message}`).join("\n");
        return { sucesso: false, mensagem: `Por favor, corrija os seguintes erros:\n${mensagensErro}` };
    }

    const { termosDeUso, ...dados } = dadosParseados.data;
    
    if (!horariosSelecionados || Object.keys(horariosSelecionados).length === 0) {
        return { sucesso: false, mensagem: "Nenhum horário selecionado." };
    }

    try {
        const dataReserva = Object.keys(horariosSelecionados)[0];
        const timestamp = new Date();
        const novaReserva = {
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
        };

        const docRef = await adminDb.collection("reservas").add(novaReserva);

        // --- Notificações por E-mail (Substituindo Webhooks) ---
        const baseAdminUrl = 'https://centrodemidiasto.vercel.app/admin';
        const dataFormatada = format(parseISO(dataReserva), 'dd/MM/yyyy');
        const horariosFormatados = formatarIntervalosHorarios(novaReserva.horariosSelecionados[dataReserva]);

        // 1. Notificação para o Usuário (Confirmação de recebimento)
        const userSubject = 'Solicitação de Agendamento Recebida - Centro de Mídias';
        const userHtml = `
            <div style="font-family: sans-serif; color: #333;">
                <h2>Olá, ${novaReserva.nomeCompleto}!</h2>
                <p>Recebemos com sucesso sua solicitação de agendamento para uso dos nossos estúdios.</p>
                <p>Sua solicitação encontra-se agora com o status: <strong>PENDENTE DE APROVAÇÃO</strong>.</p>
                
                <h3>Dados da Solicitação:</h3>
                <ul>
                    <li><strong>Título da Gravação:</strong> ${novaReserva.tituloGravacao}</li>
                    <li><strong>Data:</strong> ${dataFormatada}</li>
                    <li><strong>Horários:</strong> ${horariosFormatados}</li>
                    <li><strong>Estúdio:</strong> ${novaReserva.estudio}</li>
                </ul>
                
                <p>Nossa equipe analisará os detalhes em breve e você receberá uma nova notificação por e-mail com a decisão final.</p>
                <p>Atenciosamente,<br><strong>Equipe do Centro de Mídias Educacionais</strong></p>
            </div>
        `;

        // 2. Notificação para a Equipe Interna (Aprovação necessária)
        const adminSubject = `NOVA RESERVA PENDENTE: ${novaReserva.nomeCompleto} - ${dataFormatada}`;
        const orgaoSolicitante = novaReserva.tipoOrgao === 'interno' ? novaReserva.departamento : novaReserva.organizacaoExterna;
        
        const adminHtml = `
            <div style="font-family: sans-serif; color: #333;">
                <h2 style="color: #0056b3;">Nova Solicitação de Agendamento</h2>
                <p>Há uma nova solicitação no sistema que aguarda sua avaliação.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr style="background-color: #f2f2f2;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Solicitante:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${novaReserva.nomeCompleto}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Órgão/Setor:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${orgaoSolicitante}</td></tr>
                    <tr style="background-color: #f2f2f2;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Título:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${novaReserva.tituloGravacao}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Data:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${dataFormatada}</td></tr>
                    <tr style="background-color: #f2f2f2;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Horários:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${horariosFormatados}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Estúdio:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${novaReserva.estudio}</td></tr>
                </table>
                
                <p>Para visualizar todos os detalhes e realizar a aprovação ou rejeição, acesse o painel:</p>
                <p><a href="${baseAdminUrl}" style="display: inline-block; padding: 12px 25px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">ACESSAR PAINEL ADMINISTRATIVO</a></p>
                
                <hr>
                <p style="font-size: 12px; color: #777;">Este é um e-mail automático gerado pelo Sistema de Agendamento CME.</p>
            </div>
        `;

        // Disparo assíncrono dos e-mails
        await Promise.all([
            sendEmail({ to: novaReserva.email, subject: userSubject, html: userHtml }),
            sendEmail({ to: 'centrodemidias@seduc.to.gov.br', subject: adminSubject, html: adminHtml })
        ]);

        return { sucesso: true, mensagem: "Seu agendamento foi solicitado com sucesso e está pendente de aprovação!" };
        
    } catch (error) {
        console.error("Erro ao processar solicitação de reserva:", error);
        return { sucesso: false, mensagem: "Ocorreu um erro inesperado ao salvar sua solicitação. Tente novamente." };
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
            email: 'centrodemidias@seduc.to.gov.br', 
            horariosSelecionados,
            dataReserva: dataReserva, 
            criadoEm: timestamp,
            status: "aprovado", 
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
    adminUser: { nome: string | null; email: string | null; },
    motivo: string
) {
    const usuarioResponsavel = adminUser.nome || adminUser.email || 'Sistema';
    const timestamp = new Date();
    const batch = adminDb.batch();

    reservaIds.forEach(id => {
        const reservaRef = adminDb.collection("reservas").doc(id);
        batch.update(reservaRef, {
            status: 'rejeitado',
            motivoCancelamento: motivo,
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


export async function gerarOuObterRelatorio(mes: number, ano: number): Promise<{ sucesso: boolean; dados?: string; mensagem?: string }> {
    const docId = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const relatorioRef = adminDb.collection('relatorios_consolidados').doc(docId);

    try {
        const doc = await relatorioRef.get();
        if (doc.exists) {
            return { sucesso: true, dados: doc.data()?.csvContent };
        }

        const inicioDoMesFiltro = new Date(ano, mes, 1);
        const fimDoMesFiltro = new Date(ano, mes + 1, 0);

        const inicioFormatado = format(inicioDoMesFiltro, 'yyyy-MM-dd');
        const fimFormatado = format(fimDoMesFiltro, 'yyyy-MM-dd');

        const reservasRef = adminDb.collection('reservas');
        const q = reservasRef
            .where('status', 'in', ['aprovado', 'rejeitado'])
            .where('dataReserva', '>=', inicioFormatado)
            .where('dataReserva', '<=', fimFormatado)
            .orderBy('dataReserva', 'asc');

        const querySnapshot = await q.get();
        const reservas = querySnapshot.docs.map(doc => doc.data());

        reservas.sort((a, b) => {
            const timeA = a.horariosSelecionados[a.dataReserva]?.[0] || '00:00';
            const timeB = b.horariosSelecionados[b.dataReserva]?.[0] || '00:00';
            if (a.dataReserva < b.dataReserva) return -1;
            if (a.dataReserva > b.dataReserva) return 1;
            return timeA.localeCompare(timeB);
        });
        
        if (reservas.length === 0) {
            return { sucesso: false, mensagem: "Nenhum dado encontrado para o período." };
        }

        const colunas = ['Data', 'Horario', 'Estudio', 'Titulo da Gravacao', 'Responsavel', 'Setor_Departamento', 'Status', 'Motivo_Cancelamento'];
        const linhas = reservas.map(r => {
            const data = r.dataReserva;
            const horario = formatarIntervalosHorarios(r.horariosSelecionados[data]);
            const orgao = r.tipoOrgao === 'interno' ? r.departamento : r.organizacaoExterna;
            const motivoCancelamento = r.motivoCancelamento || '';
            let statusRelatorio = r.status;
            if (r.status === 'aprovado') {
                statusRelatorio = 'Gravação Realizada';
            } else if (r.status === 'rejeitado') {
                statusRelatorio = 'Gravação não realizada';
            }

            return [
                format(parseISO(`${data}T00:00:00`), 'dd/MM/yyyy'),
                `"${horario}"`,
                r.estudio,
                `"${(r.tituloGravacao || '').replace(/"/g, '""')}"`,
                `"${(r.nomeCompleto || '').replace(/"/g, '""')}"`,
                `"${(orgao || '').replace(/"/g, '""')}"`,
                statusRelatorio,
                `"${motivoCancelamento.replace(/"/g, '""')}"`
            ].join(',');
        });

        const csvContent = [colunas.join(','), ...linhas].join('\n');

        await relatorioRef.set({
            csvContent,
            geradoEm: new Date(),
        });

        return { sucesso: true, dados: csvContent };

    } catch (error) {
        console.error("Erro ao gerar ou obter relatório:", error);
        return { sucesso: false, mensagem: "Falha ao processar o relatório no servidor." };
    }
}
