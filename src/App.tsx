import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginScreen from "./screens/login/LoginScreen";
import FirstAccessScreen from "./screens/access/FirstAccessScreen";
import RegisterStudentScreen from "./screens/student/register/RegisterStudentScreen";
import RedefinePasswordScreen from "./screens/recoverypassword/redefine/RedefinePasswordScreen";
import SecurityCodeScreen from "./screens/recoverypassword/code/SecurityCodeScreen";
import NewPasswordScreen from "./screens/recoverypassword/password/NewPasswordScreen";
import StudentsListScreen from "./screens/student/list/ListStudentScreen";
import UpdateStudentScreen from "./screens/student/update/UpdateStudentScreen";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<LoginScreen />} />

        <Route path="/login" element={<LoginScreen />} />
        <Route path="/access" element={<FirstAccessScreen />} />

        <Route path="/redefine" element={<RedefinePasswordScreen />} />
        <Route path="/code/:email" element={<SecurityCodeScreen />} />
        <Route path="/password/:email/:code" element={<NewPasswordScreen />} />

        <Route path="/students" element={<StudentsListScreen />} />
        <Route path="/register" element={<RegisterStudentScreen />} />
        <Route path="/update/:id" element={<UpdateStudentScreen />} />
        
      </Routes>
    </BrowserRouter>
  );
}

