# Gestão Docente

> Plataforma web para acompanhamento de faltas, carga horária, entregas e indicadores de professores por segmento escolar.

O **Gestão Docente** substitui controles descentralizados em planilhas por uma aplicação web com regras de acesso, registros auditáveis e uma visão gerencial para apoiar coordenação e direção escolar.

## Visão do produto

O sistema permite que a administração mantenha o cadastro e os horários dos professores, enquanto responsáveis por segmento acompanham apenas as informações da sua etapa escolar. As faltas calculam automaticamente as horas-aula não ministradas conforme o dia e turno cadastrados. Entregas de notas, materiais, reuniões, capacitações e eventos alimentam indicadores e listas de pendências.

| Público | Permissão principal |
|---|---|
| Administrador | Gerencia professores, segmentos, acessos e todos os indicadores. |
| Responsável por segmento | Registra e visualiza somente os dados do segmento vinculado ao seu usuário. |

## Funcionalidades

- Cadastro de professores, disciplinas, séries, turmas e carga horária por dia e turno.
- Registro de faltas com cálculo automático de horas-aula sem professor.
- Registro de tarefas docentes: notas, materiais, reunião, capacitação e eventos.
- Dashboard com filtros de período, segmento e professor.
- Indicadores de aulas previstas, aulas sem professor, índice de ausência e faltas registradas.
- Comparação mensal nos cards e ranking dos seis professores com mais faltas.
- Gráficos de tarefas com detalhamento de professores pendentes.
- Controle de professor demitido, removendo-o dos filtros e cálculos sem apagar o histórico.
- Autorização no servidor para isolamento de dados entre segmentos.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Interface | React 19, TypeScript, Tailwind CSS e Recharts |
| API | Node.js, Express e tRPC |
| Persistência | Prisma ORM e banco MySQL/TiDB Cloud |
| Validação | Zod e Vitest |
| Ambiente local | pnpm, Prisma Migrate e Prisma Studio |

## Arquitetura

```text
React + tRPC
      │
      ▼
Express / regras de acesso por segmento
      │
      ▼
Prisma ORM
      │
      ▼
TiDB Cloud (MySQL compatível)
```

O schema relacional está centralizado em [`prisma/schema.prisma`](prisma/schema.prisma). As regras de cálculo, permissões e consultas ficam no servidor, impedindo que o navegador consulte dados de outros segmentos.

## Executar localmente

### Pré-requisitos

- Node.js 20 ou superior.
- pnpm 10 ou superior.
- Uma instância MySQL compatível; o projeto foi validado com TiDB Cloud.

### Configuração

```powershell
pnpm install
pnpm db:generate
Copy-Item env.local.example.txt .env
```

Edite `.env` com sua URL segura do TiDB Cloud e mantenha `LOCAL_AUTH_ENABLED=true` para usar o administrador local de desenvolvimento. Consulte [`LOCAL_SETUP.md`](LOCAL_SETUP.md) para o passo a passo completo.

### Banco e servidor

```powershell
pnpm db:migrate-local
pnpm dev
```

Depois, acesse [http://localhost:3000](http://localhost:3000). Para inspecionar as tabelas visualmente, execute:

```powershell
pnpm db:studio
```

## Qualidade e segurança

```powershell
pnpm run check
pnpm test
```

O projeto possui testes para regras de presença, cálculo de indicadores, agrupamento de pendências, permissão por segmento e modo local de autenticação. Arquivos `.env` e certificados locais são ignorados pelo Git e **nunca devem ser enviados ao repositório**.

## Estrutura do projeto

```text
client/       Interface React
server/       API tRPC, regras e consultas Prisma
prisma/       Schema e migrações do banco
shared/       Tipos e constantes compartilhadas
LOCAL_SETUP.md Guia detalhado de execução local
```

## Próximas evoluções

- Exportar relatórios por segmento.
- Adicionar calendário escolar e feriados para refinar a carga prevista.
- Incluir metas de ausência e notificações de pendências.
- Disponibilizar autenticação de produção independente do modo local.

---

Desenvolvido como projeto de portfólio para demonstrar modelagem relacional, Prisma ORM, integração com TiDB Cloud, APIs tipadas e dashboards administrativos.
