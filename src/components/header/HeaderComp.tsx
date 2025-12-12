import styles from "./style.module.css";

export function HeaderComp() {
  return (
    <header className={styles.header}>
      <img
        src="/fatec_ra_metropolitana_sp_capital_itaquera_br.png"
        alt="Logo Fatec"
        className={styles.logoTop}
      />
    </header>
  )
}