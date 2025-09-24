
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText } from 'lucide-react';

const MESES = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2000, i), 'MMMM', { locale: ptBR }),
}));

// Gera os próximos 5 anos a partir do ano atual
const currentYear = getYear(new Date());
const ANOS = Array.from({ length: 5 }, (_, i) => currentYear + i);

export default function GeradorDeGrade() {
    const [mesSelecionado, setMesSelecionado] = useState<number>(getMonth(new Date()));
    const [anoSelecionado, setAnoSelecionado] = useState<number>(getYear(new Date()));

    const handleGerarGrade = () => {
        const url = `/admin/grade/${anoSelecionado}/${mesSelecionado}`;
        window.open(url, '_blank');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerar Grade de Horários</CardTitle>
                <CardDescription>
                    Selecione o mês e o ano para gerar uma grade de horários para impressão.
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
                <Button onClick={handleGerarGrade} className="w-full sm:w-auto">
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Grade
                </Button>
            </CardContent>
        </Card>
    );
}
