import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format, parseISO, isToday, isTomorrow, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, Building, Video, Tv, FileText } from "lucide-react";
import CurrentTime from "@/components/current-time";
import Image from "next/image";
import RefreshButton from "@/components/refresh-button";
import { Badge } from "@/components/ui/badge";
import AutoScrollController from "@/components/auto-scroll-controller";
import { formatarIntervalosHorarios } from "@/lib/utils";
import HorariosRealtime from "@/components/horarios-realtime";

export const revalidate = 60;
export const dynamic = 'force-dynamic';

interface Reserva {
  id: string;
  nomeCompleto: string;
  tituloGravacao?: string;
  tipoOrgao: 'interno' | 'externo';
  departamento?: string;
  organizacaoExterna?: string;
  modalidadesReserva: string;
  horariosSelecionados: Record<string, string[]>;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  dataReserva: string;
  estudio: string;
}

interface ReservaAgrupada {
    data: string;
    reservas: Reserva[];
}

async function getProximasReservas(): Promise<Reserva[]> {
  const hoje = new Date();
  const inicioDoPeriodo = format(hoje, 'yyyy-MM-dd');
  const fimDoMes = format(endOfMonth(hoje), 'yyyy-MM-dd');

  const { data, error } = await supabaseAdmin
    .from('reservas')
    .select('id, nome_completo, titulo_gravacao, tipo_orgao, departamento, organizacao_externa, modalidades_reserva, horarios_selecionados, status, data_reserva, estudio')
    .eq('status', 'aprovado')
    .gte('data_reserva', inicioDoPeriodo)
    .lte('data_reserva', fimDoMes)
    .order('data_reserva', { ascending: true });

  if (error) throw error;

  const reservas: Reserva[] = (data || []).map((row: any) => ({
    id: row.id,
    nomeCompleto: row.nome_completo,
    tituloGravacao: row.titulo_gravacao,
    tipoOrgao: row.tipo_orgao,
    departamento: row.departamento,
    organizacaoExterna: row.organizacao_externa,
    modalidadesReserva: row.modalidades_reserva,
    horariosSelecionados: row.horarios_selecionados,
    status: row.status,
    dataReserva: row.data_reserva,
    estudio: row.estudio,
  }));

  reservas.sort((a, b) => {
    const timeA = a.horariosSelecionados[a.dataReserva]?.[0] || '00:00';
    const timeB = b.horariosSelecionados[b.dataReserva]?.[0] || '00:00';
    if (a.dataReserva < b.dataReserva) return -1;
    if (a.dataReserva > b.dataReserva) return 1;

    const estudioA = a.estudio ? parseInt(a.estudio.replace('Estúdio ', ''), 10) : 0;
    const estudioB = b.estudio ? parseInt(b.estudio.replace('Estúdio ', ''), 10) : 0;
    if (estudioA < estudioB) return -1;
    if (estudioA > estudioB) return 1;

    return timeA.localeCompare(timeB);
  });

  return reservas;
}


function formatarDataReserva(dateString: string) {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return `Hoje, ${format(date, "d 'de' MMMM", { locale: ptBR })}`;
    }
    if (isTomorrow(date)) {
      return `Amanhã, ${format(date, "d 'de' MMMM", { locale: ptBR })}`;
    }
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

function agruparReservasPorData(reservas: Reserva[]): ReservaAgrupada[] {
    const agrupado: Record<string, Reserva[]> = {};
    reservas.forEach(reserva => {
        const data = reserva.dataReserva;
        if (!agrupado[data]) agrupado[data] = [];
        agrupado[data].push(reserva);
    });
    return Object.entries(agrupado).map(([data, reservas]) => ({ data, reservas }));
}


export default async function PaginaHorarios() {
  const proximasReservasRaw = await getProximasReservas();
  const reservasAgrupadas = agruparReservasPorData(proximasReservasRaw);
  const mesAtual = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="bg-gray-900 text-white min-h-screen p-6 font-sans relative">
    <HorariosRealtime />
    <header className="text-center mb-8 flex flex-col items-center">
        <div className="mb-2">
            <Image
                src="/img/centrologo.png"
                width={250}
                height={80}
                alt="Logotipo do Centro de Mídias Educacionais"
                className="object-contain"
            />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-blue-300">
        Próximas Gravações
        </h1>
         <p className="text-2xl capitalize text-orange-400/90 mt-2">Agenda de {mesAtual}</p>
        <CurrentTime />
    </header>

    <div className="absolute top-8 right-8 flex items-center gap-2">
      <RefreshButton />
      <AutoScrollController targetId="page-footer" />
    </div>


    <main>
        {reservasAgrupadas.length > 0 ? (
        <div className="space-y-8">
            {reservasAgrupadas.map(({ data, reservas }) => (
            <div key={data}>
                <h2 className="text-3xl font-bold capitalize text-orange-400 mb-4 text-center border-b-2 border-orange-400/30 pb-2">
                {formatarDataReserva(data)}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reservas.map((reserva) => {
                    const times = formatarIntervalosHorarios(reserva.horariosSelecionados[reserva.dataReserva]);
                    const organization = reserva.tipoOrgao === 'interno' ? reserva.departamento : reserva.organizacaoExterna;

                    return(
                        <Card key={reserva.id} className="bg-gray-800 border-blue-500/50 shadow-lg rounded-lg overflow-hidden flex flex-col">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl font-bold text-blue-300 flex items-center gap-3">
                                    <User className="w-5 h-5"/> {reserva.nomeCompleto}
                                    </CardTitle>
                                    <Badge variant="secondary" className="text-sm whitespace-nowrap">
                                    <Tv className="w-4 h-4 mr-1.5" /> {reserva.estudio || 'Estúdio'}
                                    </Badge>
                                </div>
                                <CardDescription className="text-base text-gray-400 pt-1 flex items-center gap-2">
                                    <Building className="w-5 h-5" /> {organization}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-2 flex-grow flex flex-col justify-between">
                                <div className="space-y-2 mb-4">
                                    {reserva.tituloGravacao && (
                                        <div className="flex items-start gap-2 text-base text-gray-300">
                                            <FileText className="w-5 h-5 mt-0.5 text-orange-400/80 shrink-0"/>
                                            <span className="text-base font-medium">{reserva.tituloGravacao}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Video className="w-5 h-5 text-orange-400 shrink-0"/>
                                        <span className="text-sm">{reserva.modalidadesReserva}</span>
                                    </div>
                                </div>
                                <div className="mt-auto border-t border-gray-700 pt-3">
                                    <div className="text-2xl font-bold text-blue-300 flex items-center gap-2">
                                        <Clock className="w-6 h-6 shrink-0"/>
                                        <span className="leading-tight">{times}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
                </div>
            </div>
            ))}
        </div>
        ) : (
        <div className="text-center py-16">
            <p className="text-2xl text-gray-500">Nenhuma gravação agendada para os próximos dias.</p>
        </div>
        )}
    </main>
    <footer id="page-footer" className="text-center text-gray-500 mt-12 text-base">
            <p>Horários sujeitos a alteração sem aviso prévio.</p>
        </footer>
    </div>
  );
}
