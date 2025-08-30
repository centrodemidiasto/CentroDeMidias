
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
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { blockSlots, unblockSlots } from "@/app/actions";

type SelectedSlots = {
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
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ManuallyBlockedSlot);
}

export default function BlockSlotsForm() {
  const today = startOfToday();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlots>({});
  const [reservedBookings, setReservedBookings] = useState<ReservedBooking[]>([]);
  const [manuallyBlockedSlots, setManuallyBlockedSlots] = useState<ManuallyBlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  
  const fetchAllBookings = () => {
    setLoading(true);
    Promise.all([getReservedBookings(), getManuallyBlockedSlots()]).then(([reserved, manuallyBlocked]) => {
        setReservedBookings(reserved);
        setManuallyBlockedSlots(manuallyBlocked);
        setLoading(false);
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

  const handleSlotSelect = (day: Date, time: string) => {
    const dateKey = format(day, "yyyy-MM-dd");
  
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

  const handleSaveChanges = async () => {
    console.log("[Client] Initiating handleSaveChanges. Selected slots:", selectedSlots);
    setIsSubmitting(true);
    try {
        const slotsToBlock: SelectedSlots = {};
        const slotsToUnblock: SelectedSlots = {};

        for (const date in selectedSlots) {
            slotsToBlock[date] = [];
            slotsToUnblock[date] = [];
            for (const time of selectedSlots[date]) {
                const isAlreadyBlocked = manuallyBlockedSlots.some(b => b.date === date && b.times.includes(time));
                if (isAlreadyBlocked) {
                    slotsToUnblock[date].push(time);
                } else {
                    slotsToBlock[date].push(time);
                }
            }
        }
        
        console.log("[Client] Slots to Block:", slotsToBlock);
        console.log("[Client] Slots to Unblock:", slotsToUnblock);

        const promises = [];
        const cleanSlotsToBlock = Object.fromEntries(Object.entries(slotsToBlock).filter(([_, v]) => v.length > 0));
        const cleanSlotsToUnblock = Object.fromEntries(Object.entries(slotsToUnblock).filter(([_, v]) => v.length > 0));
        
        console.log("[Client] Cleaned Slots to Block:", cleanSlotsToBlock);
        console.log("[Client] Cleaned Slots to Unblock:", cleanSlotsToUnblock);


        if (Object.keys(cleanSlotsToBlock).length > 0) {
            console.log("[Client] Pushing blockSlots to promises.");
            promises.push(blockSlots(cleanSlotsToBlock));
        }
        if (Object.keys(cleanSlotsToUnblock).length > 0) {
            console.log("[Client] Pushing unblockSlots to promises.");
            promises.push(unblockSlots(cleanSlotsToUnblock));
        }

        if (promises.length === 0) {
          console.log("[Client] No changes to save.");
          toast({
            title: "Nenhuma alteração",
            description: "Nenhum novo horário foi selecionado para bloquear ou desbloquear.",
          });
          setIsSubmitting(false);
          return;
        }

        console.log(`[Client] Executing ${promises.length} promises.`);
        const results = await Promise.all(promises);
        console.log("[Client] Promise results:", results);

        results.forEach(result => {
            if (result) {
                toast({
                    title: result.success ? "Sucesso!" : "Erro",
                    description: result.message,
                    variant: result.success ? "default" : "destructive",
                });
            }
        });

    } catch (error) {
        console.error("[Client] Error in handleSaveChanges:", error);
        toast({
            title: "Erro Inesperado",
            description: "Ocorreu um erro ao processar sua solicitação no cliente. Verifique o console.",
            variant: "destructive",
        });
    } finally {
        setSelectedSlots({});
        fetchAllBookings();
        setIsSubmitting(false);
        console.log("[Client] handleSaveChanges finished.");
    }
  }


  return (
    <>
      <CardHeader>
        <div className="flex justify-between items-center">
          <Button variant="outline" size="icon" onClick={() => changeWeek(-1)}>
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
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-border overflow-hidden rounded-lg border">
              {weekDays.map(day => {
                const dateKeyForReserved = format(day, "yyyy-MM-dd");
                return (
                  <div key={day.toString()} className="flex flex-col bg-background">
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

                        let buttonClass = "";
                        let isDisabled = false;
                        let tooltipContent = "";

                        if (reservedSlot) {
                            isDisabled = true;
                            if (reservedSlot.status === 'pending') {
                                buttonClass = "bg-accent/80 hover:bg-accent/80 text-accent-foreground cursor-not-allowed";
                                tooltipContent = "Agendamento pendente de aprovação";
                            } else {
                                buttonClass = "bg-green-400 hover:bg-green-400 text-green-900 cursor-not-allowed";
                                tooltipContent = "Agendamento confirmado";
                            }
                        } else if (manuallyBlocked) {
                            buttonClass = "bg-destructive/80 hover:bg-destructive/80 text-destructive-foreground";
                            tooltipContent = "Bloqueado pela equipe. Clique para selecionar/desbloquear.";
                        }
                        
                        if (isDisabled) {
                             return (
                                <div key={time}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span tabIndex={0}>
                                        <Button
                                          variant="outline"
                                          className={cn("h-8 w-full text-xs", buttonClass)}
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
                              );
                        }

                        return (
                          <Tooltip key={time}>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant={isSelected ? "default" : "outline"}
                                    className={cn("h-8 text-xs", isSelected ? "bg-primary hover:bg-primary/90" : "", buttonClass)}
                                    onClick={() => handleSlotSelect(day, time)}
                                >
                                    {time}
                                </Button>
                            </TooltipTrigger>
                            {tooltipContent && (
                                <TooltipContent>
                                    <p>{tooltipContent}</p>
                                </TooltipContent>
                            )}
                           </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </TooltipProvider>
      {totalSelectedSlots > 0 && (
        <CardFooter className="flex-col items-start gap-4 pt-4">
           <div className="text-sm text-muted-foreground">
            {totalSelectedSlots} horário(s) selecionado(s) para bloquear/desbloquear.
          </div>
          <Button 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={handleSaveChanges}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Salvar Alterações'}
          </Button>
        </CardFooter>
      )}
    </>
  );
}
