import { useEffect, useRef, useState } from "react";
import {
  management,
  uploadAsset,
  type Template,
  type Signer,
} from "../../../api/event/publicEventService";
import styles from "./styleCertificateCatalog.module.css";
type Editor =
  | { kind: "templates"; item: Template }
  | { kind: "signers"; item: Signer };
export type CatalogAction = Editor & { action: "edit" | "delete" };
export function CertificateItemDialog({
  target,
  onSaved,
  onClose,
}: {
  target: CatalogAction;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const editor = target.action === "edit" ? target : null;
  const deleting = target.action === "delete" ? target : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const uploaded = useRef<{ file: File; id: string } | null>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const file = data.get("file");
      let assetId =
        editor.kind === "signers"
          ? editor.item?.assetId
          : editor.item?.config.backgroundAssetId;
      if (file instanceof File && file.size) {
        if (
          file.size > 2 * 1024 * 1024 ||
          !["image/png", "image/jpeg"].includes(file.type)
        )
          throw new Error("Envie PNG ou JPEG de até 2 MB.");
        if (uploaded.current?.file === file) assetId = uploaded.current.id;
        else {
          const asset = await uploadAsset(
            file,
            editor.kind === "signers" ? "SIGNATURE" : "BACKGROUND",
          );
          uploaded.current = { file, id: asset.id };
          assetId = asset.id;
        }
      }
      const name = String(data.get("name") || "").trim();
      let body: Record<string, unknown>;
      if (editor.kind === "signers") {
        if (!assetId) throw new Error("Selecione a imagem da assinatura.");
        body = {
          name,
          title: String(data.get("title") || "").trim(),
          course: String(data.get("course") || "").trim(),
          assetId,
          authorized: data.get("authorized") === "on",
        };
      } else {
        body = {
          ...editor.item?.config,
          textColor: String(data.get("textColor") || "#FFFFFF"),
          wordingVersion: String(data.get("wordingVersion") || "LEGACY"),
          name,
          role: editor.item?.role || data.get("role"),
          heading: String(data.get("heading") || "").trim(),
          edition: String(data.get("edition") || "").trim(),
          backgroundAssetId: assetId,
          design: editor.item?.config.design || "TECHNOLOGY_BLUE_2026_DARK",
          autoPublish: true,
        };
      }
      if (editor.item) body.expectedVersion = editor.item.version ?? 1;
      await management(
        `${editor.kind}${editor.item ? `/${editor.item.id}` : ""}`,
        body,
        editor.item ? "PATCH" : "POST",
      );
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting?.item || busy) return;
    setBusy(true);
    setError("");
    try {
      await management(
        `${deleting.kind}/${deleting.item.id}`,
        { expectedVersion: deleting.item.version ?? 1 },
        "DELETE",
      );
      await onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setBusy(false);
    }
  }
  const signer = editor?.kind === "signers" ? editor.item : undefined;
  const template = editor?.kind === "templates" ? editor.item : undefined;
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      role={target.action === "delete" ? "alertdialog" : "dialog"}
      aria-label={
        target.action === "edit"
          ? `Editar ${target.item.name}`
          : `Excluir ${target.item.name}`
      }
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      {error && <p role="alert">{error}</p>}
      {editor && (
        <form
          key={`${editor.kind}-${editor.item?.id || "new"}`}
          onSubmit={(event) => {
            void save(event);
          }}
          className={styles.editor}
        >
          <fieldset disabled={busy}>
            <h3>
              Editar{" "}
              {editor.kind === "templates"
                ? "modelo de certificado"
                : "assinatura"}
            </h3>
            <label>
              Nome
              <input
                autoFocus
                name="name"
                required
                minLength={3}
                maxLength={editor.kind === "signers" ? 160 : 120}
                defaultValue={editor.item?.name}
              />
            </label>
            {editor.kind === "templates" ? (
              <>
                <label>
                  Papel
                  <select
                    name="role"
                    defaultValue={template?.role || "ATTENDEE"}
                    disabled={!!template}
                  >
                    <option value="ATTENDEE">Participante</option>
                    <option value="SPEAKER">Palestrante</option>
                  </select>
                </label>
                <label>
                  Redação
                  <select
                    name="wordingVersion"
                    defaultValue={
                      template?.config.wordingVersion ||
                      (template?.config.design === "TECHNOLOGY_BLUE_2026_DARK"
                        ? "LECTURE_LISTENER_2026"
                        : "LEGACY")
                    }
                  >
                    <option value="LECTURE_LISTENER_2026">
                      Palestra: ouvinte e palestrante
                    </option>
                    <option value="LEGACY">Atividade: redação anterior</option>
                  </select>
                </label>
                <label>
                  Cor do texto do certificado
                  <input
                    name="textColor"
                    type="color"
                    defaultValue={template?.config.textColor || "#FFFFFF"}
                  />
                </label>
                <label>
                  Título do certificado
                  <input
                    name="heading"
                    required
                    minLength={3}
                    maxLength={160}
                    defaultValue={template?.config.heading || "CERTIFICADO"}
                  />
                </label>
                <label>
                  Edição ou identificação do evento
                  <input
                    name="edition"
                    required
                    minLength={3}
                    maxLength={200}
                    defaultValue={
                      template?.config.edition ||
                      "XIII Semana de Tecnologia da Fatec Itaquera"
                    }
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Cargo
                  <input
                    name="title"
                    required
                    minLength={3}
                    maxLength={160}
                    defaultValue={signer?.title}
                  />
                </label>
                <label>
                  Curso (opcional)
                  <input
                    name="course"
                    maxLength={120}
                    defaultValue={signer?.course}
                  />
                </label>
                <label>
                  <input type="checkbox" name="authorized" required /> Confirmo
                  a autorização de uso desta assinatura
                </label>
              </>
            )}
            <label>
              {editor.kind === "signers"
                ? "Imagem da assinatura"
                : "Arte de fundo (opcional)"}
              <input
                type="file"
                name="file"
                accept="image/png,image/jpeg"
                required={editor.kind === "signers" && !signer?.assetId}
              />
            </label>
            <p>
              PNG ou JPEG até 2 MB. Ao editar, deixe vazio para manter a imagem
              atual. Para assinatura, prefira PNG transparente.
            </p>
            <div className={styles.actions}>
              <button disabled={busy} type="submit">
                {busy ? "Salvando..." : "Salvar cadastro"}
              </button>
              <button disabled={busy} type="button" onClick={onClose}>
                Cancelar edição
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {deleting && (
        <div aria-labelledby="catalog-delete-title" className={styles.editor}>
          <h3 id="catalog-delete-title">Excluir {deleting.item?.name}?</h3>
          <p>
            O item deixa de aparecer nas novas seleções. Vínculos históricos e
            certificados emitidos serão mantidos.
          </p>
          <div className={styles.actions}>
            <button autoFocus disabled={busy} type="button" onClick={onClose}>
              Cancelar exclusão
            </button>
            <button
              disabled={busy}
              type="button"
              onClick={() => {
                void remove();
              }}
            >
              Confirmar exclusão
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
