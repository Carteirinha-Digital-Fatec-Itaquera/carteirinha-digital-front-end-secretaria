import { useState } from "react";
import MenuLateral from "../menuLateral/MenuLateral";
import styles from "../../styles/layoutWithMenu.module.css";

export default function LayoutWithMenu({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.layoutContainer}>
      <div className={`${styles.menuWrapper} ${collapsed ? styles.menuWrapperCollapsed : ""}`}>
        <MenuLateral collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      <div className={styles.contentWrapper}>
        {children}
      </div>
    </div>
  );
}