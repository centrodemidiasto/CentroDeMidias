
'use client';

import { useState, useMemo, useEffect } from "react";
import {
  addDays,
  format,
  startOfWeek,
  eachDayOfInterval,
  isWeekend,
  isBefore,
  startOfToday,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import BookingDetailsForm from "./booking-details-form";
import AdminBookingForm from "./admin-booking-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import CalendarLegend from "./calendar-legend";


export type SelectedSlots = {
  [key: string]: string[];
};

type ReservedBooking = {
    date: string;
    times: string[];
    status: 'pending' | 'approved';
}

type ManuallyBlockedSlot = {
    date: string;
    times: string[];
}

const timeSlots = Array.from({ length: 9 }, (_, i) => `${String(i + 9).padStart(2, "0")}:00`);
const MIN_BOOKING_NOTICE_DAYS = 5;


async function getReservedBookings(): Promise<ReservedBooking[]> {
  const bookingsRef = collection(db, "bookings");
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
    const blockedSlotsRef = collection(db, "blockedSlots");
    const querySnapshot = await getDocs(blockedSlotsRef);
    return querySnapshot.docs.map(doc => doc.data() as ManuallyBlockedSlot);
}


export default function SchedulingForm() {
  const today = startOfToday();
  const initialFirstBookableDate = addDays(today, MIN_BOOKING_NOTICE_DAYS);

  const [currentDate, setCurrentDate] = useState(initialFirstBookableDate);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlots>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reservedBookings, setReservedBookings] = useState<ReservedBooking[]>([]);
  const [manuallyBlockedSlots, setManuallyBlockedSlots] = useState<ManuallyBlockedSlot[]>([]);
  const [loadingReserved, setLoadingReserved] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);


  const { toast } = useToast();
  
  useEffect(() => {
    setIsClient(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const firstBookableDate = user ? today : initialFirstBookableDate;

  useEffect(() => {
    // Adjust current date only if user status changes and the current view is no longer valid
    if (user && isBefore(currentDate, today)) {
        setCurrentDate(today);
    } else if (!user && isBefore(currentDate, initialFirstBookableDate)) {
        setCurrentDate(initialFirstBookableDate);
    }
  }, [user, currentDate, today, initialFirstBookableDate]);
  
  const fetchAllBookings = () => {
    setLoadingReserved(true);
    Promise.all([getReservedBookings(), getManuallyBlockedSlots()]).then(([reserved, manuallyBlocked]) => {
        setReservedBookings(reserved);
        setManuallyBlockedSlots(manuallyBlocked);
        setLoadingReserved(false);
    });
  }

  useEffect(() => {
    fetchAllBookings();
  }, []);


  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { locale: ptBR });
    const end = addDays(start, 6);
    return eachDayOfInterval({ start, end }).filter(day => !isWeekend(day));
  }, [currentDate]);
  
  const isPreviousWeekButtonDisabled = useMemo(() => {
    if (!isClient) return true; // Disable on server and during first render
    const firstDayOfCurrentWeek = startOfWeek(currentDate, { locale: ptBR });
    if (user) {
        // Admins can't go to a week that is entirely in the past
        const lastDayOfPreviousWeek = addDays(firstDayOfCurrentWeek, -1);
        return isBefore(lastDayOfPreviousWeek, today);
    }
    const firstPossibleDay = startOfWeek(initialFirstBookableDate, { locale: ptBR });
    return isBefore(firstDayOfCurrentWeek, firstPossibleDay);
  }, [currentDate, initialFirstBookableDate, user, today, isClient]);


  const handleSlotSelect = (day: Date, time: string) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const selectedDays = Object.keys(selectedSlots).filter(
      (key) => selectedSlots[key].length > 0
    );
  
    if (selectedDays.length > 0 && !selectedDays.includes(dateKey)) {
      toast({
        title: "Atenção",
        description: "Você só pode selecionar horários para um único dia. O agendamento deve ser feito por dia.",
        variant: "destructive",
      });
      return;
    }
  
    setSelectedSlots((prev) => {
      const daySlots = prev[dateKey] ? [...prev[dateKey]] : [];
      if (daySlots.includes(time)) {
        const newDaySlots = daySlots.filter((t) => t !== time);
        const newSlots = { ...prev, [dateKey]: newDaySlots };
        if (newDaySlots.length === 0) {
          delete newSlots[dateKey];
        }
        return newSlots;
      } else {
        return { ...prev, [dateKey]: [...daySlots, time] };
      }
    });
  };

  const changeWeek = (amount: number) => {
    setCurrentDate(prev => addDays(prev, amount * 7));
  };
  
  const totalSelectedSlots = Object.values(selectedSlots).reduce((acc, curr) => acc + curr.length, 0);
  
  const onBookingSuccess = () => {
    setSelectedSlots({});
    setIsModalOpen(false);
    fetchAllBookings();
  }

  return (
    <Card>
      {user && (
         <div className="p-4 border-b">
            <Alert variant="default" className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="font-headline text-primary">Modo de Agendamento Simplificado</AlertTitle>
                <AlertDescription>
                    Você está autenticado com uma conta do Centro de Mídias. Os agendamentos realizados serão aprovados automaticamente e usarão um formulário simplificado.
                </AlertDescription>
            </Alert>
         </div>
      )}
      <CardHeader>
        <div className="flex justify-between items-center">
          <Button variant="outline" size="icon" onClick={() => changeWeek(-1)} disabled={isPreviousWeekButtonDisabled}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold text-center font-headline">
            {format(weekDays[0], "d 'de' MMMM", { locale: ptBR })} - {format(weekDays[weekDays.length - 1], "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => changeWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
       <TooltipProvider delayDuration={100}>
        <CardContent>
        {loadingReserved || !isClient ? (
          <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-border overflow-hidden rounded-lg border">
            {weekDays.map(day => {
                const isDayDisabledForUser = isBefore(day, firstBookableDate);
                let isDayDisabled = user ? false : isDayDisabledForUser;
                const dateKeyForReserved = format(day, "yyyy-MM-dd");
                 if (user && isBefore(day, startOfToday())) {
                  isDayDisabled = true;
                }
                
                return (
                <div key={day.toString()} className={cn("flex flex-col", isDayDisabled ? "bg-muted" : "bg-background")}>
                <div className="text-center font-bold py-2 border-b font-headline capitalize">
                    {format(day, "EEE", { locale: ptBR })}
                    <div className="font-normal text-sm text-muted-foreground">{format(day, "d/MM")}</div>
                </div>
                <div className="flex flex-col p-1 gap-1">
                    {timeSlots.map(time => {
                      const dateKey = format(day, "yyyy-MM-dd");
                      const isSelected = selectedSlots[dateKey]?.includes(time);
                      const reservedSlot = reservedBookings.find(b => b.date === dateKeyForReserved && b.times.includes(time));
                      const manuallyBlocked = manuallyBlockedSlots.find(b => b.date === dateKeyForReserved && b.times.includes(time));

                      if (manuallyBlocked) {
                           return (
                                <Button
                                    key={time}
                                    variant="outline"
                                    className="h-8 w-full text-xs bg-muted cursor-not-allowed"
                                    disabled
                                >
                                    {time}
                                </Button>
                            );
                      }

                      if (reservedSlot) {
                          const isPending = reservedSlot.status === 'pending';
                          const tooltipContent = isPending 
                              ? "Agendamento pendente de aprovação"
                              : "Agendamento já realizado e confirmado para este horário";
                          const buttonColorClass = isPending 
                              ? "bg-accent/80 hover:bg-accent/80 text-accent-foreground cursor-not-allowed"
                              : "bg-green-400 hover:bg-green-400 text-green-900 cursor-not-allowed";

                          return (
                              <div key={time}>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <span tabIndex={0}>
                                              <Button
                                                  variant="outline"
                                                  className={cn("h-8 w-full text-xs", buttonColorClass)}
                                                  disabled
                                              >
                                              {time}
                                              </Button>
                                          </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                          <p>{tooltipContent}</p>
                                      </TooltipContent>
                                  </Tooltip>
                              </div>
                          )
                      }
                    
                      return (
                         <Button
                            key={time}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className={cn("h-8 text-xs", isSelected && "bg-primary hover:bg-primary/90")}
                            onClick={() => handleSlotSelect(day, time)}
                            disabled={isDayDisabled}
                          >
                          {time}
                          </Button>
                      );
                    })}
                </div>
                </div>
            )})}
            </div>
        )}
        </CardContent>
        <CalendarLegend />
      </TooltipProvider>
      {totalSelectedSlots > 0 && (
        <CardFooter className="flex-col items-start gap-4 pt-4">
           <div className="text-sm text-muted-foreground">
            {totalSelectedSlots} horário(s) selecionado(s).
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                Continuar Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle className="font-headline">
                    {user ? "Agendamento Simplificado" : "Informações para o agendamento"}
                </DialogTitle>
              </DialogHeader>
              {user ? (
                 <AdminBookingForm selectedSlots={selectedSlots} onBookingSuccess={onBookingSuccess}/>
              ) : (
                 <BookingDetailsForm selectedSlots={selectedSlots} onBookingSuccess={onBookingSuccess}/>
              )}
            </DialogContent>
          </Dialog>
        </CardFooter>
      )}
    </Card>
  );
}
