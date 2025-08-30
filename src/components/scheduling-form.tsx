
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
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import BookingDetailsForm from "./booking-details-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";


export type SelectedSlots = {
  [key: string]: string[];
};

type PendingBooking = {
    date: string;
    times: string[];
}

const timeSlots = Array.from({ length: 9 }, (_, i) => `${String(i + 9).padStart(2, "0")}:00`);
const MIN_BOOKING_NOTICE_DAYS = 5;


async function getPendingBookings(): Promise<PendingBooking[]> {
  const bookingsRef = collection(db, "bookings");
  const q = query(
    bookingsRef,
    where("status", "==", "pending")
  );
  const querySnapshot = await getDocs(q);
  const pendingSlots: PendingBooking[] = [];
  querySnapshot.forEach((doc) => {
      const data = doc.data();
      const slots = data.selectedSlots as Record<string, string[]>;
      for (const date in slots) {
          pendingSlots.push({ date, times: slots[date] });
      }
  });
  return pendingSlots;
}


export default function SchedulingForm() {
  const today = startOfToday();
  const firstBookableDate = addDays(today, MIN_BOOKING_NOTICE_DAYS);

  const [currentDate, setCurrentDate] = useState(firstBookableDate);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlots>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  const { toast } = useToast();
  
  useEffect(() => {
    setLoadingPending(true);
    getPendingBookings().then(data => {
        setPendingBookings(data);
        setLoadingPending(false);
    });
  }, []);


  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { locale: ptBR });
    const end = addDays(start, 6);
    return eachDayOfInterval({ start, end }).filter(day => !isWeekend(day));
  }, [currentDate]);
  
  const isPreviousWeekButtonDisabled = useMemo(() => {
    const firstDayOfCurrentWeek = startOfWeek(currentDate, { locale: ptBR });
    return isBefore(firstDayOfCurrentWeek, startOfWeek(firstBookableDate, { locale: ptBR }));
  }, [currentDate, firstBookableDate]);


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
        // Deselect slot
        const newDaySlots = daySlots.filter((t) => t !== time);
        const newSlots = { ...prev, [dateKey]: newDaySlots };
        // If no slots are selected for this day, remove the date key
        if (newDaySlots.length === 0) {
          delete newSlots[dateKey];
        }
        return newSlots;
      } else {
        // Select slot
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
     getPendingBookings().then(data => {
        setPendingBookings(data);
    });
  }

  return (
    <Card>
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
      <CardContent>
      {loadingPending ? (
         <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-border overflow-hidden rounded-lg border">
          {weekDays.map(day => {
            const isDayDisabled = isBefore(day, firstBookableDate);
            const dateKeyForPending = format(day, "yyyy-MM-dd");
            const pendingSlotsForDay = pendingBookings.find(b => b.date === dateKeyForPending)?.times || [];
            
            return (
            <div key={day.toString()} className={cn("flex flex-col", isDayDisabled ? "bg-muted/50" : "bg-background")}>
              <div className="text-center font-bold py-2 border-b font-headline capitalize">
                {format(day, "EEE", { locale: ptBR })}
                <div className="font-normal text-sm text-muted-foreground">{format(day, "d/MM")}</div>
              </div>
              <div className="flex flex-col p-1 gap-1">
                {timeSlots.map(time => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const isSelected = selectedSlots[dateKey]?.includes(time);
                  const isPending = pendingSlotsForDay.includes(time);

                  const button = (
                     <Button
                      key={time}
                      type="button"
                      variant={isSelected ? "default" : isPending ? "secondary" : "outline"}
                      className={cn("h-8 text-xs", 
                        isSelected && "bg-primary hover:bg-primary/90",
                        isPending && "bg-accent/20 hover:bg-accent/30 text-accent-foreground/70 cursor-not-allowed"
                      )}
                      onClick={() => handleSlotSelect(day, time)}
                      disabled={isDayDisabled || isPending}
                    >
                      {time}
                    </Button>
                  );
                  
                  if (isPending) {
                      return (
                          <TooltipProvider key={time} delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>{button}</TooltipTrigger>
                                <TooltipContent>
                                    <p>Agendamento pendente de aprovação</p>
                                </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                      )
                  }
                  
                  return button;
                })}
              </div>
            </div>
          )})}
        </div>
      )}
      </CardContent>
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
                <DialogTitle className="font-headline">Informações para o agendamento</DialogTitle>
              </DialogHeader>
              <BookingDetailsForm selectedSlots={selectedSlots} onBookingSuccess={onBookingSuccess}/>
            </DialogContent>
          </Dialog>
        </CardFooter>
      )}
    </Card>
  );
}
