# Guia de Integração de Eventos e Handoff (#5 / #6)

Este documento descreve as assinaturas canônicas da API V1 de Eventos, tipos portáveis e serviços prontos para integração com as telas desenvolvidas por Gabryel (#5 Cadastro/Listagem de Eventos e #6 Gestão de Checkpoints/QR).

## 1. Origem e Conformidade Contratual

- **Contrato canônico**: `carteirinha-digital-backend/src/contracts/v1-events.types.ts`
- **Revisão base backend**: `cd9cbb3`
- **Sessão da Secretaria**: Token armazenado em `sessionStorage.getItem('token')`. Não usar `localStorage` nem o formato do app do Aluno.
- **Autenticação automática**: `apiRequest.ts` anexa o header `Authorization: Bearer <token>` automaticamente nas rotas administrativas. Se não houver token, lança `ApiRequestError` com status `401`.

## 2. Tipos Canônicos Importáveis

Importar diretamente de `@domains` ou `../../domains`:

```ts
import type {
  EventView,
  EventStatus,
  CreateEventRequest,
  UpdateEventRequest,
  CheckpointView,
  CheckpointType,
  CheckpointMutationResponse,
  AttendanceQrResponse,
  AttendanceView,
  AttendanceSummary,
  CertificateSnapshot,
  CertificateView,
} from '../../domains';
```

### Pontos de Atenção Críticos:
1. `certificateEnabled` é no singular (não usar `certificatesEnabled`).
2. `workloadMinutes` é um número inteiro em minutos no payload HTTP (não enviar string formatada).
3. Checkpoint types no transporte: `'CHECK_IN'` e `'CHECK_OUT'`. Na URL são convertidos automaticamente para `'check-in'` e `'check-out'` pelos serviços.
4. QR Token: resposta canônica retorna `{ qrToken, expiresInSeconds: 20, expiresAt, checkpointVersion }`. Não usar campo `token` genérico nem fabricar contadores locais diferentes do payload.

## 3. Serviços Disponíveis

### `src/api/event/eventService.ts`
- `getEvents(options?: RequestOptions): Promise<EventView[]>`
- `getEvent(id: string, options?: RequestOptions): Promise<EventView>`
- `createEvent(body: CreateEventRequest, options?: RequestOptions): Promise<EventView>`
- `updateEvent(id: string, body: UpdateEventRequest, options?: RequestOptions): Promise<EventView>`

### `src/api/event/checkpointService.ts`
- `openCheckpoint(id: string, type: CheckpointType, options?: RequestOptions): Promise<CheckpointMutationResponse>`
- `closeCheckpoint(id: string, type: CheckpointType, options?: RequestOptions): Promise<CheckpointMutationResponse>`
- `getCheckpointQr(id: string, type: CheckpointType, options?: RequestOptions): Promise<AttendanceQrResponse>`
- Reexporta `getEvent(id, options)` para conveniência das telas de gerenciamento.

### `src/api/attendance/attendanceService.ts`
- `getEventAttendances(id: string, options?: RequestOptions): Promise<AttendanceView[]>`
- `getAttendanceSummary(id: string, options?: RequestOptions): Promise<AttendanceSummary>`

## 4. Utilitários de Apresentação

Importar de `src/utils/eventPresentation.ts`:
- `formatEventDate(isoDateTime: string): string` (fuso `America/Sao_Paulo`, formato `DD/MM/YYYY`)
- `formatEventTime(isoDateTime: string): string` (formato `HH:mm`)
- `formatWorkload(minutes: number): string` (ex: `1 hora e 30 minutos`)
- `getCheckpointLabel(checkpoint: CheckpointView): 'Aberto' | 'Fechado' | 'Encerrado'`
- `getCheckpointTypeLabel(type: CheckpointType): string`

## 5. Rotas Configuradas

- `/eventos`: Listagem de eventos
- `/eventos/novo`: Criação de novo evento
- `/criar-evento`: Redireciona para `/eventos/novo`
- `/eventos/:id/gerenciar`: Gerenciamento do evento, checkpoints e exibição de QR
- `/certificado/verificar/:codigo`: Rota pública de verificação
