import { MdErrorOutline } from "react-icons/md";

import styles from "./style.module.css";

type ErrorModalProps = {
  visible: boolean;
  error: string;
  fields?: string[];
  onClose: () => void;
};

export const ErrorModalComp = ({
  visible,
  error,
  fields = [],
  onClose,
}: ErrorModalProps) => {
  if (!visible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContent}>
        <MdErrorOutline size={30} color="#B00020" />

        <p className={styles.errorText}>{error}</p>

        {fields.map((field) => (
          <p key={field} className={styles.fieldText}>• {field}</p>
        ))}

        <button className={styles.closeButton} onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
};
