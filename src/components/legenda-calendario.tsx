
import { cn } from "@/lib/utils";

interface ItemLegendaProps {
    corClasse: string;
    label: string;
}

const ItemLegenda: React.FC<ItemLegendaProps> = ({ corClasse, label }) => (
    <div className="flex items-center gap-2">
        <div className={cn("h-4 w-4 rounded-sm border", corClasse)}></div>
        <span className="text-sm text-muted-foreground">{label}</span>
    </div>
);

export default function LegendaCalendario() {
    return (
        <div className="px-6 pb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <ItemLegenda corClasse="bg-background" label="Disponível" />
            <ItemLegenda corClasse="bg-muted" label="Indisponível" />
            <ItemLegenda corClasse="bg-primary" label="Selecionado" />
            <ItemLegenda corClasse="bg-accent/80" label="Aguardando Aprovação" />
        </div>
    );
}
