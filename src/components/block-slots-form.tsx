
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
  endOfWeek
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import AdminCalendarLegend from "./admin-calendar-legend";

type SelectedSlots = {
  [key: string]: string[];
};

export type ReservedBooking = {
    date: string;
    times: string[];
    status: 'pending' | 'approved';
}

export type ManuallyBlockedSlot = {
    id: string; // Document ID from Firestore
    date: string;
    times: string[];
}

interface BlockSlotsFormProps {
    initialReservedBookings: ReservedBooking[];
    initialManuallyBlockedSlots: ManuallyBlockedSlot[];
}


const timeSlots = Array.from({ length: 9 }, (_, i) => `${String(i + 9).padStart(2, "0")}:00`);


export default function BlockSlotsForm({ initialReservedBookings, initialManuallyBlockedSlots }: BlockSlotsFormProps) {
  const today = startOfToday();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlots>({});
  const [reservedBookings, setReservedBookings] = useState<ReservedBooking[]>(initialReservedBookings);
  const [manuallyBlockedSlots, setManuallyBlockedSlots] = useState<ManuallyBlockedSlot[]>(initialManuallyBlockedSlots);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  
  const fetchManuallyBlockedSlots = async () => {
    const blockedSlotsRef = collection(db, "blockedSlots");
    const querySnapshot = await getDocs(blockedSlotsRef);
    const newBlockedSlots = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ManuallyBlockedSlot);
    setManuallyBlockedSlots(newBlockedSlots);
  }

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { locale: ptBR });
    return eachDayOfInterval({ start, end: addDays(start, 4) });
  }, [currentDate]);

  const isPreviousWeekButtonDisabled = useMemo(() => {
    const firstDayOfCurrentWeek = startOfWeek(currentDate, { locale: ptBR });
    const lastDayOfPreviousWeek = addDays(firstDayOfCurrentWeek, -1);
    return isBefore(lastDayOfPreviousWeek, today);
  }, [currentDate, today]);

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
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const blockedSlotsRef = collection(db, 'blockedSlots');
      
      const changesByDate: Record<string, { toBlock: string[], toUnblock: string[] }> = {};

      // 1. Aggregate all selections into changes per date
      for (const date in selectedSlots) {
        changesByDate[date] = { toBlock: [], toUnblock: [] };
        for (const time of selectedSlots[date]) {
          const isCurrentlyBlocked = manuallyBlockedSlots.some(b => b.date === date && b.times.includes(time));
          if (isCurrentlyBlocked) {
            changesByDate[date].toUnblock.push(time);
          } else {
            changesByDate[date].toBlock.push(time);
          }
        }
      }

      // 2. Process each date's changes and apply to the batch
      for (const date in changesByDate) {
        const { toBlock, toUnblock } = changesByDate[date];
        const existingDoc = manuallyBlockedSlots.find(d => d.date === date);
        const existingTimes = existingDoc?.times || [];
        
        // Calculate the final list of times for the document
        let finalTimes = [...existingTimes];
        
        // Add new blocks
        finalTimes.push(...toBlock);

        // Remove unblocks
        finalTimes = finalTimes.filter(time => !toUnblock.includes(time));
        
        // Remove duplicates
        finalTimes = [...new Set(finalTimes)].sort();

        if (existingDoc) {
          if (finalTimes.length > 0) {
            // Update the document
            batch.update(doc(blockedSlotsRef, existingDoc.id), { times: finalTimes });
          } else {
            // Delete the document if no times are left
            batch.delete(doc(blockedSlotsRef, existingDoc.id));
          }
        } else if (finalTimes.length > 0) {
          // Create a new document if it doesn't exist and there are times to block
          batch.set(doc(collection(db, "blockedSlots")), { date, times: finalTimes });
        }
      }

      await batch.commit();

      toast({
        title: "Sucesso!",
        description: "As alterações nos horários foram salvas.",
      });

    } catch (error) {
      console.error("[Client] Error in handleSaveChanges:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSelectedSlots({});
      await fetchManuallyBlockedSlots();
      setIsSubmitting(false);
    }
  }


  return (
    <>
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-border overflow-hidden rounded-lg border">
              {weekDays.map(day => {
                const dateKeyForReserved = format(day, "yyyy-MM-dd");
                const isPastDay = isBefore(day, today);

                return (
                  <div key={day.toString()} className={cn("flex flex-col", isPastDay ? "bg-muted" : "bg-background")}>
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
                        let isDisabled = isPastDay;
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
                        
                        if (isPastDay && !reservedSlot) { // Check for isPastDay and if there's no reservation
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
                                    {tooltipContent && (
                                    <TooltipContent>
                                      <p>{tooltipContent}</p>
                                    </TooltipContent>
                                    )}
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
        </CardContent>
        <AdminCalendarLegend />
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

    