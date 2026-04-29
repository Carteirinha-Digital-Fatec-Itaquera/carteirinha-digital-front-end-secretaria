import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import layoutStyles from "../../../styles/layoutWithMenu.module.css";
import MenuLateral from "../../../components/menuLateral/MenuLateral";
import { TitleComp } from "../../../components/title/TitleComp";

function Lista (){

    return(
        <>
        <section className={layoutStyles.layoutContainer}>
            {/* menu lateral */}

            <div className={layoutStyles.menuWrapper}>
        <MenuLateral />
      </div>

      {/* conteudo da pagina */}
      <div className={layoutStyles.contentWrapper}>
       <TitleComp text="Lista de alunos" />

       {/* tabela com os botoes */}
    <div className="">

    <div className="table-responsive-md">
       <table className="table">
    <thead className="table-primary">
        <tr>
        <th scope="col"></th>
        <th scope="col">RA</th>
        <th scope="col">Ingresso</th>
        <th scope="col">Nome</th>
        <th scope="col">Nascimento</th>
        <th scope="col">Email</th>
        <th scope="col">Cpf</th>
        <th scope="col">Curso</th>
        <th scope="col">Situação</th>
        <th scope="col">Vencimento</th>
        </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">1</th>
      <td>Mark</td>
      <td>Ottofnrofnorfouewhufjwjfoemfcmfc</td>
      <td>@mdo</td>
      <td>Markfmpewmkmciewjfijrq9fewlkdpkewckeockeokfokew</td>
      <td>Ottofavmremvirejqiqejvrieqh</td>
      <td>@mdo</td>
      <td>Mark</td>
      <td>Otto</td>
      <td>@mdo</td>
    </tr>
    <tr>
      <th scope="row">2</th>
      <td>Jacob</td>
      <td>Thornton</td>
      <td>@fat</td>
      <td>Mark</td>
      <td>Otto</td>
      <td>@mdo</td><td>Mark</td>
      <td>Otto</td>
       <td>Otto</td>
      
    </tr>
    <tr>
      <th scope="row">3</th>
      <td>John</td>
      <td>Doe</td>
      <td>@social</td>
      <td>Mark</td>
      <td>Otto</td>
      <td>@mdo</td>
      <td>Mark</td>
      <td>Otto</td>
      <td>@mdo</td>
   
 

    </tr>
  </tbody>
</table>



      </div>
      </div>
      </div>

        </section>
        
        
        </>
        
        
    )
}
export default Lista;