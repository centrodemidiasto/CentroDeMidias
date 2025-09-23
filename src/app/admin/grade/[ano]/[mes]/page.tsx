
import { adminDb } from "@/lib/firebase-admin";
import { Reserva } from "@/lib/types";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import GradeHorarios from "@/components/grade-horarios";

interface GradeParams {
  params: {
    ano: string;
    mes: string;
  };
}

async function getReservasParaGrade(ano: number, mes: number): Promise<Reserva[]> {
    const inicioDoMesFiltro = startOfMonth(new Date(ano, mes - 1));
    const fimDoMesFiltro = endOfMonth(new Date(ano, mes - 1));

    const inicioFormatado = format(inicioDoMesFiltro, 'yyyy-MM-dd');
    const fimFormatado = format(fimDoMesFiltro, 'yyyy-MM-dd');

    const reservasRef = adminDb.collection('reservas');
    const q = reservasRef
        .where('status', '==', 'aprovado')
        .where('dataReserva', '>=', inicioFormatado)
        .where('dataReserva', '<=', fimFormatado)
        .orderBy('dataReserva', 'asc');

    const querySnapshot = await q.get();
    const reservas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reserva));

     reservas.sort((a, b) => {
        const timeA = a.horariosSelecionados[a.dataReserva]?.[0] || '00:00';
        const timeB = b.horariosSelecionados[b.dataReserva]?.[0] || '00:00';
        if (a.dataReserva < b.dataReserva) return -1;
        if (a.dataReserva > b.dataReserva) return 1;
        return timeA.localeCompare(timeB);
    });
    
    return reservas;
}


export default async function PaginaGrade({ params }: GradeParams) {
    const ano = parseInt(params.ano, 10);
    const mes = parseInt(params.mes, 10);

    if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) {
        return <div>Parâmetros inválidos.</div>;
    }

    const reservas = await getReservasParaGrade(ano, mes);

    return <GradeHorarios ano={ano} mes={mes} reservas={reservas} />;
}
