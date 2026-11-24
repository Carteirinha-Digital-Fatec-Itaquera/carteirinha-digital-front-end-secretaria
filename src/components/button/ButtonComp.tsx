import styles from "./style.module.css";

type ButtonProps = {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
};

export function ButtonComp({
  text,
  color = "#005C6D",
  onClick,
  disabled = false,
}: ButtonProps) {
  return (
    <button
      className={styles.button}
      style={{ backgroundColor: color }}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
}
