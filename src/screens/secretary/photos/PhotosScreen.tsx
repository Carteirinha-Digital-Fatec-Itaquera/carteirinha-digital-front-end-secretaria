import { useEffect, useState } from "react";
import { TitleComp } from "../../../components/title/TitleComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";
import { ButtonComp } from "../../../components/button/ButtonComp";
import LayoutWithMenu from "../../../components/layoutWithMenu/LayoutWithMenu";
import { getPendingPhotos } from "../../../api/student/getPendingPhotos";
import { approvePhoto } from "../../../api/student/approvePhoto";
import { toast } from "react-toastify";
import styles from "./style.module.css";

type PendingPhoto = {
  ra: string;
  name: string;
  email: string;
  photo: string;
};

export default function PhotosScreen() {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadPhotos = async () => {
    setLoading(true);
    const data = await getPendingPhotos();
    setPhotos(data);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const toggleSelect = (ra: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(ra) ? next.delete(ra) : next.add(ra);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(photos.map((p) => p.ra)));

  const deselectAll = () => setSelected(new Set());

  const handleApprove = async (ra: string) => {
    const result = await approvePhoto(ra, true);

    if ("ok" in result) {
      toast.success("Foto aprovada!");
      loadPhotos();
    } else {
      toast.error(result.message);
    }
  };

  const handleReject = async (ra: string) => {
    const reason = rejectionReason[ra] ?? "";
    const result = await approvePhoto(ra, false, reason);

    if ("ok" in result) {
      toast.success("Foto reprovada!");
      loadPhotos();
    } else {
      toast.error(result.message);
    }
  };

  const handleApproveSelected = async () => {
    await Promise.all([...selected].map((ra) => approvePhoto(ra, true)));

    toast.success(`${selected.size} foto(s) aprovada(s)!`);
    loadPhotos();
  };

  const handleRejectSelected = async () => {
    await Promise.all(
      [...selected].map((ra) =>
        approvePhoto(ra, false, rejectionReason[ra] ?? "")
      )
    );

    toast.success(`${selected.size} foto(s) reprovada(s)!`);
    loadPhotos();
  };

  return (
    <LayoutWithMenu>
      <div className={styles.container}>
        <TitleComp text="Solicitações de foto" />

        {loading ? (
          <LoadingComp />
        ) : photos.length === 0 ? (
          <p className={styles.empty}>Nenhuma solicitação pendente.</p>
        ) : (
          <>
            <div className={styles.bulkActions}>
              <div className={styles.bulkActionsLeft}>
                <ButtonComp
                  text="Selecionar todos"
                  onClick={selectAll}
                />

                <ButtonComp
                  text="Desselecionar todos"
                  onClick={deselectAll}
                />
              </div>

              <div className={styles.bulkActionsRight}>
                <ButtonComp
                  text={`Aprovar selecionados (${selected.size})`}
                  onClick={handleApproveSelected}
                  color="#2a9d8f"
                />

                <ButtonComp
                  text={`Reprovar selecionados (${selected.size})`}
                  onClick={handleRejectSelected}
                  color="#bd0909"
                />
              </div>
            </div>

            <div className={styles.grid}>
              {photos.map((p) => (
                <div
                  key={p.ra}
                  className={`${styles.card} ${
                    selected.has(p.ra)
                      ? styles.cardSelected
                      : ""
                  }`}
                  onClick={() => toggleSelect(p.ra)}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.ra)}
                    onChange={() => toggleSelect(p.ra)}
                    onClick={(e) => e.stopPropagation()}
                    className={styles.checkbox}
                  />

                  <img
                    src={p.photo}
                    alt={p.name}
                    className={styles.photo}
                  />

                  <div className={styles.info}>
                    <p>
                      <strong>Nome:</strong> {p.name}
                    </p>

                    <p>
                      <strong>RA:</strong> {p.ra}
                    </p>

                    <p>
                      <strong>E-mail:</strong>
                    </p>

                    <p>{p.email}</p>
                  </div>

                  <input
                    className={styles.reasonInput}
                    placeholder="Motivo da reprovação (opcional)"
                    value={rejectionReason[p.ra] ?? ""}
                    onChange={(e) => {
                      e.stopPropagation();

                      setRejectionReason((prev) => ({
                        ...prev,
                        [p.ra]: e.target.value,
                      }));
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div
                    className={styles.actions}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ButtonComp
                      text="Aprovar"
                      onClick={() => handleApprove(p.ra)}
                    />

                    <ButtonComp
                      text="Reprovar"
                      onClick={() => handleReject(p.ra)}
                      color="#bd0909"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </LayoutWithMenu>
  );
}