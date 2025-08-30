
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Booking {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  organizationType: 'interno' | 'externo';
  department?: string;
  externalOrganization?: string;
  bookingModalities: string;
  requiredMaterials?: string;
  participantCount: number;
  tableCount: number;
  chairCount: number;
  selectedSlots: Record<string, string[]>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

async function getPendingBookings(): Promise<Booking[]> {
  const bookingsRef = collection(db, "bookings");
  const q = query(
    bookingsRef,
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  const bookings = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Booking[];
  return bookings;
}

async function updateBookingStatus(id: string, status: 'approved' | 'rejected') {
    const bookingRef = doc(db, "bookings", id);
    await updateDoc(bookingRef, { status });
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchBookings = () => {
    getPendingBookings().then(setBookings);
  };
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        fetchBookings();
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    try {
        await updateBookingStatus(id, status);
        toast({
            title: "Sucesso!",
            description: `Agendamento ${status === 'approved' ? 'aprovado' : 'rejeitado'}.`,
        });
        fetchBookings(); // Refresh the list
    } catch (error) {
        toast({
            title: "Erro",
            description: "Não foi possível atualizar o status do agendamento.",
            variant: "destructive",
        });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }
  
  const formatDateForDisplay = (dateString: string) => {
      // Parse the date string as ISO (e.g., '2024-09-04') which treats it as local timezone
      const date = parseISO(dateString);
      return format(date, "dd 'de' MMMM, yyyy", { locale: ptBR });
  };


  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-headline">
            Painel de Controle
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground font-body">
            Gerencie os agendamentos e horários do Centro de Mídias.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Agendamentos Pendentes</CardTitle>
            <CardDescription>
              Aprove ou rejeite as solicitações de agendamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horários</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length > 0 ? (
                  bookings.map((booking) => {
                    const date = Object.keys(booking.selectedSlots)[0];
                    const formattedDate = formatDateForDisplay(date);
                    const times = booking.selectedSlots[date].join(', ');
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.fullName}<br/><span className="text-xs text-muted-foreground">{booking.email}</span></TableCell>
                        <TableCell>{formattedDate}</TableCell>
                        <TableCell>{times}</TableCell>
                        <TableCell>{booking.bookingModalities}</TableCell>
                        <TableCell className="text-right space-x-2">
                           <Dialog>
                            <DialogTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => setSelectedBooking(booking)}>
                                <Info className="h-4 w-4" />
                               </Button>
                            </DialogTrigger>
                           </Dialog>
                          <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(booking.id, 'approved')}>Aprovar</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleStatusUpdate(booking.id, 'rejected')}>Rejeitar</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Nenhum agendamento pendente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       {selectedBooking && (
        <Dialog open={!!selectedBooking} onOpenChange={(isOpen) => !isOpen && setSelectedBooking(null)}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">Detalhes do Agendamento</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 text-sm">
                    <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <span className="font-semibold text-right">Solicitante:</span>
                        <span>{selectedBooking.fullName}</span>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <span className="font-semibold text-right">E-mail:</span>
                        <span>{selectedBooking.email}</span>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <span className="font-semibold text-right">Telefone:</span>
                        <span>{selectedBooking.phone}</span>
                    </div>
                     <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <span className="font-semibold text-right">Data:</span>
                        <span>{formatDateForDisplay(Object.keys(selectedBooking.selectedSlots)[0])}</span>
                    </div>
                     <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <span className="font-semibold text-right">Horários:</span>
                        <span>{Object.values(selectedBooking.selectedSlots)[0].join(', ')}</span>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <span className="font-semibold text-right">Órgão:</span>
                        <span>{selectedBooking.organizationType === 'interno' ? 'Interno (SEDUC)' : 'Externo'}</span>
                    </div>
                    {selectedBooking.department && (
                         <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                            <span className="font-semibold text-right">Departamento:</span>
                            <span>{selectedBooking.department}</span>
                        </div>
                    )}
                     {selectedBooking.externalOrganization && (
                         <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                            <span className="font-semibold text-right">Órgão Externo:</span>
                            <span>{selectedBooking.externalOrganization}</span>
                        </div>
                    )}
                    <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <span className="font-semibold text-right">Modalidade:</span>
                        <span>{selectedBooking.bookingModalities}</span>
                    </div>
                     <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <span className="font-semibold text-right">Participantes:</span>
                        <span>{selectedBooking.participantCount}</span>
                    </div>
                     <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <span className="font-semibold text-right">Mesas:</span>
                        <span>{selectedBooking.tableCount}</span>
                    </div>
                     <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <span className="font-semibold text-right">Cadeiras:</span>
                        <span>{selectedBooking.chairCount}</span>
                    </div>
                    {selectedBooking.requiredMaterials && (
                         <div className="grid grid-cols-[150px_1fr] items-start gap-4">
                            <span className="font-semibold text-right">Materiais:</span>
                            <span className="break-words">{selectedBooking.requiredMaterials}</span>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
