import { useId } from 'react';
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

export function InputLogin({
  label,
  type = "text",
  placeholder,
  icon = null,
  value,
  onChangeText,

}: InputProps) {
  const id = useId();
  return (
    <>
    <div className={styles.containerInput}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.inputArea}>
        {(icon != null) &&
          <span className={styles.icon}>
            {icon}
          </span>
        }
        <input id={id}
          type={type}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
      
        />
      </div>
      </div>
    </>
  )
}