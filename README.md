# Carteirinha Digital - Frontend Secretaria

Interface web desenvolvida com React e TypeScript para o sistema de Carteirinha Digital da Fatec Itaquera, voltada para uso das secretárias.

## 🚀 Tecnologias

- React 19
- TypeScript 5
- Vite 7
- React Router DOM 7
- React Toastify
- Bootstrap 5

## 📋 Pré-requisitos

- Node.js 22 ou superior
- npm
- Backend da Carteirinha Digital rodando

## ⚙️ Instalação

1. Clone o repositório:
```bash
git clone https://github.com/Carteirinha-Digital-Fatec-Itaquera/carteirinha-digital-front-end-secretaria.git
cd carteirinha-digital-front-end-secretaria
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente — crie um arquivo `.env` na raiz:
```dotenv
VITE_BASE_URL=http://localhost:3000
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O sistema estará disponível em `http://localhost:5173`.

## 📦 Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia em modo desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run preview` | Visualiza o build de produção localmente |
| `npm run lint` | Verifica erros de lint |

## 🌐 Deploy

O frontend está hospedado na [Vercel](https://vercel.com).

- **Branch de produção:** `main`
- **URL:** https://carteirinha-digital-front-end-secre-azure.vercel.app
- **Variável de ambiente na Vercel:** `VITE_BASE_URL` = URL do backend no Render

## 🔗 Repositórios relacionados

- [Backend](https://github.com/Carteirinha-Digital-Fatec-Itaquera/carteirinha-digital-backend)