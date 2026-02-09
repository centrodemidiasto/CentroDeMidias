'use client';

import { Reserva } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatarIntervalosHorarios } from "@/lib/utils";

interface ManifestoContentProps {
    reserva: Reserva;
}

const InfoItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    value ? (
        <div className="grid grid-cols-[200px_1fr] items-start text-sm">
            <span className="font-semibold text-right pr-4 text-gray-600">{label}:</span>
            <span className="text-gray-800">{value}</span>
        </div>
    ) : null
);

const SectionTitle = ({ title }: { title: string }) => (
    <h2 className="text-lg font-bold text-gray-800 border-b-2 border-gray-200 pb-1 mb-3 mt-4">{title}</h2>
);


export default function ManifestoContent({ reserva }: ManifestoContentProps) {

    const dataGravacao = parseISO(reserva.dataReserva);
    const dataSolicitacao = parseISO(reserva.criadoEm as string);

    return (
         <div className="bg-white text-black min-h-screen p-8 printable-area font-sans">
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 1.5cm;
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

            <header className="flex justify-between items-center mb-8">
                <div className="w-48">
                    <Image
                        src="/img/centrologo.png"
                        alt="Logotipo do Centro de Mídias"
                        width={200}
                        height={60}
                        className="object-contain"
                    />
                </div>
                <div className="text-right">
                    <h1 className="text-2xl font-bold">Manifesto de Gravação</h1>
                    <p className="text-sm text-gray-500">ID da Reserva: {reserva.id}</p>
                </div>
            </header>

            <main className="space-y-6">
                <section>
                    <SectionTitle title="Detalhes da Gravação" />
                    <div className="space-y-2">
                        <InfoItem label="Título da Gravação" value={reserva.tituloGravacao} />
                        <InfoItem label="Estúdio" value={reserva.estudio} />
                        <InfoItem label="Data da Gravação" value={format(dataGravacao, "eeee, dd 'de' MMMM 'de' yyyy", { locale: ptBR })} />
                        <InfoItem label="Horários" value={formatarIntervalosHorarios(reserva.horariosSelecionados[reserva.dataReserva])} />
                        <InfoItem label="Modalidade" value={reserva.modalidadesReserva} />
                    </div>
                </section>

                <section>
                    <SectionTitle title="Informações do Solicitante" />
                    <div className="space-y-2">
                        <InfoItem label="Nome Completo" value={reserva.nomeCompleto} />
                        <InfoItem label="E-mail" value={reserva.email} />
                        <InfoItem label="Telefone" value={reserva.telefone} />
                        <InfoItem label="Tipo de Órgão" value={reserva.tipoOrgao === 'interno' ? 'Interno (SEDUC)' : 'Externo'} />
                        {reserva.tipoOrgao === 'interno' && <InfoItem label="Setor/Departamento" value={reserva.departamento} />}
                        {reserva.tipoOrgao === 'externo' && <InfoItem label="Órgão Externo" value={reserva.organizacaoExterna} />}
                        <InfoItem label="Data da Solicitação" value={format(dataSolicitacao, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
                    </div>
                </section>

                <section>
                    <SectionTitle title="Recursos Solicitados" />
                     <div className="space-y-2">
                        <InfoItem label="Nº de Participantes" value={reserva.numeroParticipantes} />
                        <InfoItem label="Nº de Mesas" value={reserva.numeroMesas} />
                        <InfoItem label="Nº de Cadeiras" value={reserva.numeroCadeiras} />
                        <InfoItem label="Materiais Adicionais" value={reserva.materiaisNecessarios || 'Nenhum'} />
                     </div>
                </section>

                {reserva.entregaMaterial && (
                     <section className="page-break-before">
                        <SectionTitle title="Instruções para Pós-Produção" />
                        <div className="space-y-2">
                            <InfoItem label="Entrega do Material" value={reserva.entregaMaterial} />
                            <InfoItem label="Formato do Vídeo" value={reserva.formatoVideo} />
                            <InfoItem label="Plataforma de Destino" value={reserva.plataformaVideo === 'Outros' ? reserva.plataformaVideoOutro : reserva.plataformaVideo} />
                        </div>

                        {reserva.participantes && reserva.participantes.length > 0 && (
                             <div className="mt-4">
                                <h3 className="font-semibold text-gray-600 mb-2 text-sm">Créditos dos Participantes:</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-800 pl-4">
                                    {reserva.participantes.map((p, index) => (
                                        <li key={index}>
                                           <strong>{p.nome || 'Não informado'}</strong> - <span>{p.funcao || 'Não informado'}</span>
                                        </li>
                                    ))}
                                </ul>
                             </div>
                        )}
                    </section>
                )}
            </main>
            
            <div className="fixed bottom-8 right-8 no-print">
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir Manifesto
                </Button>
            </div>
        </div>
    );
}
