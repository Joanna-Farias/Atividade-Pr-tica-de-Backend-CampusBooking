# Registro de entrega da equipe

## Integrantes

- Nome completo: Iza Dantas Malafaia
- Nome completo: Joanna Luciana Maria dos Santos Farias

## Correções de modelagem

Foram identificados e corrigidos os seguintes problemas no `prisma/schema.prisma` inicial antes da geração da nova migration:

1. **Tipos incompatíveis de data/hora (`String` → `DateTime`) e ausência de `createdAt`:** Os campos `startAt` e `endAt` da tabela `Booking` estavam definidos como `String`, impossibilitando comparações temporais nativas e ordenação cronológica precisa; ambos foram alterados para `DateTime` (`@db.Timestamptz`) e foi adicionado o campo `createdAt DateTime @default(now())`.
2. **Restrições e índices ausentes:** Foi adicionada a restrição `@@unique([roomId, startAt])` para impedir duas reservas iniciando no mesmo instante na mesma sala, além de índices compostos (`@@index([roomId, startAt, endAt])` e `@@index([userId, startAt, endAt])`) para otimizar as consultas de sobreposição de horários.
3. **Integridade referencial e exclusão física:** Configuradas as chaves estrangeiras (`userId` e `roomId`) com `onDelete: Restrict`, garantindo que a exclusão de reservas seja física (sem *soft delete*) sem comprometer o histórico de usuários ou salas.

As alterações foram aplicadas ao banco via `npx prisma migrate dev` e validadas com `npm run db:seed`.

## Endpoints e evidências

Para cada endpoint, informe se está concluído, parcialmente concluído ou não implementado. Registre a requisição (método, URL, body quando aplicável), status e resposta de pelo menos um cenário de sucesso e um de erro para cada endpoint implementado.

| Endpoint | Situação | Evidência de sucesso | Evidência de erro |
| --- | --- | --- | --- |
| 1 (`GET /api/rooms`) | Concluído | `GET /api/rooms?buildingId=1&type=LAB&active=true` → `200 OK` (retorna array JSON com os laboratórios ativos do prédio 1 ordenados por `name` asc e `id` asc). | `GET /api/rooms?minCapacity=-5` → `400 Bad Request` (`{"error":"VALIDATION_ERROR","message":"Dados de entrada inválidos.",...}`). |
| 2 (`GET /api/buildings/:buildingId/usage`) | Concluído | `GET /api/buildings/1/usage?date=2026-11-27` → `200 OK` (retorna totais do prédio com base nos 840 min/dia e array `rooms` com `bookedMinutes`, `availableMinutes` e `usagePercentage` ordenado por ocupação desc). | `GET /api/buildings/999/usage?date=2026-11-27` → `404 Not Found` (`{"error":"NOT_FOUND","message":"Prédio não encontrado."}`). |
| 3 (`POST /api/bookings`) | Concluído | `POST /api/bookings` com `{"userId":1,"roomId":3,"startAt":"2026-11-27T11:00:00-03:00","endAt":"2026-11-27T12:00:00-03:00","purpose":"Projeto integrador"}` → `201 Created` (retorna o objeto da reserva criada com `id` e `createdAt`). | `POST /api/bookings` com `{"userId":15,"roomId":4,"startAt":"2026-11-27T11:00:00-03:00","endAt":"2026-11-27T12:00:00-03:00","purpose":"Estudo"}` → `409 Conflict` (`{"error":"ROOM_INACTIVE","message":"A sala selecionada está inativa."}`). |
| 4 (`PATCH /api/bookings/:id`) | Concluído | `PATCH /api/bookings/1` com `{"purpose":"Reunião revisada"}` → `200 OK` (retorna o registro da reserva `#1` atualizado com o novo propósito). | `PATCH /api/bookings/1` com `{}` → `400 Bad Request` (`{"error":"VALIDATION_ERROR","message":"Dados de entrada inválidos.",...}`). |
| 5 (`DELETE /api/bookings/:id`) | Concluído | `DELETE /api/bookings/1` → `204 No Content` (resposta sem corpo; reserva removida fisicamente do banco de dados). | `DELETE /api/bookings/999` → `404 Not Found` (`{"error":"NOT_FOUND","message":"Reserva não encontrada."}`). |

## Observações

- **Fuso horário e janela operacional:** Todas as validações de horário (08h00 às 22h00, duração máxima de 2 horas, proibição de travessia de dias e segundos/milissegundos zerados) foram implementadas considerando explicitamente o fuso horário local de Recife (`UTC-03`).
- **Infraestrutura e testes:** O banco PostgreSQL foi executado via Docker Compose (`localhost:5434`) e todos os cenários de borda (conflito de sala, conflito de usuário, intervalos adjacentes permitidos, rejeição de campos extras com `.strict()` no Zod e bloqueio de alteração/cancelamento de reservas já iniciadas) foram validados via REST Client.