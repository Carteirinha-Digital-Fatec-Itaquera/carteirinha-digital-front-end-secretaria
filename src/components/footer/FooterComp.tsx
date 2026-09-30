import styles from "./style.module.css";

export function FooterComp() {
  return (
    <footer className={styles.footer}>
      <img
        src="/cps_logo_cor.png"
        alt="Centro Paula Souza"
        className={styles.logoBottom}
      />
    </footer>
  )
}