
export const dynamic = 'force-dynamic';

import GradeHorarios from '@/components/grade-horarios';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { Reserva } from '@/lib/types';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface PaginaGradePDFProps {
    params: {
        ano: string;
        mes: string;
    }
}

async function getReservasDoMes(ano: number, mes: number): Promise<Reserva[]> {
    const inicioDoMes = startOfMonth(new Date(ano, mes));
    const fimDoMes = endOfMonth(new Date(ano, mes));

    const inicioFormatado = format(inicioDoMes, 'yyyy-MM-dd');
    const fimFormatado = format(fimDoMes, 'yyyy-MM-dd');

    const { data, error } = await supabaseAdmin
        .from('reservas')
        .select('*')
        .eq('status', 'aprovado')
        .gte('data_reserva', inicioFormatado)
        .lte('data_reserva', fimFormatado)
        .order('data_reserva', { ascending: true });

    if (error || !data) return [];

    const reservas: Reserva[] = data.map((row: any) => ({
        id: row.id,
        nomeCompleto: row.nome_completo,
        email: row.email,
        telefone: row.telefone,
        tituloGravacao: row.titulo_gravacao,
        tipoOrgao: row.tipo_orgao,
        departamento: row.departamento,
        organizacaoExterna: row.organizacao_externa,
        modalidadesReserva: row.modalidades_reserva,
        materiaisNecessarios: row.materiais_necessarios,
        numeroParticipantes: row.numero_participantes,
        numeroMesas: row.numero_mesas,
        numeroCadeiras: row.numero_cadeiras,
        horariosSelecionados: row.horarios_selecionados,
        status: row.status,
        criadoEm: row.criado_em,
        dataReserva: row.data_reserva,
        estudio: row.estudio,
        aprovadoPor: row.aprovado_por,
        ultimaAlteracaoPor: row.ultima_alteracao_por,
        historico: row.historico || [],
        motivoCancelamento: row.motivo_cancelamento,
        entregaMaterial: row.entrega_material,
        formatoVideo: row.formato_video,
        plataformaVideo: row.plataforma_video,
        plataformaVideoOutro: row.plataforma_video_outro,
        participantes: row.participantes || [],
    }));

    reservas.sort((a, b) => {
        const timeA = a.horariosSelecionados[a.dataReserva]?.[0] || '00:00';
        const timeB = b.horariosSelecionados[b.dataReserva]?.[0] || '00:00';
        if (a.dataReserva < b.dataReserva) return -1;
        if (a.dataReserva > b.dataReserva) return 1;
        return timeA.localeCompare(timeB);
    });

    return reservas;
}


export default async function PaginaGradePDF({ params }: PaginaGradePDFProps) {
    const ano = parseInt(params.ano, 10);
    const mes = parseInt(params.mes, 10) - 1;

    const reservas = await getReservasDoMes(ano, mes);

    return (
        <GradeHorarios ano={ano} mes={mes} reservas={reservas} />
    );
}
