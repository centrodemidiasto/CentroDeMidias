
export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { Reserva } from '@/lib/types';
import { notFound } from 'next/navigation';
import ManifestoContent from './manifesto-content';

interface ManifestoPageProps {
    params: {
        id: string;
    }
}

async function getReserva(id: string): Promise<Reserva | null> {
    const { data, error } = await supabaseAdmin
        .from('reservas')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) return null;

    return {
        id: data.id,
        nomeCompleto: data.nome_completo,
        email: data.email,
        telefone: data.telefone,
        tituloGravacao: data.titulo_gravacao,
        tipoOrgao: data.tipo_orgao,
        departamento: data.departamento,
        organizacaoExterna: data.organizacao_externa,
        modalidadesReserva: data.modalidades_reserva,
        materiaisNecessarios: data.materiais_necessarios,
        numeroParticipantes: data.numero_participantes,
        numeroMesas: data.numero_mesas,
        numeroCadeiras: data.numero_cadeiras,
        horariosSelecionados: data.horarios_selecionados,
        status: data.status,
        criadoEm: data.criado_em,
        dataReserva: data.data_reserva,
        estudio: data.estudio,
        aprovadoPor: data.aprovado_por,
        ultimaAlteracaoPor: data.ultima_alteracao_por,
        historico: data.historico || [],
        motivoCancelamento: data.motivo_cancelamento,
        entregaMaterial: data.entrega_material,
        formatoVideo: data.formato_video,
        plataformaVideo: data.plataforma_video,
        plataformaVideoOutro: data.plataforma_video_outro,
        participantes: data.participantes || [],
    } as Reserva;
}

export default async function ManifestoPage({ params }: ManifestoPageProps) {
    const reserva = await getReserva(params.id);

    if (!reserva) {
        notFound();
    }

    return (
       <ManifestoContent reserva={JSON.parse(JSON.stringify(reserva))} />
    );
}
