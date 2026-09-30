import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Package, Heart, User as UserIcon } from "lucide-react";
import { authApi, fmtFCFA } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { InfoStrip } from "@/components/InfoStrip";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";

export default function Account() {
  const navigate = useNavigate();
  const { user, loading, login, logout } = useAuth();
  const [tab, setTab] = useState("profil");
  const [orders, setOrders] = useState([]);
  const [favs, setFavs] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) {
      authApi.get("/orders").then((r) => setOrders(r.data)).catch(() => {});
      authApi.get("/favorites").then((r) => setFavs(r.data.products || [])).catch(() => {});
    }
  }, [user]);

  if (loading) return <div className="min-h-screen bg-[#F6F2EC]" />;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F6F2EC]">
        <InfoStrip />
        <Header search={search} setSearch={setSearch} />
        <CartDrawer />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-[#111111] flex items-center justify-center mx-auto mb-5"><UserIcon className="w-6 h-6 text-white" /></div>
          <h1 className="font-display font-extrabold text-2xl mb-2">Mon compte</h1>
          <p className="text-sm text-neutral-500 mb-6">Connectez-vous pour suivre vos commandes et retrouver vos favoris.</p>
          <button onClick={login} className="h-12 px-6 rounded-full bg-[#111111] text-white font-semibold inline-flex items-center gap-3" data-testid="google-login-button">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5 bg-white rounded-full p-0.5" />
            Se connecter avec Google
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F2EC]">
      <InfoStrip />
      <Header search={search} setSearch={setSearch} />
      <CartDrawer />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button onClick={() => navigate("/")} className="mono-label text-[11px] text-neutral-600 hover:text-[#DC2626] flex items-center gap-1.5 mb-6"><ArrowLeft className="w-3.5 h-3.5" /> Retour au site</button>

        <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex items-center gap-4 mb-6" data-testid="account-header">
          {user.picture ? <img src={user.picture} alt="" className="w-14 h-14 rounded-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-14 h-14 rounded-full bg-[#111111] flex items-center justify-center text-white font-display font-bold">{user.name?.[0]}</div>}
          <div className="flex-1 min-w-0">
            <p className="font-display font-extrabold text-lg text-neutral-900" data-testid="account-name">{user.name}</p>
            <p className="text-sm text-neutral-500 truncate">{user.email}</p>
          </div>
          <button onClick={logout} className="mono-label text-[10px] text-[#DC2626] flex items-center gap-1.5" data-testid="logout-button"><LogOut className="w-4 h-4" /> Déconnexion</button>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("commandes")} className={`h-9 px-4 rounded-full mono-label text-[11px] flex items-center gap-1.5 ${tab === "commandes" ? "bg-[#DC2626] text-white" : "bg-white border border-neutral-200"}`} data-testid="tab-orders"><Package className="w-3.5 h-3.5" /> Commandes ({orders.length})</button>
          <button onClick={() => setTab("favoris")} className={`h-9 px-4 rounded-full mono-label text-[11px] flex items-center gap-1.5 ${tab === "favoris" ? "bg-[#DC2626] text-white" : "bg-white border border-neutral-200"}`} data-testid="tab-favorites"><Heart className="w-3.5 h-3.5" /> Favoris ({favs.length})</button>
        </div>

        {tab === "profil" && null}

        {tab !== "favoris" && (
          <div className="space-y-3" data-testid="orders-list">
            {orders.length === 0 && <p className="text-sm text-neutral-500 py-8 text-center">Aucune commande enregistrée pour l'instant.</p>}
            {orders.map((o) => (
              <div key={o.id} className="bg-white rounded-xl border border-neutral-200 p-4" data-testid={`order-${o.id}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="mono-label text-[9px] text-neutral-500">{new Date(o.created_at).toLocaleDateString("fr-FR")} · {o.method === "wave" ? "Wave" : "WhatsApp"}</span>
                  <span className="mono-label text-[9px] px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]">{o.status}</span>
                </div>
                {o.items.map((it, i) => (
                  <p key={i} className="text-sm text-neutral-800">{it.name} <span className="text-neutral-400">· P{it.size} × {it.qty}</span></p>
                ))}
                {o.commune && <p className="text-xs text-neutral-500 mt-1">Livraison {o.commune} — {fmtFCFA(o.delivery_fee)}</p>}
                <p className="font-mono font-bold text-[#DC2626] mt-2">{fmtFCFA(o.total)}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "favoris" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5" data-testid="favorites-list">
            {favs.length === 0 && <p className="text-sm text-neutral-500 py-8 col-span-full text-center">Aucun favori. Touchez le cœur sur une paire pour l'ajouter.</p>}
            {favs.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
