
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db as clientDb } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Loader2, Info, XCircle, CalendarPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfToday, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BlockSlotsForm, { ReservedBooking, ManuallyBlockedSlot } from '@/components/block-slots-form';
import { updateBookingStatus } from '@/app/actions';
import Link from 'next/link';

interface Booking {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  recordingTitle?: string;
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
  bookingDate: string; // YYYY-MM-DD
}

async function getPendingBookings(): Promise<Booking[]> {
  const bookingsRef = collection(clientDb, "bookings");
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

async function getApprovedBookings(): Promise<Booking[]> {
  const today = format(startOfToday(), 'yyyy-MM-dd');
  const bookingsRef = collection(clientDb, "bookings");

  const q = query(
    bookingsRef,
    where("status", "==", "approved"),
    where("bookingDate", ">=", today),
    orderBy("bookingDate", "asc")
  );
  const querySnapshot = await getDocs(q);
  const bookings = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Booking[];

  // Additional client-side sort by time if needed, as Firestore can only order by one field in a range query
  bookings.sort((a, b) => {
    const timeA = a.selectedSlots[a.bookingDate]?.[0] || '00:00';
    const timeB = b.selectedSlots[b.bookingDate]?.[0] || '00:00';
    if (a.bookingDate < b.bookingDate) return -1;
    if (a.bookingDate > b.bookingDate) return 1;
    return timeA.localeCompare(timeB);
  });
  
  return bookings;
}

async function getReservedBookingsForBlocking(): Promise<ReservedBooking[]> {
  const bookingsRef = collection(clientDb, "bookings");
  const q = query(
    bookingsRef,
    where("status", "in", ["pending", "approved"])
  );
  const querySnapshot = await getDocs(q);
  const reservedSlots: ReservedBooking[] = [];
  querySnapshot.forEach((doc) => {
      const data = doc.data();
      const slots = data.selectedSlots as Record<string, string[]>;
      const status = data.status as 'pending' | 'approved';
      for (const date in slots) {
          reservedSlots.push({ date, times: slots[date], status });
      }
  });
  return reservedSlots;
}

async function getManuallyBlockedSlots(): Promise<ManuallyBlockedSlot[]> {
    const blockedSlotsRef = collection(clientDb, "blockedSlots");
    const querySnapshot = await getDocs(blockedSlotsRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ManuallyBlockedSlot);
}


export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // States for each section's data
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [approvedBookings, setApprovedBookings] = useState<Booking[] | null>(null);
  const [blockSlotsData, setBlockSlotsData] = useState<{ reserved: ReservedBooking[], manual: ManuallyBlockedSlot[] } | null>(null);
  
  // States for loading indicators for each section
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingApproved, setLoadingApproved] = useState(false);
  const [loadingBlockSlots, setLoadingBlockSlots] = useState(false);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchPendingBookings = () => {
    setLoadingPending(true);
    getPendingBookings().then(data => {
        setPendingBookings(data);
        setLoadingPending(false);
        setInitialLoading(false);
    }).catch(err => {
        console.error("Error fetching pending bookings:", err);
        toast({ title: "Erro ao buscar pendentes", description: err.message, variant: "destructive"});
        setLoadingPending(false);
        setInitialLoading(false);
    });
  };

  const fetchApprovedBookings = () => {
    if (approvedBookings) return; // Don't refetch if already loaded
    setLoadingApproved(true);
    getApprovedBookings().then(data => {
        setApprovedBookings(data);
        setLoadingApproved(false);
    }).catch(err => {
        console.error("Error fetching approved bookings:", err);
        toast({ title: "Erro ao buscar aprovados", description: err.message, variant: "destructive"});
        setLoadingApproved(false);
    });
  };

  const fetchBlockSlotsData = () => {
    if (blockSlotsData) return; // Don't refetch
    setLoadingBlockSlots(true);
    Promise.all([getReservedBookingsForBlocking(), getManuallyBlockedSlots()]).then(([reserved, manual]) => {
        setBlockSlotsData({ reserved, manual });
        setLoadingBlockSlots(false);
    }).catch(err => {
        console.error("Error fetching block slots data:", err);
        toast({ title: "Erro ao buscar dados de bloqueio", description: err.message, variant: "destructive"});
        setLoadingBlockSlots(false);
    });
  };

  const handleAccordionChange = (value: string) => {
    if (value === "approved" && !approvedBookings) {
      fetchApprovedBookings();
    } else if (value === "block-slots" && !blockSlotsData) {
      fetchBlockSlotsData();
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        fetchPendingBookings(); // Load pending bookings by default
      } else {
        router.push('/login');
      }
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
        // Refetch relevant data after update
        fetchPendingBookings();
        if (approvedBookings || status === 'approved') {
            setApprovedBookings(null); // Force refetch
            fetchApprovedBookings();
        }
    } catch (error: any) {
        console.error("Error updating booking status:", error);
        toast({
            title: "Erro",
            description: error.message || "Não foi possível atualizar o status do agendamento.",
            variant: "destructive",
        });
    }
  }

  if (initialLoading && !user) {
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
      try {
        const date = parseISO(dateString);
        return format(date, "dd 'de' MMMM, yyyy", { locale: ptBR });
      } catch (error) {
        console.error("Invalid date format:", dateString);
        return "Data inválida";
      }
  };

  const createGoogleCalendarLink = (booking: Booking): string => {
    const date = Object.keys(booking.selectedSlots)[0];
    const startTimeStr = booking.selectedSlots[date]?.[0];
    const endTimeStr = booking.selectedSlots[date]?.[booking.selectedSlots[date].length - 1];

    if (!date || !startTimeStr || !endTimeStr) return '';

    const startDateTime = parseISO(`${date}T${startTimeStr}:00`);
    const endDateTime = addHours(parseISO(`${date}T${endTimeStr}:00`), 1);

    const formatForGoogle = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");

    const dates = `${formatForGoogle(startDateTime)}/${formatForGoogle(endDateTime)}`;
    const text = `Gravação: ${booking.recordingTitle || booking.fullName} - ${booking.bookingModalities}`;
    
    const organization = booking.organizationType === 'interno' ? booking.department : booking.externalOrganization;
    
    // Helper to format details, replacing falsy values with '-'
    const formatDetail = (value: any) => (value ? value : '-');
    const formatMaterials = (value: any) => (value && value.toLowerCase() !== 'nenhum' ? value : '-');

    const details = `Agendamento no Centro de Mídias.
Solicitante: ${formatDetail(booking.fullName)}
Órgão: ${formatDetail(organization)}
Modalidade: ${formatDetail(booking.bookingModalities)}
Participantes: ${formatDetail(booking.participantCount)}
Mesas: ${formatDetail(booking.tableCount)}
Cadeiras: ${formatDetail(booking.chairCount)}
Materiais: ${formatMaterials(booking.requiredMaterials)}`;

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text,
        dates,
        details,
        location: 'Centro de Mídias Educacionais - Palmas, TO',
    });

    return `https://www.google.com/calendar/render?${params.toString()}`;
  }


  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="space-y-12">
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
            {loadingPending ? (
                 <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
            ) : (
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
                    {pendingBookings.length > 0 ? (
                    pendingBookings.map((booking) => {
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
            )}
          </CardContent>
        </Card>

        <Accordion type="single" collapsible onValueChange={handleAccordionChange}>
            <AccordionItem value="approved">
                <Card>
                    <AccordionTrigger className="p-6">
                        <div className="text-left">
                            <CardTitle>Próximas Gravações</CardTitle>
                            <CardDescription>Estes são os agendamentos confirmados para os próximos dias.</CardDescription>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent>
                            {loadingApproved ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : approvedBookings && approvedBookings.length > 0 ? (
                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-6">
                                    {approvedBookings.map((booking) => {
                                        const date = Object.keys(booking.selectedSlots)[0];
                                        const formattedDate = formatDateForDisplay(date);
                                        const times = booking.selectedSlots[date].join(', ');
                                        const calendarLink = createGoogleCalendarLink(booking);
                                        const organization = booking.organizationType === 'interno' ? booking.department : booking.externalOrganization;

                                        return (
                                            <Card key={booking.id} className="flex flex-col">
                                                <CardHeader className="pb-4">
                                                    <CardTitle className="text-xl font-headline">{booking.recordingTitle || 'Sem Título'}</CardTitle>
                                                    <CardDescription>{booking.fullName} - {organization}</CardDescription>
                                                </CardHeader>
                                                <CardContent className="flex-grow space-y-2 text-sm">
                                                    <p><strong>Data:</strong> {formattedDate}</p>
                                                    <p><strong>Horários:</strong> {times}</p>
                                                    <p><strong>Modalidade:</strong> {booking.bookingModalities}</p>
                                                </CardContent>
                                                <CardFooter className="flex-col items-start gap-2">
                                                    <div className='flex gap-2 w-full'>
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" className="w-full" onClick={() => setSelectedBooking(booking)}>
                                                                    <Info className="mr-2 h-4 w-4" /> Ver
                                                                </Button>
                                                            </DialogTrigger>
                                                        </Dialog>
                                                        <Button variant="destructive" className="w-full" onClick={() => handleStatusUpdate(booking.id, 'rejected')}>
                                                            <XCircle className="mr-2 h-4 w-4" /> Cancelar
                                                        </Button>
                                                    </div>
                                                    <Button asChild variant="secondary" className="w-full">
                                                        <Link href={calendarLink} target="_blank" rel="noopener noreferrer">
                                                            <CalendarPlus className="mr-2 h-4 w-4" />
                                                            Google Agenda
                                                        </Link>
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">Nenhuma gravação confirmada para os próximos dias.</p>
                            )}
                        </CardContent>
                    </AccordionContent>
                </Card>
            </AccordionItem>
            <AccordionItem value="block-slots">
                 <Card>
                    <AccordionTrigger className="p-6">
                       <div className="text-left">
                            <CardTitle>Bloquear Horários</CardTitle>
                            <CardDescription>Selecione os horários no calendário abaixo para bloquear ou desbloquear manualmente.</CardDescription>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent>
                           {loadingBlockSlots ? (
                                 <div className="flex items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                 </div>
                            ) : blockSlotsData ? (
                                <BlockSlotsForm 
                                    initialReservedBookings={blockSlotsData.reserved}
                                    initialManuallyBlockedSlots={blockSlotsData.manual}
                                />
                            ) : (
                                // This case should ideally not be hit if the accordion triggers the load
                                <div className="text-center text-muted-foreground py-8">Clique para carregar o calendário.</div>
                            )}
                        </CardContent>
                    </AccordionContent>
                </Card>
            </AccordionItem>
        </Accordion>
      </div>

       {selectedBooking && (
        <Dialog open={!!selectedBooking} onOpenChange={(isOpen) => !isOpen && setSelectedBooking(null)}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">Detalhes do Agendamento</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 text-sm max-h-[70vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <span className="font-semibold text-right">Título:</span>
                        <span>{selectedBooking.recordingTitle}</span>
                    </div>
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
