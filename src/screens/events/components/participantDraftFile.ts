import type { EventView } from "../../../domains/Event";
type NamedRow = { rawName: string; review: boolean; sourceType?: string; sourceEventId?: string };
const nameValue = (data: unknown): NamedRow => {
  const row =
    typeof data === "string"
      ? { nome_transcrito: data }
      : (data as Record<string, unknown>);
  if (!row || typeof row !== "object")
    throw new Error("Linha sem nome válido.");
  const values = [row.nome_transcrito, row.nome, row.name].filter(
    (v) => v !== undefined,
  );
  if (new Set(values).size > 1)
    throw new Error("Campos de nome conflitantes. Use nome_transcrito.");
  const name = values[0];
  if (
    typeof name !== "string" ||
    name.trim().length < 3 ||
    name.length > 160 ||
    Array.from(name).some((c) => c.charCodeAt(0) < 32)
  )
    throw new Error(
      "Cada nome deve ter de 3 a 160 caracteres, sem quebras internas.",
    );
  if (row.tipo_participante !== undefined && !['aluno', 'visitante'].includes(String(row.tipo_participante))) throw new Error('Tipo de participante inválido.');
  if (row.origem_evento_id !== undefined && row.origem_evento_id !== '' && (typeof row.origem_evento_id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(row.origem_evento_id))) throw new Error('Origem da lista inválida.');
  return {
    ...(row.origem_evento_id ? { sourceEventId: String(row.origem_evento_id) } : {}),
    ...(row.tipo_participante ? { sourceType: String(row.tipo_participante) } : {}),
    rawName: name.trim(),
    review:
      row.tipo_participante === "visitante" ||
      ["professor", "rasurado", "revisar"].includes(String(row.status)) ||
      row.confianca === "baixa" ||
      row.confianca_leitura === "baixa" ||
      row.revisao_identidade_pendente === "SIM" ||
      row.precisa_revisao_grafia === "SIM",
  };
};
function csvRecords(text: string): string[][] {
  const delimiter = text.split(/\r?\n/)[0].includes(";") ? ";" : ",";
  const records: string[][] = [];
  let record: string[] = [],
    field = "",
    quoted = false,
    endedQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          endedQuote = true;
        }
      } else field += c;
    } else if (c === '"' && !field && !endedQuote) quoted = true;
    else if (c === delimiter) {
      record.push(field);
      field = "";
      endedQuote = false;
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      if (record.some((v) => v.trim())) records.push(record);
      record = [];
      field = "";
      endedQuote = false;
    } else {
      if (endedQuote || c === '"')
        throw new Error("CSV com aspas inválidas. Baixe o modelo.");
      field += c;
    }
  }
  if (quoted) throw new Error("CSV com aspas não encerradas.");
  record.push(field);
  if (record.some((v) => v.trim())) records.push(record);
  return records;
}
export async function readParticipantDraftFile(
  file: File,
  event: EventView,
): Promise<NamedRow[]> {
  if (file.size > 2 * 1024 * 1024) throw new Error("Arquivo maior que 2 MB.");
  const text = new TextDecoder("utf-8", { fatal: true })
    .decode(await file.arrayBuffer())
    .replace(/^\uFEFF/, "");
  let rows: unknown;
  if (file.name.toLowerCase().endsWith(".json")) {
    const data = JSON.parse(text) as Record<string, unknown>;
    if (!data || typeof data !== "object") throw new Error("JSON inválido.");
    if (!Array.isArray(data)) {
      const reusable = data.versao_formato === "2.0" && data.tipo_lista === "nomes_reutilizaveis";
      if (data.versao_formato !== undefined && data.versao_formato !== "1.0" && !reusable)
        throw new Error("Versão de arquivo desconhecida.");
      if (reusable && data.evento !== undefined) throw new Error("Lista reutilizável não deve definir evento de destino.");
      const meta = data.evento as Record<string, string> | undefined;
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date(event.startsAt));
      const time = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(event.startsAt));
      const normalize = (v: string) =>
        v
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
          .trim()
          .replace(/\s+/g, " ");
      if (
        meta &&
        (typeof meta !== "object" ||
          Array.isArray(meta) ||
          (meta.id_evento_banco && meta.id_evento_banco !== event.id) ||
          (meta.titulo && normalize(meta.titulo) !== normalize(event.title)) ||
          (meta.data && meta.data !== day) ||
          (meta.horario_inicio && meta.horario_inicio !== time))
      )
        throw new Error("O arquivo pertence a outro evento, data ou horário.");
      const origin = reusable ? (data.origem as { id_evento_banco?: unknown } | undefined)?.id_evento_banco : undefined;
      rows = reusable && Array.isArray(data.participantes) ? data.participantes.map(row => ({ ...(typeof row === 'string' ? { nome_transcrito: row } : row), ...(origin !== undefined ? { origem_evento_id: origin } : {}) })) : data.participantes;
    } else rows = data;
  } else if (file.name.toLowerCase().endsWith(".csv")) {
    const [headers, ...records] = csvRecords(text);
    if (!headers || new Set(headers).size !== headers.length)
      throw new Error("Cabeçalho CSV inválido ou repetido.");
    rows = records.map((record) => {
      if (record.length !== headers.length)
        throw new Error("Quantidade de colunas CSV inválida.");
      return Object.fromEntries(headers.map((h, i) => [h, record[i]]));
    });
  } else throw new Error("Selecione JSON ou CSV.");
  if (!Array.isArray(rows) || !rows.length || rows.length > 1000)
    throw new Error("A lista deve conter de 1 a 1.000 nomes.");
  const unique = new Map<string, NamedRow>();
  for (const value of rows.map(nameValue)) {
    const key = value.rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim().replace(/\s+/g, ' ');
    const previous = unique.get(key);
    unique.set(key, { ...value, review: value.review || !!previous?.review || (!!previous && previous.sourceType !== value.sourceType) });
  }
  return [...unique.values()];
}
