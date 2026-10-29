export const pdfLabels: Record<string, string> = {
  PENDING_RENDER: "PDF na fila",
  RENDERING: "Gerando PDF",
  READY: "PDF disponível",
  RENDER_FAILED: "Falha ao gerar PDF",
};
export const deliveryLabels: Record<string, string> = {
  PENDING: "E-mail na fila",
  DISPATCHING: "E-mail em envio",
  SENT: "E-mail aceito pelo provedor",
  FAILED: "Falha no envio",
  AMBIGUOUS: "Resultado incerto; conferir no painel de participantes",
  EXPIRED: "Prazo de envio encerrado",
  NONE: "Envio não programado",
};
