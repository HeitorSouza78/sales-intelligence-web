# Sales Intelligence Web — Dashboard de Inteligência de Reuniões

Interface web da plataforma SaaS de inteligência comercial para upload de gravações de reuniões, visualização de vídeos privados via Presigned URLs e acompanhamento em tempo real da análise gerada por IA (Amazon Bedrock).

- **Aplicação em Produção:** [sales-intelligence-web-delta.vercel.app](https://sales-intelligence-web-delta.vercel.app/)
- **Repositório Back-end:** [sales-intelligence-api](https://github.com/HeitorSouza78/sales-intelligence-api)

---

## Funcionalidades

- **Acesso Protegido (`AccessCodeGate`):** Solicita o código de acesso para obter o token JWT (`sessionStorage`) e liberar o painel.
- **Listagem de Reuniões (`/`):** Exibe as reuniões ordenadas da mais recente para a mais antiga com status em tempo real (`PENDING`, `COMPLETED`, etc.).
- **Upload Direto para S3:** Modal de envio de arquivos `.mp4` que solicita uma Presigned URL autenticada ao back-end NestJS e realiza o upload `PUT` diretamente no Amazon S3.
- **Detalhes da Reunião (`/meetings/:id`):**
  - Player de vídeo `<video>` consumindo Presigned URL temporária de leitura (expira em 1h) sem expor o bucket S3.
  - Painel de **Compliance Score** (0–100) e categoria identificada (`DEMO`, `NEGOTIATION`, `FOLLOW_UP`, `CLOSING`).
  - Card de **Resumo Executivo & Palavras-chave**.
  - Lista de **Itens de Ação, Orçamentos e Prazos**.
  - **Atualização em Tempo Real (WebSockets):** Hook `useMeetingSocket` conectado via `socket.io-client` escutando o evento `meeting.analyzed` para atualizar a interface instantaneamente sem recarregar a página.

---

## Stack Tecnológica

- **Framework:** React + TypeScript + Vite
- **Estilização:** Tailwind CSS v4 + Lucide React
- **Roteamento:** React Router DOM
- **Tempo Real:** Socket.IO Client

---

## Variáveis de Ambiente (`.env`)

```env
VITE_API_URL="http://localhost:3000"
```

---

## Como Executar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em desenvolvimento
npm run dev

# 3. Gerar build de produção
npm run build
```
