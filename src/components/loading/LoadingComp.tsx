import styles from "./style.module.css";

export const LoadingComp = () => {
    return <div role="status" aria-label="Carregando" className={styles.spinner} />
}
