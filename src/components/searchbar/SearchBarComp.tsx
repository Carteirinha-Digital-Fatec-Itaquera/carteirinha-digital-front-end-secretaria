import { FiSearch } from "react-icons/fi";

import styles from "./style.module.css";

type SearchBarProps = {
  label: string,
  placeholder: string,
  searchTerm: string,
  setSearchTerm: (value: string) => void,
}

export function SearchBarComp({ label, placeholder, searchTerm, setSearchTerm }: SearchBarProps) {

  return (
    <div className={styles.searchArea} >
      <label className={styles.searchLabel}>{label}</label>

      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder={placeholder}
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className={styles.searchIcon}>
          <FiSearch/>
        </span>
      </div>
    </div >
  )
}