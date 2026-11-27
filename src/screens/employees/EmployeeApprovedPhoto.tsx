import { useEffect, useState } from "react";
import { UserRound, Expand } from "lucide-react";
import { useSecretarySession } from "../../api/auth/useSecretarySession";
import { getEmployeePhotoBlob } from "../../api/employee/employeePhotos";
import Modal from "../../components/modal/Modal";
import styles from "./employeePhoto.module.css";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default function EmployeeApprovedPhoto({
  employeeId,
  approvedPhotoId,
  name,
  detail = false,
}: {
  employeeId: string;
  approvedPhotoId?: string | null;
  name: string;
  detail?: boolean;
}) {
  const { token } = useSecretarySession();
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{
    employeeId: string;
    photoId: string;
    token: string | null;
    url?: string;
    error?: boolean;
  }>();
  const photoId =
    approvedPhotoId && uuid.test(approvedPhotoId) && uuid.test(employeeId)
      ? approvedPhotoId
      : null;
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    if (photoId && token) {
      void getEmployeePhotoBlob({ employeeId, photoId }, controller.signal)
        .then((blob) => {
          if (controller.signal.aborted) return;
          url = URL.createObjectURL(blob);
          setResult({ employeeId, photoId, token, url });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResult({ employeeId, photoId, token, error: true });
        });
    }
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [employeeId, photoId, token, attempt]);
  const current =
    result?.employeeId === employeeId &&
    result.photoId === photoId &&
    result.token === token
      ? result
      : undefined;
  const image = current?.url;
  const size = detail ? styles.detail : styles.list;
  const placeholder = (
    <span
      className={styles.avatar + " " + styles.placeholder + " " + size}
      role="img"
      aria-label={
        (photoId ? "Foto indisponível de " : "Sem foto aprovada de ") + name
      }
    >
      <UserRound aria-hidden="true" />
    </span>
  );
  const picture = image ? (
    <img
      className={styles.avatar + " " + size}
      src={image}
      alt={"Foto aprovada de " + name}
      onError={() =>
        setResult({ employeeId, photoId: photoId!, token, error: true })
      }
    />
  ) : (
    placeholder
  );
  return (
    <div className={styles.photo}>
      {detail && image ? (
        <button
          type="button"
          className={styles.photoButton}
          aria-label={"Ampliar foto aprovada de " + name}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          {picture}
          <Expand className={styles.expand} size={16} aria-hidden="true" />
        </button>
      ) : (
        picture
      )}
      {detail && !photoId && (
        <p className={styles.caption}>Sem foto aprovada</p>
      )}
      {detail && photoId && !current && (
        <p role="status" className={styles.caption}>
          Carregando foto…
        </p>
      )}
      {detail && current?.error && (
        <div className={styles.caption} role="status">
          Foto indisponível.{" "}
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Tentar carregar foto
          </button>
        </div>
      )}
      {open && image && (
        <Modal
          label={"Foto aprovada de " + name}
          onDismiss={() => setOpen(false)}
        >
          <div className={styles.preview}>
            <h2>{name}</h2>
            <img src={image} alt={"Foto aprovada ampliada de " + name} />
            <button type="button" autoFocus onClick={() => setOpen(false)}>
              Fechar foto
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
