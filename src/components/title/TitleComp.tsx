import styles from "./style.module.css";

type TitleProps = {
  text: string,
}

export function TitleComp({ text }: TitleProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{text}</h1>
      <div className={styles.line}></div>
    </div>
  )
}