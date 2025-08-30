"use client";

import { useState, useMemo, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { handleBookingRequest } from "@/app/actions";
import {
  addDays,
  format,
  startOfWeek,
  eachDayOfInterval,
  isWeekend,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SelectedSlots = {
  [key: string]: string[];
};

const timeSlots = Array.from({ length: 9 }, (_, i) => `${String(i + 9).padStart(2, "0")}:00`);

const initialState = null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Validando...
        </>
      ) : (
        "Confirmar Agendamento"
      )}
    </Button>
  );
}

export default function SchedulingForm() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlots>({});
  const [state, formAction] = useActionState(handleBookingRequest, initialState);
  const { toast } = useToast();

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { locale: ptBR });
    const end = addDays(start, 6);
    return eachDayOfInterval({ start, end }).filter(day => !isWeekend(day));
  }, [currentDate]);

  const handleSlotSelect = (day: Date, time: string) => {
    const dateKey = format(day, "yyyy-MM-dd");
    setSelectedSlots(prev => {
      const daySlots = prev[dateKey] ? [...prev[dateKey]] : [];
      if (daySlots.includes(time)) {
        return { ...prev, [dateKey]: daySlots.filter(t => t !== time) };
      } else {
        return { ...prev, [dateKey]: [...daySlots, time] };
      }
    });
  };

  const changeWeek = (amount: number) => {
    setCurrentDate(prev => addDays(prev, amount * 7));
  };
  
  const totalSelectedSlots = Object.values(selectedSlots).reduce((acc, curr) => acc + curr.length, 0);

  useEffect(() => {
    if (state?.message) {
      toast({
        title: state.success ? "Sucesso!" : "Erro de Validação",
        description: state.message,
        variant: state.success ? "default" : "destructive",
      });
      if (state.success) {
        setSelectedSlots({});
      }
    }
  }, [state, toast]);

  return (
    <Card>
      <form action={formAction}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Button variant="outline" size="icon" onClick={() => changeWeek(-1)} disabled={isWeekend(subDays(new Date(),1)) && format(currentDate, 'yyyy-MM-dd') <= format(new Date(), 'yyyy-MM-dd')}>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-border overflow-hidden rounded-lg border">
            {weekDays.map(day => (
              <div key={day.toString()} className="flex flex-col bg-background">
                <div className="text-center font-bold py-2 border-b font-headline capitalize">
                  {format(day, "EEE", { locale: ptBR })}
                  <div className="font-normal text-sm text-muted-foreground">{format(day, "d/MM")}</div>
                </div>
                <div className="flex flex-col p-1 gap-1">
                  {timeSlots.map(time => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const isSelected = selectedSlots[dateKey]?.includes(time);
                    return (
                      <Button
                        key={time}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className={cn("h-8 text-xs", isSelected && "bg-primary hover:bg-primary/90")}
                        onClick={() => handleSlotSelect(day, time)}
                      >
                        {time}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <input type="hidden" name="selectedSlots" value={JSON.stringify(selectedSlots)} />
        </CardContent>
        {totalSelectedSlots > 0 && (
          <CardFooter className="flex-col items-start gap-4 pt-4">
             <div className="text-sm text-muted-foreground">
              {totalSelectedSlots} horário(s) selecionado(s).
            </div>
            <SubmitButton />
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
