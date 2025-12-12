import styles from "./style.module.css";

type TextWithActionProps = {
  text: string,
  textClickable: string,
  onAction: () => void
}

export function TextWithActionComp({ text, textClickable, onAction }: TextWithActionProps) {
  return (

    <p className={styles.container}>
      {text}{" "}
      <a href="#" onClick={onAction}>
        {textClickable}
      </a>
    </p>
  )
}