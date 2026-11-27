import { Link } from "react-router-dom";
import { CloudArrowUpIcon } from "@phosphor-icons/react";
import EmployeesLayout from "./EmployeesLayout";
import upload from "../student/upload/style.module.css";
import styles from "./employeeImport.module.css";

export default function EmployeeImport() {
  return (
    <EmployeesLayout title="Importar Funcionários" list>
      <p className={styles.description}>
        Esta funcionalidade permitirá cadastrar funcionários em lote por meio de
        uma planilha.
      </p>
      <section
        className={upload.card}
        aria-label="Importação de funcionários em preparação"
      >
        <div className={upload.caixaUpload}>
          <div
            className={upload.inputArquivoArea + " " + styles.disabledArea}
            aria-disabled="true"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => event.preventDefault()}
          >
            <input
              id="employee-import-file"
              className={upload.fileInput}
              type="file"
              disabled
              aria-label="Selecionar planilha de funcionários"
              aria-describedby="employee-import-preparation"
            />
            <div className={upload.textoUpload}>
              <CloudArrowUpIcon size={100} color="#005C6D" aria-hidden="true" />
              <h2>Importação em preparação</h2>
              <p>
                O modelo oficial da planilha e os campos obrigatórios ainda
                serão definidos.
              </p>
            </div>
          </div>
          <p id="employee-import-preparation" className={styles.notice}>
            A importação de funcionários estará disponível após a definição do
            modelo oficial da planilha.
          </p>
          <div className={upload.containerBotao}>
            <Link className={styles.back} to="/funcionarios">
              Voltar para Funcionários
            </Link>
            <button
              type="button"
              className={upload.btnEnviar}
              disabled
              aria-describedby="employee-import-preparation"
            >
              Selecionar planilha
            </button>
          </div>
        </div>
      </section>
    </EmployeesLayout>
  );
}
