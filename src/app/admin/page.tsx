
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Booking {
  id: string;
  fullName: string;
  email: string;
  selectedSlots: Record<string, string[]>;
  bookingModalities: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
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
    return null; // ou um esqueleto de página de login
  }

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
                    const formattedDate = format(new Date(date), "dd 'de' MMMM, yyyy", { locale: ptBR });
                    const times = booking.selectedSlots[date].join(', ');
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.fullName}<br/><span className="text-xs text-muted-foreground">{booking.email}</span></TableCell>
                        <TableCell>{formattedDate}</TableCell>
                        <TableCell>{times}</TableCell>
                        <TableCell>{booking.bookingModalities}</TableCell>
                        <TableCell className="text-right space-x-2">
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
    </div>
  );
}
