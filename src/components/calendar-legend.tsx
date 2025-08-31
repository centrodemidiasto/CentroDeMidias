
import { cn } from "@/lib/utils";

interface LegendItemProps {
    colorClass: string;
    label: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ colorClass, label }) => (
    <div className="flex items-center gap-2">
        <div className={cn("h-4 w-4 rounded-sm border", colorClass)}></div>
        <span className="text-sm text-muted-foreground">{label}</span>
    </div>
);

export default function CalendarLegend() {
    return (
        <div className="px-6 pb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <LegendItem colorClass="bg-background" label="Disponível" />
            <LegendItem colorClass="bg-muted" label="Indisponível" />
            <LegendItem colorClass="bg-primary" label="Selecionado" />
            <LegendItem colorClass="bg-accent/80" label="Aguardando Aprovação" />
        </div>
    );
}
