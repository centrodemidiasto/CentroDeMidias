
'use client';

import { Reserva } from "@/lib/types";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface GradeHorariosProps {
  ano: number;
  mes: number;
  reservas: Reserva[];
}

function agruparReservasPorSemana(reservas: Reserva[], mes: number, ano: number) {
    const semanasDoMes = eachWeekOfInterval(
        { start: startOfMonth(new Date(ano, mes - 1)), end: endOfMonth(new Date(ano, mes - 1)) },
        { weekStartsOn: 1 } // Começar na Segunda-feira
    );

    return semanasDoMes.map(inicioDaSemana => {
        const fimDaSemana = endOfWeek(inicioDaSemana, { weekStartsOn: 1 });
        const reservasDaSemana = reservas.filter(reserva => {
            const dataReserva = parseISO(reserva.dataReserva);
            return dataReserva >= inicioDaSemana && dataReserva <= fimDaSemana;
        });

        return {
            label: `Semana de ${format(inicioDaSemana, 'dd/MM')} a ${format(fimDaSemana, 'dd/MM')}`,
            reservas: reservasDaSemana,
        };
    });
}

export default function GradeHorarios({ ano, mes, reservas }: GradeHorariosProps) {
    const semanas = agruparReservasPorSemana(reservas, mes, ano);
    const nomeMes = format(new Date(ano, mes - 1), 'MMMM', { locale: ptBR });

    return (
        <div className="bg-white text-black p-8 printable-area">
             <style>
                {`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print {
                        display: none;
                    }
                    @page {
                        size: A4 landscape;
                        margin: 1cm;
                    }
                }
                `}
            </style>
            
            <header className="flex justify-between items-center mb-8">
                 <Image
                    src="/img/centrologo.png"
                    width={200}
                    height={60}
                    alt="Logotipo do Centro de Mídias Educacionais"
                    className="object-contain"
                />
                <div className="text-right">
                    <h1 className="text-3xl font-bold capitalize">Grade de Horários - ${nomeMes} de ${ano}</h1>
                    <p className="text-sm text-gray-600">Documento gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                </div>
            </header>

            <div className="space-y-8">
                {semanas.map((semana, index) => (
                    semana.reservas.length > 0 && (
                        <Card key={index} className="break-inside-avoid">
                            <CardHeader>
                                <CardTitle>${semana.label}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Data</TableHead>
                                            <TableHead className="w-[100px]">Horário</TableHead>
                                            <TableHead className="w-[100px]">Estúdio</TableHead>
                                            <TableHead>Título / Responsável</TableHead>
                                            <TableHead>Setor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {semana.reservas.map(reserva => {
                                            const dataFormatada = format(parseISO(reserva.dataReserva), "EEE, dd/MM", { locale: ptBR });
                                            const horarios = reserva.horariosSelecionados[reserva.dataReserva].join(', ');
                                            const orgao = reserva.tipoOrgao === 'interno' ? reserva.departamento : reserva.organizacaoExterna;
                                            
                                            return (
                                                <TableRow key={reserva.id}>
                                                    <TableCell>${dataFormatada}</TableCell>
                                                    <TableCell>${horarios}</TableCell>
                                                     <TableCell><Badge variant="outline">${reserva.estudio}</Badge></TableCell>
                                                    <TableCell>
                                                        <p className="font-semibold">${reserva.tituloGravacao}</p>
                                                        <p className="text-xs text-gray-600">${reserva.nomeCompleto}</p>
                                                    </TableCell>
                                                    <TableCell>${orgao}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )
                ))}
                {reservas.length === 0 && (
                    <p className="text-center text-gray-500 py-16">Nenhum agendamento encontrado para este mês.</p>
                )}
            </div>

            <Button onClick={() => window.print()} className="fixed bottom-8 right-8 no-print">
                Imprimir / Salvar PDF
            </Button>
        </div>
    );
}
