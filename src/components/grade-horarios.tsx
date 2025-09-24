
'use client';

import { Reserva } from "@/lib/types";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, getWeekOfMonth, addHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from "next/image";
import { Button } from "./ui/button";
import { Printer } from "lucide-react";

interface GradeHorariosProps {
    ano: number;
    mes: number;
    reservas: Reserva[];
}

interface ReservaSemanal {
    numeroSemana: number;
    reservas: Reserva[];
    intervalo: { start: Date, end: Date };
}

function agruparReservasPorSemana(reservas: Reserva[], ano: number, mes: number): ReservaSemanal[] {
    if (reservas.length === 0) return [];
    
    const semanas: { [key: number]: Reserva[] } = {};

    reservas.forEach(reserva => {
        const data = parseISO(reserva.dataReserva);
        const numeroSemana = getWeekOfMonth(data, { weekStartsOn: 1 }); // Segunda como início da semana
        if (!semanas[numeroSemana]) {
            semanas[numeroSemana] = [];
        }
        semanas[numeroSemana].push(reserva);
    });

    return Object.entries(semanas).map(([numero, listaReservas]) => {
        const dataPrimeiraReserva = parseISO(listaReservas[0].dataReserva);
        const inicioSemana = startOfWeek(dataPrimeiraReserva, { weekStartsOn: 1 });
        const fimSemana = endOfWeek(dataPrimeiraReserva, { weekStartsOn: 1 });

        return {
            numeroSemana: parseInt(numero),
            reservas: listaReservas,
            intervalo: { start: inicioSemana, end: fimSemana }
        };
    }).sort((a, b) => a.numeroSemana - b.numeroSemana);
}


export default function GradeHorarios({ ano, mes, reservas }: GradeHorariosProps) {
    
    const semanasAgrupadas = agruparReservasPorSemana(reservas, ano, mes);
    const nomeMes = format(new Date(ano, mes), 'MMMM', { locale: ptBR });

    const getHorarioFinal = (horarios: string[]): string => {
        if (!horarios || horarios.length === 0) return '';
        const ultimoHorario = horarios[horarios.length - 1];
        const [horas, minutos] = ultimoHorario.split(':').map(Number);
        
        const dataFim = new Date();
        dataFim.setHours(horas, minutos);

        const temIntervalo = horarios.some(h => h.endsWith(':30'));
        const duracao = temIntervalo ? 30 : 60;
        
        dataFim.setMinutes(dataFim.getMinutes() + duracao);

        return format(dataFim, 'HH:mm');
    }

    return (
        <div className="bg-white text-black p-8 printable-area">
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 20mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print {
                        display: none;
                    }
                }
            `}</style>

            <header className="flex justify-between items-center mb-8 border-b pb-4">
                <div className="w-48">
                    <Image
                        src="/img/centrologo.png"
                        alt="Logotipo do Centro de Mídias"
                        width={200}
                        height={60}
                        className="object-contain"
                    />
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Grade de Gravações</h1>
                    <h2 className="text-xl capitalize">{nomeMes} de {ano}</h2>
                </div>
                <div className="w-48 text-right">
                     <Button className="no-print" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                </div>
            </header>

            {semanasAgrupadas.length > 0 ? (
                <div className="space-y-8">
                    {semanasAgrupadas.map(semana => (
                        <div key={semana.numeroSemana}>
                            <h3 className="text-lg font-bold bg-gray-200 p-2 rounded-t-lg">
                                Semana {semana.numeroSemana}: {format(semana.intervalo.start, 'dd/MM')} a {format(semana.intervalo.end, 'dd/MM')}
                            </h3>
                            <table className="w-full text-sm border-collapse border border-gray-300">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border p-2 w-1/6">Data</th>
                                        <th className="border p-2 w-1/6">Horário</th>
                                        <th className="border p-2 w-1/6">Estúdio</th>
                                        <th className="border p-2 w-2/6">Título / Responsável</th>
                                        <th className="border p-2 w-1/6">Setor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {semana.reservas.map(reserva => {
                                        const horarioInicio = reserva.horariosSelecionados[reserva.dataReserva]?.[0];
                                        const horarioFim = getHorarioFinal(reserva.horariosSelecionados[reserva.dataReserva]);
                                        
                                        return (
                                            <tr key={reserva.id}>
                                                <td className="border p-2 align-top">
                                                    <span className="capitalize font-semibold">{format(parseISO(reserva.dataReserva), 'eeee', { locale: ptBR })}</span>
                                                    <br />
                                                    {format(parseISO(reserva.dataReserva), 'dd/MM/yyyy')}
                                                </td>
                                                <td className="border p-2 align-top">{horarioInicio} - {horarioFim}</td>
                                                <td className="border p-2 align-top">{reserva.estudio}</td>
                                                <td className="border p-2 align-top">{reserva.tituloGravacao || reserva.nomeCompleto}</td>
                                                <td className="border p-2 align-top">{reserva.tipoOrgao === 'interno' ? reserva.departamento : reserva.organizacaoExterna}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500">
                    <p>Nenhuma gravação aprovada encontrada para {nomeMes} de {ano}.</p>
                </div>
            )}
        </div>
    );
}
