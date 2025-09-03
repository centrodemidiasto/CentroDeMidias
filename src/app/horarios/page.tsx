
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db as clientDb } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { format, parseISO, startOfToday, isToday, isTomorrow, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, Building, Video } from "lucide-react";
import CurrentTime from "@/components/current-time";
import Image from "next/image";

interface Reserva {
  id: string;
  nomeCompleto: string;
  tipoOrgao: 'interno' | 'externo';
  departamento?: string;
  organizacaoExterna?: string;
  modalidadesReserva: string;
  horariosSelecionados: Record<string, string[]>;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  criadoEm: Timestamp;
  dataReserva: string; // YYYY-MM-DD
}

async function getProximasReservas(): Promise<Reserva[]> {
  const hoje = format(startOfToday(), 'yyyy-MM-dd');
  const trintaDiasAFrente = format(addDays(new Date(), 30), 'yyyy-MM-dd');
  const reservasRef = collection(clientDb, "reservas");
  
  const q = query(
    reservasRef,
    where("status", "==", "aprovado"),
    where("dataReserva", ">=", hoje),
    where("dataReserva", "<=", trintaDiasAFrente),
    orderBy("dataReserva", "asc")
  );
  
  const querySnapshot = await getDocs(q);
  const dadosReservas = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Reserva[];

  dadosReservas.sort((a, b) => {
    const timeA = a.horariosSelecionados[a.dataReserva]?.[0] || '00:00';
    const timeB = b.horariosSelecionados[b.dataReserva]?.[0] || '00:00';
    if (a.dataReserva < b.dataReserva) return -1;
    if (a.dataReserva > b.dataReserva) return 1;
    return timeA.localeCompare(timeB);
  });

  return dadosReservas;
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


export default async function PaginaHorarios() {
  const proximasReservas = await getProximasReservas();

  return (
    <div className="bg-gray-900 text-white min-h-screen p-8 font-sans">
      <header className="text-center mb-12 flex flex-col items-center">
         <div className="mb-4">
            <Image
                src="/img/centrologo.png"
                width={300}
                height={100}
                alt="Logotipo do Centro de Mídias Educacionais"
                className="object-contain"
            />
        </div>
        <h1 className="text-6xl font-bold tracking-tight text-blue-300">
          Próximas Gravações
        </h1>
        <CurrentTime />
      </header>

      <main>
        {proximasReservas.length > 0 ? (
          <div className="space-y-8">
            {proximasReservas.map((reserva) => {
                const date = Object.keys(reserva.horariosSelecionados)[0];
                const formattedDate = formatarDataReserva(date);
                const times = reserva.horariosSelecionados[date].join(' - ');
                const organization = reserva.tipoOrgao === 'interno' ? reserva.departamento : reserva.organizacaoExterna;

                return(
                    <Card key={reserva.id} className="bg-gray-800 border-blue-500/50 shadow-lg rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/30">
                        <CardContent className="p-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
                            <div>
                                <CardTitle className="text-4xl font-bold text-blue-300 flex items-center gap-4">
                                   <User className="w-10 h-10"/> {reserva.nomeCompleto}
                                </CardTitle>
                                <CardDescription className="text-xl text-gray-400 mt-2 flex items-center gap-3">
                                   <Building className="w-6 h-6" /> {organization}
                                </CardDescription>
                                <div className="mt-6 flex items-center gap-3 text-2xl text-gray-300">
                                   <Video className="w-8 h-8 text-orange-400"/>
                                   <span>{reserva.modalidadesReserva}</span>
                                 </div>
                            </div>
                            <div className="text-right flex flex-col justify-center items-end">
                                <p className="text-3xl font-semibold capitalize text-orange-400">{formattedDate}</p>
                                <div className="mt-2 text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-blue-500 flex items-center gap-3">
                                   <Clock className="w-12 h-12"/>
                                   <span>{times}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-3xl text-gray-500">Nenhuma gravação agendada para os próximos dias.</p>
          </div>
        )}
      </main>
       <footer className="text-center text-gray-500 mt-16 text-lg">
            <p>Horários sujeitos a alteração sem aviso prévio.</p>
        </footer>
    </div>
  );
}
