import { useEffect, useState } from "react";
import { TitleComp } from "../../../components/title/TitleComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";
import { ButtonComp } from "../../../components/button/ButtonComp";
import MenuLateral from "../../../components/menuLateral/MenuLateral";
import { getPendingPhotos } from "../../../api/student/getPendingPhotos";
import { approvePhoto } from "../../../api/student/approvePhoto";
import { toast } from "react-toastify";
import styles from "./style.module.css";
import layoutStyles from "../../../styles/layoutWithMenu.module.css";

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

  const loadPhotos = async () => {
    setLoading(true);
    const data = await getPendingPhotos();
    setPhotos(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleApprove = async (ra: string) => {
    const result = await approvePhoto(ra, true);
    if ('ok' in result) {
      toast.success('Foto aprovada!');
      loadPhotos();
    } else {
      toast.error(result.message);
    }
  };

  const handleReject = async (ra: string) => {
    const reason = rejectionReason[ra] ?? "";
    const result = await approvePhoto(ra, false, reason);
    if ('ok' in result) {
      toast.success('Foto reprovada!');
      loadPhotos();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className={layoutStyles.layoutContainer}>
      <div className={layoutStyles.menuWrapper}>
        <MenuLateral />
      </div>
      <div className={layoutStyles.contentWrapper}>
        <div className={styles.container}>
          <TitleComp text="Solicitações de foto" />

          {loading ? (
            <LoadingComp />
          ) : photos.length === 0 ? (
            <p className={styles.empty}>Nenhuma solicitação pendente.</p>
          ) : (
            <div className={styles.grid}>
              {photos.map((p) => (
                <div key={p.ra} className={styles.card}>
                  <img src={`http://localhost:3000${p.photo}`} alt={p.name} className={styles.photo} />
                  <div className={styles.info}>
                    <p><strong>Nome:</strong> {p.name}</p>
                    <p><strong>RA:</strong> {p.ra}</p>
                    <p><strong>E-mail:</strong> {p.email}</p>
                  </div>
                  <input
                    className={styles.reasonInput}
                    placeholder="Motivo da reprovação (opcional)"
                    value={rejectionReason[p.ra] ?? ""}
                    onChange={(e) => setRejectionReason(prev => ({ ...prev, [p.ra]: e.target.value }))}
                  />
                  <div className={styles.actions}>
                    <ButtonComp text="Aprovar" onClick={() => handleApprove(p.ra)} />
                    <ButtonComp text="Reprovar" onClick={() => handleReject(p.ra)} color="#bd0909" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}