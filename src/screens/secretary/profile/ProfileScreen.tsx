import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaClock } from "react-icons/fa";

import { TitleComp } from "../../../components/title/TitleComp";
import { LoadingComp } from "../../../components/loading/LoadingComp";
import { ButtonComp } from "../../../components/button/ButtonComp";
import MenuLateral from "../../../components/menuLateral/MenuLateral";

import { findSecretaryById } from "../../../api/secretary/findById";
import { updateSecretary } from "../../../api/secretary/update";
import { decodeToken } from "../../../utils/decodeToken";

import styles from "./style.module.css";
import layoutStyles from "../../../styles/layoutWithMenu.module.css";
import { InputLogin } from "../../../components/inputLoginCadastro/InputLogin";

export default function ProfileScreen() {
  const navigate = useNavigate();

  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");

  const [secretaryId, setSecretaryId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const formatISOToBR = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const formatDateToISO = (dateStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const payload = decodeToken(token);
        const id = payload?.sub;
        if (!id) { navigate('/login'); return; }

        setSecretaryId(id);
        const data = await findSecretaryById(id);
        if (data) {
          setName(data.name ?? "");
          setEmail(data.email ?? "");
          setDueDate(formatISOToBR(data.dueDate ?? ""));
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleEdit = () => {
    setEditName(name);
    setEditEmail(email);
    setEditDueDate(dueDate);
    setEditing(true);
    setErrorMsg("");
  };

  const handleCancel = () => {
    setEditing(false);
    setErrorMsg("");
  };

  const handleSave = async () => {
  if (!secretaryId) return;

  if (editPassword && editPassword !== editConfirmPassword) {
    setErrorMsg("As senhas não coincidem.");
    return;
  }

  setSaving(true);
  const result = await updateSecretary(secretaryId, {
    name: editName,
    email: editEmail,
    dueDate: formatDateToISO(editDueDate),
    ...(editPassword ? { password: editPassword } : {}),
  });

  if ('ok' in result) {
    setName(editName);
    setEmail(editEmail);
    setDueDate(editDueDate);
    setEditing(false);
    setEditPassword("");
    setEditConfirmPassword("");
  } else {
    setErrorMsg(result.message);
  }
  setSaving(false);
  };

  return (
    <div className={layoutStyles.layoutContainer}>
      <div className={layoutStyles.menuWrapper}>
        <MenuLateral />
      </div>
      <div className={layoutStyles.contentWrapper}>
        <div className={styles.container}>

          <TitleComp text="Meu Perfil" />
          {loading ? (<LoadingComp />) : 
          (
          <div className={styles.card}>
            <div className={styles.avatarContainer}>
              <div className={styles.avatar}>
                {name.charAt(0).toUpperCase()}
              </div>
              <h2 className={styles.name}>{name}</h2>
            </div>

            {!editing ? (
              <>
                <div className={styles.infoList}>
                  <div className={styles.infoItem}>
                    <FaEnvelope className={styles.infoIcon} />
                    <div>
                      <span className={styles.infoLabel}>E-mail</span>
                      <span className={styles.infoValue}>{email}</span>
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <FaClock className={styles.infoIcon} />
                    <div>
                      <span className={styles.infoLabel}>Vencimento</span>
                      <span className={styles.infoValue}>{dueDate}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.editButton}>
                  <ButtonComp text="Editar perfil" onClick={handleEdit} />
                </div>
              </>
            ) : (
              <>
                <div className={styles.form}>
                  <InputLogin
                    label="Nome"
                    placeholder="Seu nome"
                    value={editName}
                    onChangeText={setEditName}
                  />
                  <InputLogin
                    label="E-mail"
                    type="email"
                    placeholder="Seu e-mail"
                    value={editEmail}
                    onChangeText={setEditEmail}
                  />
                  <InputLogin
                    label="Nova senha"
                    type="password"
                    placeholder="Digite a nova senha"
                    value={editPassword}
                    onChangeText={setEditPassword}
                  />
                  <InputLogin
                    label="Confirmar nova senha"
                    type="password"
                    placeholder="Confirme a nova senha"
                    value={editConfirmPassword}
                    onChangeText={setEditConfirmPassword}
                  />
                  
                  <div className={styles.infoItem}>
                    <FaClock className={styles.infoIcon} />
                    <div>
                    <span className={styles.infoLabel}>Vencimento</span>
                    <span className={styles.infoValue}>{dueDate}</span>
                    </div>
                </div>

                  {errorMsg && <p className={styles.error}>{errorMsg}</p>}
                </div>

                <div className={styles.actionButtons}>
                  {saving ? <LoadingComp /> : (
                    <>
                      <ButtonComp text="Salvar" onClick={handleSave} />
                      <ButtonComp text="Cancelar" onClick={handleCancel} color="#888888" />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>
      </div>
    </div>
  );
}