import { useState } from "react";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import PublicCatalog from "./pages/PublicCatalog";
import HomePage from "./pages/HomePage";

const MAIN_DOMAINS = [
  "comandize.com.br",
  "www.comandize.com.br",
  "localhost",
  "127.0.0.1",
];

function isCustomDomain() {
  const host = window.location.hostname.toLowerCase();
  return !MAIN_DOMAINS.includes(host);
}

function App() {
  const [isLogged] = useState(!!localStorage.getItem("token"));
  const path = window.location.pathname;

  if (isCustomDomain()) {
    return <PublicCatalog />;
  }

  if (path === "/login") {
    return isLogged ? <DashboardLayout /> : <Login />;
  }

  if (path === "/app" || path === "/dashboard") {
    return isLogged ? <DashboardLayout /> : <Login />;
  }

  if (path === "/") {
    return <HomePage />;
  }

  return <PublicCatalog />;
}

export default App;
