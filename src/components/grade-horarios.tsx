
'use client';

import { useState } from "react";
import { Reserva } from "@/lib/types";
import { format, parseISO, startOfWeek, endOfWeek, getWeekOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from "next/image";
import { Button } from "./ui/button";
import { Printer, Repeat } from "lucide-react";

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

function agruparReservasPorSemana(reservas: Reserva[]): ReservaSemanal[] {
    if (reservas.length === 0) return [];
    
    const semanas: { [key: number]: Reserva[] } = {};

    reservas.forEach(reserva => {
        const data = parseISO(reserva.dataReserva);
        const numeroSemana = getWeekOfMonth(data, { weekStartsOn: 1 });
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

const HeaderImpressao = ({ nomeMes, ano, estudio }: { nomeMes: string, ano: number, estudio: string }) => (
    <thead className="print-header">
        <tr>
            <th colSpan={4}>
                <div className="flex justify-between items-center mb-4 pb-4">
                    <div className="w-48">
                        <Image
                            src="/img/centrologo.png"
                            alt="Logotipo do Centro de Mídias"
                            width={150}
                            height={50}
                            className="object-contain"
                        />
                    </div>
                    <div className="text-center">
                        <h1 className="text-xl font-bold">Grade de Gravações - {estudio}</h1>
                        <h2 className="text-lg capitalize">{nomeMes} de {ano}</h2>
                    </div>
                    <div className="w-48" />
                </div>
            </th>
        </tr>
    </thead>
);

export default function GradeHorarios({ ano, mes, reservas }: GradeHorariosProps) {
    const [estudioSelecionado, setEstudioSelecionado] = useState('Estúdio 1');
    
    const nomeMes = format(new Date(ano, mes), 'MMMM', { locale: ptBR });

    const reservasFiltradas = reservas.filter(r => r.estudio === estudioSelecionado);
    const semanasAgrupadas = agruparReservasPorSemana(reservasFiltradas);

    const handleTrocarEstudio = () => {
        setEstudioSelecionado(prev => prev === 'Estúdio 1' ? 'Estúdio 2' : 'Estúdio 1');
    }

    return (
        <div className="bg-white text-black p-8 printable-area">
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 1cm;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print {
                        display: none;
                    }
                    .printable-week {
                        page-break-before: always;
                    }
                     .printable-week:first-child {
                        page-break-before: avoid;
                    }
                    .print-header {
                        display: table-header-group;
                    }
                }
            `}</style>
            
            <div className="fixed top-4 right-4 flex flex-col gap-2 no-print">
                 <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                </Button>
                <Button variant="outline" onClick={handleTrocarEstudio}>
                    <Repeat className="mr-2 h-4 w-4" />
                    Alterar Estúdio
                </Button>
            </div>

            <main>
                {semanasAgrupadas.length > 0 ? (
                    <div className="space-y-8">
                        {semanasAgrupadas.map((semana) => (
                            <table key={semana.numeroSemana} className="w-full text-sm border-collapse printable-week">
                                <HeaderImpressao nomeMes={nomeMes} ano={ano} estudio={estudioSelecionado} />
                                <thead className="bg-gray-100">
                                     <tr>
                                        <th colSpan={4} className="bg-gray-200 p-2 text-left text-base font-bold border-y border-gray-300">
                                            Semana {semana.numeroSemana}: {format(semana.intervalo.start, 'dd/MM')} a {format(semana.intervalo.end, 'dd/MM')}
                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="border border-gray-300 p-2 w-[15%]">Data</th>
                                        <th className="border border-gray-300 p-2 w-[15%]">Horário</th>
                                        <th className="border border-gray-300 p-2 w-[40%]">Título / Responsável</th>
                                        <th className="border border-gray-300 p-2 w-[30%]">Setor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {semana.reservas.map(reserva => {
                                        const horarioInicio = reserva.horariosSelecionados[reserva.dataReserva]?.[0];
                                        const horarioFim = getHorarioFinal(reserva.horariosSelecionados[reserva.dataReserva]);
                                        
                                        return (
                                            <tr key={reserva.id}>
                                                <td className="border border-gray-300 p-2 align-top">
                                                    <span className="capitalize font-semibold">{format(parseISO(reserva.dataReserva), 'eeee', { locale: ptBR })}</span>
                                                    <br />
                                                    {format(parseISO(reserva.dataReserva), 'dd/MM/yyyy')}
                                                </td>
                                                <td className="border border-gray-300 p-2 align-top">{horarioInicio} - {horarioFim}</td>
                                                <td className="border border-gray-300 p-2 align-top">{reserva.tituloGravacao || reserva.nomeCompleto}</td>
                                                <td className="border border-gray-300 p-2 align-top">{reserva.tipoOrgao === 'interno' ? reserva.departamento : reserva.organizacaoExterna}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-500">
                        <p>Nenhuma gravação aprovada encontrada para o {estudioSelecionado} em {nomeMes} de {ano}.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
