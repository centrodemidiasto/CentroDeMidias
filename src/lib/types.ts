
import { Timestamp } from "firebase/firestore";

export interface HistoricoItem {
    acao: string;
    usuario: string;
    data: Timestamp | Date;
}

export interface Reserva {
  id: string;
  nomeCompleto: string;
  email: string;
  telefone?: string;
  tituloGravacao: string;
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
  criadoEm: Timestamp | Date;
  dataReserva: string; // YYYY-MM-DD
  estudio: string;
  aprovadoPor?: string;
  ultimaAlteracaoPor?: string;
  historico?: HistoricoItem[];
  motivoCancelamento?: string;
  // Campos de edição
  entregaMaterial?: string;
  formatoVideo?: string;
  plataformaVideo?: string;
  plataformaVideoOutro?: string;
  participantes?: { nome?: string; funcao?: string }[];
}

export type ReservaExistente = {
    id: string;
    data: string;
    horarios: string[];
    status: 'pendente' | 'aprovado' | 'rejeitado';
    estudio: string;
}

export type BloqueioManual = {
    id: string;
    data: string;
    horarios: string[];
    estudio: string;
}

export interface Usuario {
  uid: string;
  email: string | undefined;
  nome: string;
  disabled: boolean;
  lastSignInTime?: string;
}
