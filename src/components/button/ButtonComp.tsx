import styles from "./style.module.css";

type ButtonProps = {
  text: string,
  onClick: () => void
  color?: string
}

export function ButtonComp({ text, color = '#005C6D', onClick }: ButtonProps) {
  return (
    <button
      className={styles.button}
      style={{ backgroundColor: color}}
      onClick={onClick}
    >
      {text}
    </button>
  )
}