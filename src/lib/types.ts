
import { Timestamp } from "firebase/firestore";

export interface Reserva {
  id: string;
  nomeCompleto: string;
  email: string;
  telefone?: string;
  tituloGravacao?: string;
  tipoOrgao: 'interno' | 'externo';
  departamento?: string;
  organizacaoExterna?: string;
  modalidadesReserva: string;
  materiaisNecessarios?: string;
  numeroParticipantes?: number;
  numeroMesas?: number;
  numeroCadeiras?: number;
  horariosSelecionados: Record<string, string[]>;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  criadoEm: Timestamp;
  dataReserva: string; // YYYY-MM-DD
  estudio: string;
}

export type ReservaExistente = {
    data: string;
    horarios: string[];
    status: 'pendente' | 'aprovado';
    estudio: string;
}
