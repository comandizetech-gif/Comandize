import { useState } from "react";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import PublicCatalog from "./pages/PublicCatalog";
import HomePage from "./pages/HomePage";

function App() {
  const [isLogged] = useState(!!localStorage.getItem("token"));

  const path = window.location.pathname;

  // Painel administrativo
  if (path === "/login") {
    return isLogged ? <DashboardLayout /> : <Login />;
  }

  // Dashboard após login
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/orders") ||
    path.startsWith("/products") ||
    path.startsWith("/clients")
  ) {
    return isLogged ? <DashboardLayout /> : <Login />;
  }

  // Site institucional
  if (path === "/") {
    return <HomePage />;
  }

  // Catálogos públicos
  return <PublicCatalog />;
}

export default App;