import styles from "./style.module.css";

export function FooterComp() {
  return (
    <footer className={styles.footer}>
      <img
        src="/logos_cps_governo_com_slogan_horizontal_cor.png"
        alt="Logos Governo"
        className={styles.logoBottom}
      />
    </footer>
  )
}