
import GradeHorarios from '@/components/grade-horarios';
import { adminDb } from '@/lib/firebase-admin';
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

    const reservasRef = adminDb.collection('reservas');
    const q = reservasRef
        .where('status', '==', 'aprovado')
        .where('dataReserva', '>=', inicioFormatado)
        .where('dataReserva', '<=', fimFormatado)
        .orderBy('dataReserva', 'asc');

    const snapshot = await q.get();
    if (snapshot.empty) {
        return [];
    }
    
    const reservas = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            // Converte Timestamps para strings JSON serializáveis
            criadoEm: data.criadoEm.toDate().toISOString(),
            historico: data.historico ? data.historico.map((h: any) => ({
                ...h,
                data: h.data.toDate().toISOString(),
            })) : [],
        } as Reserva;
    });

    // Ordenação secundária por horário
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
    const mes = parseInt(params.mes, 10) - 1; // Ajuste para o índice do mês (0-11)

    const reservas = await getReservasDoMes(ano, mes);

    return (
        <GradeHorarios ano={ano} mes={mes} reservas={reservas} />
    );
}
