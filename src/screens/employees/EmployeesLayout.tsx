import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import MenuLateral from "../../components/menuLateral/MenuLateral";
import layout from "../../styles/layoutWithMenu.module.css";
import styles from "./employees.module.css";
import listStyles from "../student/list/style.module.css";
import { TitleComp } from "../../components/title/TitleComp";

export default function EmployeesLayout({
  title,
  children,
  back,
  list = false,
}: {
  title: string;
  children: ReactNode;
  back?: boolean;
  list?: boolean;
}) {
  return (
    <div className={layout.layoutContainer}>
      <div className={layout.menuWrapper}>
        <MenuLateral />
      </div>
      <main className={layout.contentWrapper}>
        <div className={list ? listStyles.container : styles.page}>
          {back && <Link to="/funcionarios">Voltar para Funcionários</Link>}
          {list ? <TitleComp text={title} /> : <h1>{title}</h1>}
          {children}
        </div>
      </main>
    </div>
  );
}
