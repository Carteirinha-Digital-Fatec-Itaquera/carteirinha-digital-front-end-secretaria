import { useEffect } from 'react';
import { checkSession, watchSessionLifecycle } from './api/auth/session';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import LoginScreen from "./screens/login/LoginScreen";
import FirstAccessScreen from "./screens/access/FirstAccessScreen";
import RegisterStudentScreen from "./screens/student/register/RegisterStudentScreen";
import RedefinePasswordScreen from "./screens/recoverypassword/redefine/RedefinePasswordScreen";
import SecurityCodeScreen from "./screens/recoverypassword/code/SecurityCodeScreen";
import NewPasswordScreen from "./screens/recoverypassword/password/NewPasswordScreen";
import UpdateStudentScreen from "./screens/student/update/UpdateStudentScreen";
import ListStudentScreen from "./screens/student/list/ListStudentScreen";
import UploadStudentsScreen from "./screens/student/upload/UploadStudentsScreen";
import ProfileScreen from "./screens/secretary/profile/ProfileScreen";
import ResetPasswordScreen from "./screens/recoverypassword/reset/ResetPasswordScreen";
import PhotosScreen from "./screens/secretary/photos/PhotosScreen";
import ChangePasswordScreen from "./screens/changepassword/ChangePasswordScreen";

import RequireSecretarySession from "./components/auth/RequireSecretarySession";
import SecretariaEventosScreen from "./screens/events/SecretariaEventosScreen";
import SecretariaNovoEventoScreen from "./screens/events/SecretariaNovoEventoScreen";
import SecretariaEditarEventoScreen from "./screens/events/SecretariaEditarEventoScreen";
import SecretariaGerenciarEventoScreen from "./screens/events/SecretariaGerenciarEventoScreen";
import CertificadoVerificarScreen from "./screens/certificate/CertificadoVerificarScreen";
import ProjectCreditsScreen from "./screens/credits/ProjectCreditsScreen";
import CreditsFormScreen from "./screens/credits/CreditsFormScreen";

function SessionLifecycle() {
  const location = useLocation();
  useEffect(watchSessionLifecycle, []);
  useEffect(() => { checkSession(); }, [location.key]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionLifecycle />
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/access" element={<FirstAccessScreen />} />
        <Route path="/redefine" element={<RedefinePasswordScreen />} />
        <Route path="/code/:email" element={<SecurityCodeScreen />} />
        <Route path="/password/:email/:code" element={<NewPasswordScreen />} />
        <Route element={<RequireSecretarySession />}>
        <Route path="/students" element={<ListStudentScreen />} />
        <Route path="/register" element={<RegisterStudentScreen />} />
        <Route path="/update/:ra" element={<UpdateStudentScreen />} />
        <Route path="/upload-alunos" element={<UploadStudentsScreen />} />
        <Route path="/perfil" element={<ProfileScreen />} />
        <Route path="/fotos" element={<PhotosScreen />} />
        <Route path="/redefinir-senha" element={<ChangePasswordScreen />} />

        {/* Alias de criacao de evento */}
        <Route path="/criar-evento" element={<Navigate to="/eventos/novo" replace />} />

        {/* Rotas administrativas de eventos */}
          <Route path="/eventos" element={<SecretariaEventosScreen />} />
          <Route path="/eventos/novo" element={<SecretariaNovoEventoScreen />} />
          <Route path="/eventos/:id/editar" element={<SecretariaEditarEventoScreen />} />
          <Route path="/eventos/:id/gerenciar" element={<SecretariaGerenciarEventoScreen />} />

          {/* Rotas administrativas de creditos */}
          <Route path="/creditos/gerenciar" element={<Navigate to="/creditos" replace />} />
          <Route path="/creditos/novo" element={<CreditsFormScreen />} />
          <Route path="/creditos/:id/editar" element={<CreditsFormScreen />} />
        </Route>

        <Route path="/reset-password" element={<ResetPasswordScreen />} />

        {/* Rota publica de creditos do projeto */}
        <Route path="/creditos" element={<ProjectCreditsScreen />} />

        {/* Rota publica de verificacao de certificado */}
        <Route path="/certificados/verificar" element={<CertificadoVerificarScreen />} />
        <Route path="/certificados/verificar/:code" element={<CertificadoVerificarScreen />} />
        <Route path="/certificado/verificar/:codigo" element={<CertificadoVerificarScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

