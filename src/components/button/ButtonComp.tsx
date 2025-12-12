import styles from "./style.module.css";

type ButtonProps = {
  text: string,
  onClick: () => void
}

export function ButtonComp({ text, onClick }: ButtonProps) {
  return (
    <button
      className={styles.button}
      onClick={onClick}
    >
      {text}
    </button>
  )
}