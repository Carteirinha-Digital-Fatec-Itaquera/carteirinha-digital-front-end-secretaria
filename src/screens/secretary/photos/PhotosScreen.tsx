import { useCallback, useEffect, useRef, useState } from "react";
import { TitleComp } from "../../../components/title/TitleComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";
import { ButtonComp } from "../../../components/button/ButtonComp";
import MenuLateral from "../../../components/menuLateral/MenuLateral";
import { getPendingPhotos } from "../../../api/student/getPendingPhotos";
import { approvePhoto } from "../../../api/student/approvePhoto";
import { toast } from "react-toastify";
import { getEmployeePhotoSummary } from "../../../api/employee/employeePhotos";
import EmployeePhotoQueue from "./EmployeePhotoQueue";
import employeeStyles from "./employeePhotos.module.css";
import PendingPhotoPreview from "./PendingPhotoPreview";
import styles from "./style.module.css";
import layoutStyles from "../../../styles/layoutWithMenu.module.css";

type PendingPhoto = {
  ra: string;
  name: string;
  email: string;
  photo: string;
};

export default function PhotosScreen() {
  const [category, setCategory] = useState<"student" | "employee">("student");
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const summaryEpoch = useRef(0);
  const updateEmployeeCount = useCallback((count: number | null) => {
    summaryEpoch.current++;
    setEmployeeCount(count);
  }, []);
  const [employeeBusy, setEmployeeBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      const epoch = ++summaryEpoch.current;
      void getEmployeePhotoSummary(controller.signal)
        .then((value) => {
          if (!controller.signal.aborted && epoch === summaryEpoch.current)
            setEmployeeCount(value.pendingCount);
        })
        .catch(() => {
          if (!controller.signal.aborted && epoch === summaryEpoch.current)
            setEmployeeCount(null);
        });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<
    Record<string, string>
  >({});
  const [selected, setSelected] = useState<Set<string>>(new Set()); // ✅ novo

  const loadPhotos = async () => {
    setLoading(true);
    const data = await getPendingPhotos();
    setPhotos(data);
    setSelected(new Set()); // limpa seleção ao recarregar
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
    } else toast.error(result.message);
  };

  const handleReject = async (ra: string) => {
    const reason = rejectionReason[ra] ?? "";
    const result = await approvePhoto(ra, false, reason);
    if ("ok" in result) {
      toast.success("Foto reprovada!");
      loadPhotos();
    } else toast.error(result.message);
  };

  const handleApproveSelected = async () => {
    await Promise.all([...selected].map((ra) => approvePhoto(ra, true)));
    toast.success(`${selected.size} foto(s) aprovada(s)!`);
    loadPhotos();
  };

  const handleRejectSelected = async () => {
    await Promise.all(
      [...selected].map((ra) =>
        approvePhoto(ra, false, rejectionReason[ra] ?? ""),
      ),
    );
    toast.success(`${selected.size} foto(s) reprovada(s)!`);
    loadPhotos();
  };

  return (
    <div className={layoutStyles.layoutContainer}>
      <div className={layoutStyles.menuWrapper}>
        <MenuLateral
          pendingPhotoCount={
            loading || employeeCount === null
              ? null
              : photos.length + employeeCount
          }
        />
      </div>
      <div className={layoutStyles.contentWrapper}>
        <div className={styles.container}>
          <TitleComp text="Solicitações de foto" />

          <div
            className={employeeStyles.categories}
            role="group"
            aria-label="Tipo de solicitante"
          >
            <button
              aria-pressed={category === "student"}
              disabled={employeeBusy}
              onClick={() => setCategory("student")}
            >
              Alunos ({loading ? "…" : photos.length})
            </button>
            <button
              aria-pressed={category === "employee"}
              disabled={employeeBusy}
              onClick={() => setCategory("employee")}
            >
              Funcionários ({employeeCount ?? "…"})
            </button>
          </div>
          {category === "employee" ? (
            <EmployeePhotoQueue
              onCount={updateEmployeeCount}
              onBusy={setEmployeeBusy}
            />
          ) : loading ? (
            <LoadingComp />
          ) : photos.length === 0 ? (
            <p className={styles.empty}>Nenhuma solicitação pendente.</p>
          ) : (
            <>
              <div className={styles.bulkActions}>
                <div className={styles.bulkActionsLeft}>
                  <ButtonComp text="Selecionar todos" onClick={selectAll} />
                  <ButtonComp
                    text="Desselecionar todos"
                    onClick={deselectAll}
                  />
                </div>
                <div className={styles.bulkActionsRight}>
                  <ButtonComp
                    text={`Aprovar selecionados (${selected.size})`}
                    onClick={handleApproveSelected}
                    color="#0f5561"
                  />
                  <ButtonComp
                    text={`Reprovar selecionados (${selected.size})`}
                    onClick={handleRejectSelected}
                    color="#640a0a"
                  />
                </div>
              </div>

              <div className={styles.grid}>
                {photos.map((p) => (
                  <div
                    key={p.ra}
                    className={`${styles.card} ${selected.has(p.ra) ? styles.cardSelected : ""}`}
                    onClick={() => toggleSelect(p.ra)}
                  >
                    <PendingPhotoPreview
                      key={p.photo}
                      src={p.photo}
                      name={p.name}
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
                      type="checkbox"
                      checked={selected.has(p.ra)}
                      onChange={() => toggleSelect(p.ra)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Selecionar foto de ${p.name}`}
                      className={styles.checkbox}
                    />
                    <input
                      aria-label={`Motivo da reprovação de ${p.name}`}
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
                      <button
                        style={{ backgroundColor: "#0b5b74" }}
                        onClick={() => handleApprove(p.ra)}
                      >
                        Aprovar
                      </button>
                      <button
                        style={{ backgroundColor: "#770d0d" }}
                        onClick={() => handleReject(p.ra)}
                      >
                        Reprovar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
