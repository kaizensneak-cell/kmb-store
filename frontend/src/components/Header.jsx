import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Search, Menu, User as UserIcon } from "lucide-react";
import { CONFIG } from "@/config";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export const Header = ({ search, setSearch }) => {
  const navigate = useNavigate();
  const { count, setOpen } = useCart();
  const { user, login } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#F6F2EC]/90 backdrop-blur-md border-b border-neutral-200" data-testid="global-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/")}
            className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-neutral-900"
            data-testid="logo-button"
          >
            {CONFIG.STORE_NAME}
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <button
                onClick={() => navigate("/compte")}
                className="p-0.5 rounded-full border border-neutral-300 hover:border-[#DC2626] transition-colors"
                data-testid="account-button"
                aria-label="Mon compte"
              >
                {user.picture ? (
                  <img src={user.picture} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center text-sm font-bold">{user.name?.[0]}</div>
                )}
              </button>
            ) : (
              <button
                onClick={login}
                className="p-2.5 rounded-full border border-neutral-300 text-neutral-800 hover:bg-white transition-colors"
                data-testid="login-button"
                aria-label="Se connecter"
              >
                <UserIcon className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setOpen(true)}
              className="relative p-2.5 rounded-full bg-[#111111] text-white hover:bg-neutral-800 transition-colors"
              data-testid="cart-drawer-trigger"
              aria-label="Panier"
            >
              <ShoppingBag className="w-5 h-5" />
              {count > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#DC2626] text-white text-[10px] font-bold mono-label"
                  data-testid="cart-count-badge"
                >
                  {count}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="p-2.5 rounded-full border border-neutral-300 text-neutral-800 hover:bg-white transition-colors"
              data-testid="menu-button"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un modèle, une marque…"
              className="w-full h-11 pl-10 pr-4 rounded-full bg-white border border-neutral-200 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/40"
              data-testid="search-input"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
