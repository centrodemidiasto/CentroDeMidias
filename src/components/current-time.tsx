
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CurrentTime() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set the initial time
    setTime(new Date());

    // Update the time every second
    const intervalId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Clear the interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  if (!time) {
    return <div className="h-10 mt-4"></div>; // Placeholder for initial render
  }

  const formattedDate = format(time, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedTime = format(time, "HH:mm:ss");

  return (
    <div className="mt-4 text-center">
      <p className="text-xl capitalize text-gray-300">{formattedDate}</p>
      <p className="text-3xl font-bold tracking-wider text-gray-400">{formattedTime}</p>
    </div>
  );
}
