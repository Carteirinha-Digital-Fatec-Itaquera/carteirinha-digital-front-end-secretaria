import { useState } from "react";

import styles from "./style.module.css";

import { FaEye, FaEyeSlash, FaLock } from "react-icons/fa";

type InputPasswordProps = {
  label: string,
  value: string,
  onChangeText: (value: string) => void,
}

export function InputPasswordComp({ label, value, onChangeText }: InputPasswordProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <label className={styles.label}>{label}</label>
      <div className={styles.inputArea}>
        <span className={styles.icon}>
          <FaLock />
        </span>

        <input
          type={showPassword ? "text" : "password"}
          className={styles.input}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
        />

        <span
          className={styles.toggle}
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <FaEye /> : <FaEyeSlash />}
        </span>
      </div>
    </>
  )
}