import { MdErrorOutline } from "react-icons/md";

import styles from "./style.module.css";

type AlertModalProps = {
  visible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const AlertModalComp = ({
  visible,
  message,
  onConfirm,
  onCancel
}: AlertModalProps) => {
  if (!visible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContent}>
        <MdErrorOutline size={30} color="#005C6D" />

        <p className={styles.messageText}>{message}</p>

        <button className={styles.closeButton} onClick={onCancel}>
          Cancelar
        </button>

        <button className={styles.confirmButton} onClick={onConfirm}>
          Confimar
        </button>
      </div>
    </div>
  );
};
