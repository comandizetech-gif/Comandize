import { useState } from "react";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import PublicCatalog from "./pages/PublicCatalog";

function App() {
  const [isLogged] = useState(!!localStorage.getItem("token"));

  const path = window.location.pathname;

  if (path !== "/") {
    return <PublicCatalog />;
  }

  return isLogged ? <DashboardLayout /> : <Login />;
}

export default App;