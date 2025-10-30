
import { adminDb } from '@/lib/firebase-admin';
import { Reserva } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ManifestoContent from './manifesto-content';

interface ManifestoPageProps {
    params: {
        id: string;
    }
}

async function getReserva(id: string): Promise<Reserva | null> {
    const docRef = adminDb.collection('reservas').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        return null;
    }

    const data = docSnap.data();
    if (!data) return null;

    return {
        ...data,
        id: docSnap.id,
        criadoEm: data.criadoEm.toDate(),
        historico: data.historico ? data.historico.map((h: any) => ({
            ...h,
            data: h.data.toDate(),
        })) : [],
    } as Reserva;
}

const InfoItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    value ? (
        <div className="grid grid-cols-[180px_1fr] items-start">
            <span className="font-semibold text-right pr-4">{label}:</span>
            <span className="text-gray-700">{value}</span>
        </div>
    ) : null
);

export default async function ManifestoPage({ params }: ManifestoPageProps) {
    const reserva = await getReserva(params.id);

    if (!reserva) {
        notFound();
    }
    
    const dataGravacao = parseISO(reserva.dataReserva);
    const dataSolicitacao = reserva.criadoEm instanceof Date ? reserva.criadoEm : reserva.criadoEm.toDate();

    return (
       <ManifestoContent reserva={JSON.parse(JSON.stringify(reserva))} />
    );
}

