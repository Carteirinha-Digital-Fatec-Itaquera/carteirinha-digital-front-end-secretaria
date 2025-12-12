import type { ReactNode } from "react";

import styles from "./style.module.css";

type InputProps = {
  label: string,
  type?: string,
  placeholder: string,
  icon?: ReactNode,
  value: string,
  onChangeText: (value: string) => void,
}

export function InputComp({
  label,
  type = "text",
  placeholder,
  icon = null,
  value,
  onChangeText
}: InputProps) {
  return (
    <>
      <label className={styles.label}>{label}</label>
      <div className={styles.inputArea}>
        {(icon != null) &&
          <span className={styles.icon}>
            {icon}
          </span>
        }
        <input
          type={type}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
        />
      </div>
    </>
  )
}