
"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from 'firebase-admin/firestore';
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
    nomeCompleto: z.string().min(3, { message: "Nome do responsável é obrigatório." }),
    departamento: z.string().min(2, { message: "Setor/Departamento é obrigatório." }),
    modalidadesReserva: z.string({ required_error: "Selecione uma modalidade." }),
});


type EstadoFormulario = {
    sucesso: boolean;
    mensagem: string;
} | null;


export async function atualizarStatusReserva(reservaId: string, status: 'aprovado' | 'rejeitado') {
    const reservaRef = adminDb.collection("reservas").doc(reservaId);
    
    try {
        await reservaRef.update({ status });
    } catch (error) {
        console.error("Erro ao atualizar status da reserva:", error);
        throw new Error("Falha ao atualizar o status da reserva.");
    }
}


export async function handleSolicitacaoReserva(
    horariosSelecionados: Record<string, string[]>,
    estadoAnterior: EstadoFormulario,
    formData: FormData
): Promise<EstadoFormulario> {

    const dadosParseados = DetalhesReservaSchema.safeParse(
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
        const datasSelecionadas = Object.entries(horariosSelecionados).flatMap(([data, horarios]) =>
            (horarios as string[]).map(horario => new Date(`${data}T${horario}:00`).toISOString())
        );

        if (datasSelecionadas.length === 0) {
            return { sucesso: false, mensagem: "Por favor, selecione ao menos um horário." };
        }
        
        const dataReserva = Object.keys(horariosSelecionados)[0]; // Formato YYYY-MM-DD
        await adminDb.collection("reservas").add({
            ...dados,
            horariosSelecionados,
            dataReserva: dataReserva,
            criadoEm: FieldValue.serverTimestamp(),
            status: "pendente"
        });
        return { sucesso: true, mensagem: "Seu agendamento foi solicitado com sucesso e está pendente de aprovação!" };
        
    } catch (error) {
        console.error("Erro em handleSolicitacaoReserva:", error);
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
       
       await adminDb.collection("reservas").add({
            ...dados,
            tipoOrgao: 'interno',
            email: 'centrodemidias@seduc.to.gov.br', // Adiciona email padrão para reservas admin
            horariosSelecionados,
            dataReserva: dataReserva, 
            criadoEm: FieldValue.serverTimestamp(),
            status: "aprovado" // Reservas admin são auto-aprovadas
       });

       return { sucesso: true, mensagem: "Agendamento rápido realizado e aprovado com sucesso!" };

    } catch (error) {
       console.error("Erro em handleSolicitacaoReservaAdmin:", error);
       return { sucesso: false, mensagem: "Ocorreu um erro inesperado. Tente novamente." };
    }
}


export async function handleSolicitacaoReservaRecorrente(
    datasSelecionadas: string[],
    horariosSelecionados: string[],
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

    if (!datasSelecionadas || datasSelecionadas.length === 0 || !horariosSelecionados || horariosSelecionados.length === 0) {
        return { sucesso: false, mensagem: "Nenhuma data ou horário selecionado." };
    }

    try {
        const batch = adminDb.batch();
        const reservasRef = adminDb.collection("reservas");

        datasSelecionadas.forEach(data => {
            const novaReservaRef = reservasRef.doc();
            batch.set(novaReservaRef, {
                ...dados,
                tipoOrgao: 'interno',
                email: 'centrodemidias@seduc.to.gov.br',
                horariosSelecionados: { [data]: horariosSelecionados },
                dataReserva: data, 
                criadoEm: FieldValue.serverTimestamp(),
                status: "aprovado"
            });
        });

       await batch.commit();

       return { sucesso: true, mensagem: `${datasSelecionadas.length} agendamentos recorrentes realizados e aprovados com sucesso!` };

    } catch (error) {
       console.error("Erro em handleSolicitacaoReservaRecorrente:", error);
       return { sucesso: false, mensagem: "Ocorreu um erro inesperado. Tente novamente." };
    }
}
