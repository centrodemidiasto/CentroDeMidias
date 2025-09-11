
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase';
import { Reserva } from '@/lib/types';
import { format, getYear, getMonth, isAfter, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';

const getReservasAprovadasParaRelatorio = async (mes: number, ano: number): Promise<Reserva[]> => {
    const inicioDoMesFiltro = new Date(ano, mes, 1);
    const fimDoMesFiltro = new Date(ano, mes + 1, 0);

    const inicioFormatado = format(inicioDoMesFiltro, 'yyyy-MM-dd');
    const fimFormatado = format(fimDoMesFiltro, 'yyyy-MM-dd');

    const reservasRef = collection(clientDb, 'reservas');
    const q = query(
        reservasRef,
        where('status', '==', 'aprovado'),
        where('dataReserva', '>=', inicioFormatado),
        where('dataReserva', '<=', fimFormatado),
        orderBy('dataReserva', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const reservas = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Reserva[];

    reservas.sort((a, b) => {
        const timeA = a.horariosSelecionados[a.dataReserva]?.[0] || '00:00';
        const timeB = b.horariosSelecionados[b.dataReserva]?.[0] || '00:00';
        if (a.dataReserva < b.dataReserva) return -1;
        if (a.dataReserva > b.dataReserva) return 1;
        return timeA.localeCompare(timeB);
    });

    return reservas;
};

const MESES = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2000, i), 'MMMM', { locale: ptBR }),
}));

const ANOS = Array.from({ length: 5 }, (_, i) => getYear(new Date()) - i);

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
            const reservas = await getReservasAprovadasParaRelatorio(mesSelecionado, anoSelecionado);
            if (reservas.length === 0) {
                toast({
                    title: 'Nenhum dado encontrado',
                    description: 'Não há agendamentos realizados para o período selecionado.',
                });
                return;
            }

            const colunas = ['Data', 'Horario', 'Estudio', 'Titulo da Gravacao', 'Responsavel', 'Setor_Departamento'];
            const linhas = reservas.map(r => {
                const data = r.dataReserva;
                const horario = r.horariosSelecionados[data]?.join(', ') || '';
                const orgao = r.tipoOrgao === 'interno' ? r.departamento : r.organizacaoExterna;
                return [
                    format(new Date(data + 'T00:00:00'), 'dd/MM/yyyy'),
                    `"${horario}"`,
                    r.estudio,
                    `"${r.tituloGravacao.replace(/"/g, '""')}"`,
                    `"${r.nomeCompleto.replace(/"/g, '""')}"`,
                    `"${(orgao || '').replace(/"/g, '""')}"`
                ].join(',');
            });

            const csvContent = "data:text/csv;charset=utf-8," + [colunas.join(','), ...linhas].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
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
