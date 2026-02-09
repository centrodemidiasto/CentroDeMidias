import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata um array de horários (strings HH:mm) em intervalos legíveis.
 * Ex: ["08:00", "08:30", "09:00", "14:00"] -> "08:00 às 10:00 e 14:00 às 15:00"
 * (Considerando que cada slot tem 60 minutos de duração total, conforme regras do sistema)
 */
export function formatarIntervalosHorarios(horarios: string[]): string {
    if (!horarios || horarios.length === 0) return "Horário não definido";

    // 1. Ordenar horários
    const ordenados = [...horarios].sort((a, b) => a.localeCompare(b));

    const paraMinutos = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const paraString = (min: number) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const intervalos: string[] = [];
    if (ordenados.length === 0) return "";

    let inicioIntervalo = paraMinutos(ordenados[0]);
    let fimAtual = inicioIntervalo + 60; 

    for (let i = 1; i < ordenados.length; i++) {
        const proximoInicio = paraMinutos(ordenados[i]);
        
        // Se o próximo horário começa dentro ou exatamente quando o atual termina, expandimos o intervalo
        if (proximoInicio <= fimAtual) {
            fimAtual = proximoInicio + 60;
        } else {
            // Caso contrário, fechamos o intervalo anterior e começamos um novo
            intervalos.push(`${paraString(inicioIntervalo)} às ${paraString(fimAtual)}`);
            inicioIntervalo = proximoInicio;
            fimAtual = inicioIntervalo + 60;
        }
    }
    intervalos.push(`${paraString(inicioIntervalo)} às ${paraString(fimAtual)}`);

    if (intervalos.length === 1) return intervalos[0];
    
    const ultimo = intervalos.pop();
    return `${intervalos.join(', ')} e ${ultimo}`;
}
