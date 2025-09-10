# Sistema de Agendamento do Centro de Mídias Educacionais

Este é um sistema completo para o agendamento e gerenciamento de horários dos estúdios do Centro de Mídias Educacionais do Tocantins. A aplicação permite que usuários externos solicitem horários e que a equipe interna gerencie essas solicitações, além de exibir a grade de horários em um painel público.

## ✨ Funcionalidades

- **Agendamento Público**: Formulário para que usuários solicitem horários nos estúdios, com regras de validação (antecedência mínima, horários disponíveis, etc.).
- **Painel de Controle (Admin)**: Interface restrita para a equipe do Centro de Mídias gerenciar os agendamentos (aprovar, rejeitar, editar), bloquear horários e realizar agendamentos rápidos.
- **Visualização de Horários**: Uma página pública (`/horarios`) que exibe as próximas gravações confirmadas, ideal para ser usada em monitores no local.
- **Autenticação**: Sistema de login para acesso à área administrativa.
- **Normas de Uso e Contato**: Páginas informativas sobre as regras de utilização dos estúdios e informações de contato.

## 🚀 Tecnologias Utilizadas

- **Framework**: [Next.js](https://nextjs.org/) (com App Router)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI**: [Shadcn/ui](https://ui.shadcn.com/)
- **Backend & Banco de Dados**: [Firebase](https://firebase.google.com/) (Firestore para o banco de dados e Firebase Authentication para login)
- **Formulários**: [React Hook Form](https://react-hook-form.com/) com [Zod](https://zod.dev/) para validação de schemas.

## 📂 Estrutura do Projeto

A estrutura de pastas principal está organizada da seguinte forma:

```
src
├── app/                  # Rotas principais da aplicação (App Router)
│   ├── (public)/         # Grupo de rotas públicas
│   │   ├── agendamento/  # Página de solicitação de agendamento
│   │   ├── contato/      # Página de contato
│   │   ├── horarios/     # Página de visualização da grade de horários
│   │   ├── normasdeuso/  # Página com as normas de uso
│   │   ├── sobre/        # Página sobre o Centro de Mídias
│   │   └── page.tsx      # Página inicial (Home)
│   ├── admin/            # Rota e componentes do painel administrativo
│   ├── login/            # Página de login para a área administrativa
│   ├── actions.ts        # Server Actions para manipulação de dados no backend
│   └── layout.tsx        # Layout principal da aplicação
│
├── components/           # Componentes React reutilizáveis
│   ├── ui/               # Componentes base do Shadcn/ui
│   └── *.tsx             # Componentes específicos da aplicação (formulários, header, footer, etc.)
│
├── lib/                  # Funções utilitárias e configuração de serviços
│   ├── firebase.ts       # Configuração do Firebase para o lado do cliente (client-side)
│   ├── firebase-admin.ts # Configuração do Firebase para o lado do servidor (server-side)
│   ├── types.ts          # Definições de tipos e interfaces TypeScript
│   └── utils.ts          # Funções utilitárias gerais (ex: cn para classnames)
│
└── ai/                   # Lógica relacionada a Inteligência Artificial com Genkit
    ├── flows/            # Definição dos fluxos de IA
    └── genkit.ts         # Configuração principal do Genkit
```

## ⚙️ Configuração e Instalação

### Pré-requisitos

- Node.js (v18 ou superior)
- `npm` ou `yarn`


### 1. Instalação das Dependências

Abra o terminal na raiz do projeto e execute o seguinte comando:

```bash
npm install
```

### 2. Executando o Projeto

Para iniciar o servidor de desenvolvimento, execute:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:9002` (ou outra porta, se a 9002 estiver em uso).

### 3. Variaveis de Ambiente

Para fins de segurança não será documentado