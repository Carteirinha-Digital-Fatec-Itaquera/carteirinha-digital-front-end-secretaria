import { Navigate } from "react-router-dom";

export default function FirstAccessScreen() {
  return <Navigate to="/login" replace />;
}