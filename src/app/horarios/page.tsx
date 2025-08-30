
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { format, parseISO, startOfToday, isToday, isTomorrow, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, Building, Video } from "lucide-react";
import CurrentTime from "@/components/current-time";
import Image from "next/image";

interface Booking {
  id: string;
  fullName: string;
  organizationType: 'interno' | 'externo';
  department?: string;
  externalOrganization?: string;
  bookingModalities: string;
  selectedSlots: Record<string, string[]>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  bookingDate: string; // YYYY-MM-DD
}

async function getUpcomingBookings(): Promise<Booking[]> {
  const today = format(startOfToday(), 'yyyy-MM-dd');
  const endOfMonthDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const bookingsRef = collection(db, "bookings");
  
  const q = query(
    bookingsRef,
    where("status", "==", "approved"),
    where("bookingDate", ">=", today),
    where("bookingDate", "<=", endOfMonthDate),
    orderBy("bookingDate", "asc")
  );
  
  const querySnapshot = await getDocs(q);
  const bookingsData = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Booking[];

  // Additional client-side sort by time if needed
  bookingsData.sort((a, b) => {
    const timeA = a.selectedSlots[a.bookingDate][0];
    const timeB = b.selectedSlots[b.bookingDate][0];
    if (a.bookingDate < b.bookingDate) return -1;
    if (a.bookingDate > b.bookingDate) return 1;
    return timeA.localeCompare(timeB);
  });

  return bookingsData;
}


function formatBookingDate(dateString: string) {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return `Hoje, ${format(date, "d 'de' MMMM", { locale: ptBR })}`;
    }
    if (isTomorrow(date)) {
      return `Amanhã, ${format(date, "d 'de' MMMM", { locale: ptBR })}`;
    }
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}


export default async function HorariosPage() {
  const upcomingBookings = await getUpcomingBookings();

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
      </header>

      <main>
        {upcomingBookings.length > 0 ? (
          <div className="space-y-8">
            {upcomingBookings.map((booking) => {
                const date = Object.keys(booking.selectedSlots)[0];
                const formattedDate = formatBookingDate(date);
                const times = booking.selectedSlots[date].join(' - ');
                const organization = booking.organizationType === 'interno' ? booking.department : booking.externalOrganization;

                return(
                    <Card key={booking.id} className="bg-gray-800 border-blue-500/50 shadow-lg rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/30">
                        <CardContent className="p-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
                            <div>
                                <CardTitle className="text-4xl font-bold text-blue-300 flex items-center gap-4">
                                   <User className="w-10 h-10"/> {booking.fullName}
                                </CardTitle>
                                <CardDescription className="text-xl text-gray-400 mt-2 flex items-center gap-3">
                                   <Building className="w-6 h-6" /> {organization}
                                </CardDescription>
                                <div className="mt-6 flex items-center gap-3 text-2xl text-gray-300">
                                   <Video className="w-8 h-8 text-orange-400"/>
                                   <span>{booking.bookingModalities}</span>
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
            <CurrentTime />
        </footer>
    </div>
  );
}
