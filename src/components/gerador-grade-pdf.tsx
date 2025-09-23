
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const MESES = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2000, i), 'MMMM', { locale: ptBR }),
}));

const ANOS = [2024, 2025];

export default function GeradorGradePDF() {
    const hoje = new Date();
    const [mesSelecionado, setMesSelecionado] = useState<number>(getMonth(hoje));
    const [anoSelecionado, setAnoSelecionado] = useState<number>(getYear(hoje));
    const [carregando, setCarregando] = useState(false);
    const router = useRouter();

    const handleGerarGrade = () => {
        setCarregando(true);
        const url = `/admin/grade/${anoSelecionado}/${mesSelecionado + 1}`;
        
        // Abrir em nova aba
        window.open(url, '_blank');

        // Um pequeno timeout para o usuário perceber a ação
        setTimeout(() => setCarregando(false), 1000);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerar Grade de Horários</CardTitle>
                <CardDescription>
                    Selecione o mês e o ano para gerar uma grade de horários em formato .pdf.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full sm:w-auto">
                    <Select value={String(mesSelecionado)} onValueChange={(v) => setMesSelecionado(Number(v))}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                        <SelectContent>
                            {MESES.map(mes => (
                                <SelectItem key={mes.value} value={String(mes.value)}>
                                    {mes.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 w-full sm:w-auto">
                    <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(Number(v))}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o ano" />
                        </SelectTrigger>
                        <SelectContent>
                            {ANOS.map(ano => (
                                <SelectItem key={ano} value={String(ano)}>
                                    {ano}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleGerarGrade} disabled={carregando} className="w-full sm:w-auto">
                    {carregando ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <FileText className="mr-2 h-4 w-4" />
                    )}
                    Gerar Grade (.pdf)
                </Button>
            </CardContent>
        </Card>
    );
}
