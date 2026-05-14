'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function HorariosRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('horarios-reservas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservas' },
        (payload) => {
          const record = (payload.new ?? payload.old) as { status?: string };
          const oldRecord = payload.old as { status?: string } | undefined;

          const novaAprovada =
            payload.eventType === 'INSERT' && record?.status === 'aprovado';
          const aprovacaoAlterada =
            payload.eventType === 'UPDATE' &&
            (record?.status === 'aprovado' || oldRecord?.status === 'aprovado');
          const removida = payload.eventType === 'DELETE';

          if (novaAprovada || aprovacaoAlterada || removida) {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
