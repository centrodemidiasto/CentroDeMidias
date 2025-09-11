
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Reserva } from '@/lib/types';
import { format, getYear, getMonth, isAfter, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';
import { gerarOuObterRelatorio } from '@/app/actions';

const MESES = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2000, i), 'MMMM', { locale: ptBR }),
}));

const ANOS = [2024, 2025];

export default function GeradorRelatorio() {
    const hoje = new Date();
    const [mesSelecionado, setMesSelecionado] = useState<number>(getMonth(hoje));
    const [anoSelecionado, setAnoSelecionado] = useState<number>(getYear(hoje));
    const [carregando, setCarregando] = useState(false);
    const { toast } = useToast();

    const handleGerarRelatorio = async () => {
        const primeiroDiaMesAtual = startOfMonth(hoje);
        const primeiroDiaMesSelecionado = new Date(anoSelecionado, mesSelecionado, 1);

        if (!isAfter(primeiroDiaMesAtual, primeiroDiaMesSelecionado)) {
            toast({
                title: 'Período Inválido',
                description: 'Relatórios só podem ser gerados para meses anteriores.',
                variant: 'destructive',
            });
            return;
        }

        setCarregando(true);
        try {
            const resultado = await gerarOuObterRelatorio(mesSelecionado, anoSelecionado);
            
            if (!resultado.sucesso || !resultado.dados) {
                 toast({
                    title: 'Nenhum dado encontrado',
                    description: resultado.mensagem || 'Não há agendamentos realizados para o período selecionado.',
                });
                return;
            }

            const csvContent = "data:text/csv;charset=utf-8," + encodeURI(resultado.dados);
            const link = document.createElement('a');
            link.setAttribute('href', csvContent);
            link.setAttribute('download', `relatorio_agendamentos_${MESES[mesSelecionado].label}_${anoSelecionado}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            toast({
                title: 'Erro ao gerar relatório',
                description: 'Não foi possível buscar os dados para o relatório. Tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setCarregando(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerar Relatório de Gravações</CardTitle>
                <CardDescription>
                    Selecione o mês e o ano para gerar um relatório em formato .csv das gravações realizadas.
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
                <Button onClick={handleGerarRelatorio} disabled={carregando} className="w-full sm:w-auto">
                    {carregando ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="mr-2 h-4 w-4" />
                    )}
                    Gerar Relatório (.csv)
                </Button>
            </CardContent>
        </Card>
    );
}
