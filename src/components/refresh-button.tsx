
'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="absolute top-8 right-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={isPending}
        className="text-gray-400 hover:text-white hover:bg-white/10"
        aria-label="Atualizar horários"
      >
        <RefreshCw className={`h-6 w-6 ${isPending ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
