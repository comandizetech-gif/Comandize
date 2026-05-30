import { useState } from "react";
import Products from "../pages/Products";
import CatalogManager from "../pages/CatalogManager";
import StoreConfig from "../pages/StoreConfig";
import Delivery from "../pages/Delivery";
import History from "../pages/History";
import Orders from "../pages/Orders";
import Reports from "../pages/Reports";
import Customers from "../pages/Customers";
import DeliveryPersons from "../pages/DeliveryPersons";

import {
  FaMotorcycle,
  FaClipboardList,
  FaHistory,
  FaBoxOpen,
  FaStore,
  FaUsers,
  FaChartBar,
  FaTruck,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaChevronLeft,
} from "react-icons/fa";

function DashboardLayout() {
  const [activePage, setActivePage] = useState("Delivery");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { name: "Delivery", icon: <FaMotorcycle /> },
    { name: "Pedidos", icon: <FaClipboardList /> },
    { name: "Históricos", icon: <FaHistory /> },
    { name: "Produtos", icon: <FaBoxOpen /> },
    { name: "Catálogo Online", icon: <FaStore /> },
    { name: "Clientes", icon: <FaUsers /> },
    { name: "Relatórios", icon: <FaChartBar /> },
    { name: "Entregadores", icon: <FaTruck /> },
    { name: "Configuração", icon: <FaCog /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const goToOrderEdit = (orderId) => {
    setSelectedOrderId(orderId);
    setActivePage("Pedidos");
    setSidebarOpen(false);
  };

  const changePage = (pageName) => {
    setActivePage(pageName);
    if (pageName !== "Pedidos") setSelectedOrderId(null);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#374151] flex overflow-x-hidden">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white border-r border-[#e5e7eb] flex flex-col shadow-xl lg:shadow-sm transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex justify-center py-4 border-b border-gray-200">
  <img
    src="/icons/Comandize.png"
    alt="Comandize"
    className="w-32 md:w-36 object-contain"
  />


          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-10 h-10 rounded-xl bg-[#fff7ed] text-[#ff8a00] flex items-center justify-center"
            aria-label="Recolher menu"
          >
            <FaChevronLeft />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = activePage === item.name;

            return (
              <button
                key={item.name}
                onClick={() => changePage(item.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 ${
                  isActive
                    ? "bg-[#ff9811] text-white font-bold shadow-md shadow-orange-200"
                    : "text-[#374151] hover:bg-[#fff7ed] hover:text-[#ff8a00]"
                }`}
              >
                <span className={`text-lg ${isActive ? "text-white" : "text-[#ff9811]"}`}>
                  {item.icon}
                </span>
                <span className="font-semibold">{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#eef0f3]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[#ef4444] hover:bg-[#fee2e2] transition font-semibold"
          >
            <FaSignOutAlt />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-[#f5f6fa] min-w-0">
        <header className="h-16 lg:h-20 bg-white border-b border-[#e5e7eb] flex items-center justify-between px-4 lg:px-8 shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-11 h-11 rounded-xl bg-[#ff9811] text-white flex items-center justify-center shadow-md shadow-orange-200"
              aria-label="Abrir menu"
            >
              <FaBars />
            </button>

            <div className="min-w-0">
              <h2 className="text-xl lg:text-2xl font-black text-[#111827] truncate">
                {activePage}
              </h2>
              <p className="hidden sm:block text-xs lg:text-sm text-[#6b7280] truncate">
                Gerencie sua operação pelo painel Comandize
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="font-bold text-[#374151] leading-tight">Administrador</p>
              <p className="text-xs text-[#ff8a00] font-semibold">Conta ativa</p>
            </div>

            <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[#ff9811] text-white flex items-center justify-center font-black shadow-md shadow-orange-200">
              A
            </div>
          </div>
        </header>

        <section className="p-4 lg:p-8 max-w-[1600px] mx-auto">
          {activePage === "Delivery" && <Delivery />}
          {activePage === "Pedidos" && <Orders selectedOrderId={selectedOrderId} />}
          {activePage === "Históricos" && <History onEditOrder={goToOrderEdit} />}
          {activePage === "Produtos" && <Products />}
          {activePage === "Catálogo Online" && <CatalogManager />}
          {activePage === "Clientes" && <Customers />}
          {activePage === "Relatórios" && <Reports />}
          {activePage === "Entregadores" && <DeliveryPersons />}
          {activePage === "Configuração" && <StoreConfig />}
        </section>
      </main>
    </div>
  );
}

export default DashboardLayout;
