-- ============================================================
-- SCHEMA SUPABASE - Centro de Mídias Educacionais
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Tabela principal de reservas
CREATE TABLE IF NOT EXISTS reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo text NOT NULL,
  email text NOT NULL,
  telefone text,
  titulo_gravacao text NOT NULL,
  tipo_orgao text NOT NULL CHECK (tipo_orgao IN ('interno', 'externo')),
  departamento text,
  organizacao_externa text,
  modalidades_reserva text NOT NULL,
  materiais_necessarios text,
  numero_participantes integer,
  numero_mesas integer,
  numero_cadeiras integer,
  horarios_selecionados jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  data_reserva date NOT NULL,
  estudio text NOT NULL,
  aprovado_por text,
  ultima_alteracao_por text,
  historico jsonb DEFAULT '[]'::jsonb,
  motivo_cancelamento text,
  entrega_material text,
  formato_video text,
  plataforma_video text,
  plataforma_video_outro text,
  participantes jsonb DEFAULT '[]'::jsonb
);

-- Índices para performance nas queries mais comuns
CREATE INDEX IF NOT EXISTS idx_reservas_status ON reservas(status);
CREATE INDEX IF NOT EXISTS idx_reservas_data_reserva ON reservas(data_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_status_data ON reservas(status, data_reserva);

-- Bloqueios manuais de horários
CREATE TABLE IF NOT EXISTS horarios_bloqueados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  horarios text[] NOT NULL DEFAULT '{}',
  estudio text NOT NULL,
  UNIQUE (data, estudio)
);

-- Cache de relatórios gerados
CREATE TABLE IF NOT EXISTS relatorios_consolidados (
  id text PRIMARY KEY,
  csv_content text NOT NULL,
  gerado_em timestamptz NOT NULL DEFAULT now()
);

-- Perfil de usuários (complementa auth.users)
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_bloqueados ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_consolidados ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- RESERVAS: leitura pública (para o calendário de agendamento)
CREATE POLICY "reservas_leitura_publica" ON reservas
  FOR SELECT USING (true);

-- RESERVAS: inserção pública (para criação de agendamentos)
CREATE POLICY "reservas_insercao_publica" ON reservas
  FOR INSERT WITH CHECK (true);

-- RESERVAS: atualização apenas por usuários autenticados (admins)
CREATE POLICY "reservas_atualizacao_autenticado" ON reservas
  FOR UPDATE USING (auth.role() = 'authenticated');

-- HORARIOS_BLOQUEADOS: leitura pública
CREATE POLICY "bloqueios_leitura_publica" ON horarios_bloqueados
  FOR SELECT USING (true);

-- HORARIOS_BLOQUEADOS: escrita apenas por autenticados
CREATE POLICY "bloqueios_escrita_autenticado" ON horarios_bloqueados
  FOR ALL USING (auth.role() = 'authenticated');

-- RELATORIOS: apenas autenticados
CREATE POLICY "relatorios_autenticado" ON relatorios_consolidados
  FOR ALL USING (auth.role() = 'authenticated');

-- USUARIOS: apenas autenticados
CREATE POLICY "usuarios_autenticado" ON usuarios
  FOR ALL USING (auth.role() = 'authenticated');
