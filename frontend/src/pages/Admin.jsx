import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Plus, Trash2, Pencil, Upload, X, ArrowLeft, Save, MessageCircle, Package, Bell, Download } from "lucide-react";
import { api, API, imgUrl, fmtFCFA } from "@/lib/api";
import { BRANDS } from "@/config";
import { toast } from "sonner";
import axios from "axios";

const SIZES = [37, 38, 39, 40, 41, 42, 43, 44, 45];
const BADGES = ["", "Nouveau", "-10 %", "-15 %", "Stock limité"];

const emptyProduct = { brand: "Nike", name: "", price: 0, old_price: null, badge: "", description: "", photos: [], sizes: [], stock: 0, featured: false };

export default function Admin() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("kmb_admin") || "");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState("Tous");
  const [restock, setRestock] = useState([]);
  const [notifyModal, setNotifyModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);

  const authed = !!token;
  const headers = { "X-Admin-Password": token };

  const refresh = () => {
    api.get("/products").then((r) => setProducts(r.data));
    api.get("/config").then((r) => setCommunes(r.data.communes || []));
    api.get("/admin/orders", { headers }).then((r) => setOrders(r.data)).catch(() => {});
    api.get("/admin/restock", { headers }).then((r) => setRestock(r.data)).catch(() => {});
  };

  useEffect(() => { if (authed) refresh(); }, [authed]);

  const login = async () => {
    try {
      await api.post("/admin/login", { password });
      localStorage.setItem("kmb_admin", password);
      setToken(password);
      toast.success("Connecté");
    } catch {
      toast.error("Mot de passe incorrect");
    }
  };

  const logout = () => { localStorage.removeItem("kmb_admin"); setToken(""); };

  const saveProduct = async () => {
    const payload = { ...editing, price: Number(editing.price), old_price: editing.old_price ? Number(editing.old_price) : null, stock: Number(editing.stock) };
    const productId = editing.id;
    try {
      if (editing.id) await api.put(`/products/${editing.id}`, payload, { headers });
      else await api.post("/products", payload, { headers });
      toast.success("Produit enregistré");
      setEditing(null);
      refresh();
      // Restock auto-notif : si le produit est en stock, proposer de prévenir les clients en attente
      if (productId && payload.stock > 0) {
        try {
          const r = await api.get("/admin/restock", { headers });
          const waiting = r.data.filter((x) => x.product_id === productId && payload.sizes.includes(x.size));
          if (waiting.length) setNotifyModal(waiting);
        } catch {}
      }
    } catch {
      toast.error("Erreur d'enregistrement");
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Supprimer ce produit ?")) return;
    await api.delete(`/products/${id}`, { headers });
    toast.success("Supprimé");
    refresh();
  };

  const uploadPhoto = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await axios.post(`${API}/upload`, fd, { headers });
      setEditing((e) => ({ ...e, photos: [...e.photos, r.data.url] }));
      toast.success("Photo ajoutée");
    } catch {
      toast.error("Échec de l'upload");
    }
    setUploading(false);
  };

  const saveCommunes = async () => {
    try {
      await api.put("/config/communes", communes, { headers });
      toast.success("Frais de livraison mis à jour");
    } catch {
      toast.error("Erreur");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/admin/orders/${id}/status`, { status }, { headers });
      setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Erreur");
    }
  };

  const relanceWhatsApp = (o) => {
    let msg = `Bonjour ${o.customer_name || ""}, au sujet de votre commande KMB STORE :\n\n`;
    o.items.forEach((it) => { msg += `• ${it.name} (Pointure ${it.size}) × ${it.qty}\n`; });
    if (o.commune) msg += `Livraison : ${o.commune}${o.landmark ? " — " + o.landmark : ""}\n`;
    msg += `Total : ${fmtFCFA(o.total)}\nStatut : ${o.status}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const deleteRestock = async (id) => {
    await api.delete(`/admin/restock/${id}`, { headers });
    setRestock((r) => r.filter((x) => x.id !== id));
    toast.success("Demande retirée");
  };

  const notifyRestock = (r) => {
    const num = (r.whatsapp || "").replace(/[^0-9]/g, "");
    const msg = `Bonjour ! Bonne nouvelle 🎉 Votre pointure ${r.size} pour "${r.product_name}" est de nouveau disponible chez KMB STORE. Commandez vite avant rupture !`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleModalRemove = async (id) => {
    await deleteRestock(id);
    setNotifyModal((m) => (m ? m.filter((x) => x.id !== id) : m));
  };

  const exportOrders = () => {
    const today = new Date().toDateString();
    const day = orders.filter((o) => new Date(o.created_at).toDateString() === today);
    if (!day.length) { toast.error("Aucune commande aujourd'hui."); return; }
    const rows = [["Date", "Client", "Email", "Articles", "Commune", "Repere", "Livraison", "Total", "Statut", "Methode"]];
    day.forEach((o) => {
      const arts = o.items.map((it) => `${it.name} P${it.size} x${it.qty}`).join(" | ");
      rows.push([new Date(o.created_at).toLocaleString("fr-FR"), o.customer_name || "", o.customer_email || "", arts, o.commune || "", o.landmark || "", o.delivery_fee, o.total, o.status, o.method]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${day.length} commande(s) exportée(s)`);
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#F6F2EC] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 w-full max-w-sm">
          <div className="w-12 h-12 rounded-full bg-[#111111] flex items-center justify-center mb-4"><Lock className="w-5 h-5 text-white" /></div>
          <h1 className="font-display font-extrabold text-2xl mb-1">Admin KMB STORE</h1>
          <p className="text-sm text-neutral-500 mb-6">Espace protégé par mot de passe</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="Mot de passe"
            className="w-full h-11 px-4 rounded-lg border border-neutral-200 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/40"
            data-testid="admin-password-input"
          />
          <button onClick={login} className="w-full h-11 rounded-full bg-[#111111] text-white font-semibold" data-testid="admin-login-button">Se connecter</button>
          <button onClick={() => navigate("/")} className="w-full mt-3 text-xs mono-label text-neutral-500">← Retour au site</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F2EC]">
      <div className="bg-[#111111] text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="mono-label text-[10px] flex items-center gap-1.5"><ArrowLeft className="w-3.5 h-3.5" /> Site</button>
          <h1 className="font-display font-extrabold text-lg">Admin KMB STORE</h1>
          <button onClick={logout} className="mono-label text-[10px] text-[#DC2626]" data-testid="admin-logout">Déconnexion</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("products")} className={`h-9 px-4 rounded-full mono-label text-[11px] ${tab === "products" ? "bg-[#DC2626] text-white" : "bg-white border border-neutral-200"}`} data-testid="tab-products">Produits</button>
          <button onClick={() => setTab("orders")} className={`h-9 px-4 rounded-full mono-label text-[11px] flex items-center gap-1.5 ${tab === "orders" ? "bg-[#DC2626] text-white" : "bg-white border border-neutral-200"}`} data-testid="tab-orders"><Package className="w-3.5 h-3.5" /> Commandes ({orders.length})</button>
          <button onClick={() => setTab("restock")} className={`h-9 px-4 rounded-full mono-label text-[11px] flex items-center gap-1.5 ${tab === "restock" ? "bg-[#DC2626] text-white" : "bg-white border border-neutral-200"}`} data-testid="tab-restock"><Bell className="w-3.5 h-3.5" /> Restock ({restock.length})</button>
          <button onClick={() => setTab("delivery")} className={`h-9 px-4 rounded-full mono-label text-[11px] ${tab === "delivery" ? "bg-[#DC2626] text-white" : "bg-white border border-neutral-200"}`} data-testid="tab-delivery">Livraison</button>
        </div>

        {tab === "products" && (
          <>
            <button onClick={() => setEditing({ ...emptyProduct })} className="mb-4 h-10 px-5 rounded-full bg-[#111111] text-white font-semibold text-sm flex items-center gap-2" data-testid="admin-add-product-button"><Plus className="w-4 h-4" /> Ajouter un produit</button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-neutral-200 p-3 flex gap-3" data-testid={`admin-product-${p.id}`}>
                  <img src={imgUrl(p.photos?.[0])} alt="" className="w-16 h-16 rounded-lg object-cover bg-[#EFEAE2]" />
                  <div className="flex-1 min-w-0">
                    <p className="mono-label text-[9px] text-neutral-500">{p.brand}</p>
                    <p className="font-semibold text-sm line-clamp-1">{p.name}</p>
                    <p className="font-mono text-[#DC2626] text-sm">{fmtFCFA(p.price)}</p>
                    <p className="mono-label text-[9px] text-neutral-400">Stock {p.stock}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => setEditing({ ...p })} className="p-1.5 rounded border border-neutral-200" data-testid={`edit-${p.id}`}><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded border border-neutral-200 text-[#DC2626]" data-testid={`delete-${p.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "restock" && (
          <div className="space-y-3 max-w-2xl" data-testid="admin-restock-list">
            {restock.length === 0 && <p className="text-sm text-neutral-500 py-8">Aucune demande d'alerte pour l'instant.</p>}
            {restock.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center justify-between gap-3" data-testid={`admin-restock-${r.id}`}>
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-neutral-900">{r.product_name} <span className="text-[#DC2626]">· P{r.size}</span></p>
                  <p className="mono-label text-[9px] text-neutral-500 mt-0.5">{r.brand} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
                  <p className="text-sm text-neutral-700 mt-1">WhatsApp : {r.whatsapp}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => notifyRestock(r)} className="h-9 px-4 rounded-full bg-[#111111] text-white text-xs mono-label flex items-center gap-1.5" data-testid={`restock-notify-${r.id}`}><MessageCircle className="w-3.5 h-3.5" /> Notifier</button>
                  <button onClick={() => deleteRestock(r.id)} className="h-9 px-4 rounded-full border border-neutral-200 text-[#DC2626] text-xs mono-label flex items-center gap-1.5" data-testid={`restock-delete-${r.id}`}><Trash2 className="w-3.5 h-3.5" /> Fait</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "delivery" && (
          <div className="bg-white rounded-xl border border-neutral-200 p-5 max-w-lg">
            <h3 className="font-display font-bold mb-4">Frais de livraison par commune (FCFA)</h3>
            <div className="space-y-2">
              {communes.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="flex-1 text-sm">{c.name}</span>
                  <input type="number" value={c.fee} onChange={(e) => setCommunes((cs) => cs.map((x, j) => j === i ? { ...x, fee: Number(e.target.value) } : x))} className="w-28 h-9 px-3 rounded-lg border border-neutral-200 text-sm font-mono" data-testid={`fee-${c.name}`} />
                </div>
              ))}
            </div>
            <button onClick={saveCommunes} className="mt-5 h-10 px-5 rounded-full bg-[#111111] text-white font-semibold text-sm flex items-center gap-2" data-testid="save-communes"><Save className="w-4 h-4" /> Enregistrer</button>
          </div>
        )}
        {tab === "orders" && (
          <div className="space-y-3 max-w-2xl" data-testid="admin-orders-list">
            <button onClick={exportOrders} className="h-9 px-4 rounded-full bg-[#111111] text-white text-xs mono-label flex items-center gap-1.5" data-testid="export-orders"><Download className="w-3.5 h-3.5" /> Exporter le jour (CSV)</button>
            <div className="flex gap-2 flex-wrap mb-1">
              {["Tous", "En attente", "Livré", "Annulé"].map((f) => (
                <button key={f} onClick={() => setOrderFilter(f)} className={`h-8 px-3 rounded-full mono-label text-[10px] ${orderFilter === f ? "bg-[#111111] text-white" : "bg-white border border-neutral-200 text-neutral-600"}`} data-testid={`order-filter-${f}`}>{f}</button>
              ))}
            </div>
            {orders.filter((o) => orderFilter === "Tous" || o.status === orderFilter).length === 0 && <p className="text-sm text-neutral-500 py-8">Aucune commande.</p>}
            {orders.filter((o) => orderFilter === "Tous" || o.status === orderFilter).map((o) => (
              <div key={o.id} className="bg-white rounded-xl border border-neutral-200 p-4" data-testid={`admin-order-${o.id}`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-neutral-900">{o.customer_name || "Client"}</p>
                    <p className="text-xs text-neutral-500 truncate">{o.customer_email}</p>
                    <p className="mono-label text-[9px] text-neutral-400 mt-0.5">{new Date(o.created_at).toLocaleString("fr-FR")} · {o.method === "wave" ? "Wave" : "WhatsApp"}</p>
                  </div>
                  <span className={`shrink-0 mono-label text-[9px] px-2 py-1 rounded-full ${o.status === "Livré" ? "bg-green-100 text-green-700" : o.status === "Annulé" ? "bg-neutral-200 text-neutral-500" : "bg-[#FEF2F2] text-[#DC2626]"}`} data-testid={`order-badge-${o.id}`}>{o.status}</span>
                </div>
                <div className="mt-2 border-t border-neutral-100 pt-2">
                  {o.items.map((it, i) => (<p key={i} className="text-sm text-neutral-800">{it.name} <span className="text-neutral-400">· P{it.size} × {it.qty}</span></p>))}
                  {o.commune && <p className="text-xs text-neutral-500 mt-1">{o.commune}{o.landmark ? ` — ${o.landmark}` : ""} · Livraison {fmtFCFA(o.delivery_fee)}</p>}
                  <p className="font-mono font-bold text-[#DC2626] mt-1">{fmtFCFA(o.total)}</p>
                </div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} className="h-9 px-3 rounded-lg border border-neutral-200 text-xs mono-label" data-testid={`order-status-${o.id}`}>
                    <option>En attente</option>
                    <option>Livré</option>
                    <option>Annulé</option>
                  </select>
                  <button onClick={() => relanceWhatsApp(o)} className="h-9 px-4 rounded-full bg-[#111111] text-white text-xs mono-label flex items-center gap-1.5" data-testid={`order-relance-${o.id}`}><MessageCircle className="w-3.5 h-3.5" /> Relance WhatsApp</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NOTIFY RESTOCK MODAL */}
      {notifyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" data-testid="notify-modal">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-extrabold text-lg">Clients en attente</h3>
              <button onClick={() => setNotifyModal(null)} data-testid="notify-modal-close"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-neutral-500 mb-4">{notifyModal.length} client(s) attendent cette paire de nouveau en stock. Prévenez-les sur WhatsApp.</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {notifyModal.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 border border-neutral-200 rounded-lg p-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900">P{r.size} · {r.whatsapp}</p>
                    <p className="mono-label text-[9px] text-neutral-400 truncate">{r.product_name}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => notifyRestock(r)} className="h-8 px-3 rounded-full bg-[#111111] text-white text-xs mono-label flex items-center gap-1" data-testid={`notify-modal-send-${r.id}`}><MessageCircle className="w-3.5 h-3.5" /> Notifier</button>
                    <button onClick={() => handleModalRemove(r.id)} className="h-8 px-3 rounded-full border border-neutral-200 text-[#DC2626] text-xs mono-label" data-testid={`notify-modal-done-${r.id}`}>Fait</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-extrabold text-xl">{editing.id ? "Modifier" : "Nouveau"} produit</h3>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select value={editing.brand} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} className="h-10 px-3 rounded-lg border border-neutral-200 text-sm" data-testid="edit-brand">
                  {BRANDS.map((b) => <option key={b}>{b}</option>)}
                </select>
                <select value={editing.badge || ""} onChange={(e) => setEditing({ ...editing, badge: e.target.value })} className="h-10 px-3 rounded-lg border border-neutral-200 text-sm" data-testid="edit-badge">
                  {BADGES.map((b) => <option key={b} value={b}>{b || "Aucun badge"}</option>)}
                </select>
              </div>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Nom du modèle" className="w-full h-10 px-3 rounded-lg border border-neutral-200 text-sm" data-testid="edit-name" />
              <div className="grid grid-cols-3 gap-3">
                <input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} placeholder="Prix" className="h-10 px-3 rounded-lg border border-neutral-200 text-sm" data-testid="edit-price" />
                <input type="number" value={editing.old_price || ""} onChange={(e) => setEditing({ ...editing, old_price: e.target.value })} placeholder="Ancien prix" className="h-10 px-3 rounded-lg border border-neutral-200 text-sm" data-testid="edit-oldprice" />
                <input type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} placeholder="Stock" className="h-10 px-3 rounded-lg border border-neutral-200 text-sm" data-testid="edit-stock" />
              </div>
              <textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Description" rows={3} className="w-full p-3 rounded-lg border border-neutral-200 text-sm" data-testid="edit-description" />
              <div>
                <p className="mono-label text-[10px] text-neutral-500 mb-2">Pointures disponibles</p>
                <div className="grid grid-cols-5 gap-2">
                  {SIZES.map((s) => (
                    <button key={s} onClick={() => setEditing((e) => ({ ...e, sizes: e.sizes.includes(s) ? e.sizes.filter((x) => x !== s) : [...e.sizes, s].sort((a, b) => a - b) }))} className={`h-9 rounded mono-label text-xs ${editing.sizes.includes(s) ? "bg-[#DC2626] text-white" : "bg-neutral-100"}`} data-testid={`edit-size-${s}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mono-label text-[10px] text-neutral-500 mb-2">Photos</p>
                <div className="flex gap-2 flex-wrap mb-2">
                  {editing.photos.map((ph, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-200">
                      <img src={imgUrl(ph)} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setEditing((e) => ({ ...e, photos: e.photos.filter((_, j) => j !== i) }))} className="absolute top-0 right-0 bg-black/60 text-white p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-neutral-300 text-sm cursor-pointer" data-testid="upload-photo-label">
                  <Upload className="w-4 h-4" /> {uploading ? "Envoi…" : "Uploader une photo"}
                  <input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0])} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} data-testid="edit-featured" /> Mettre en avant (Nouveautés & Best-sellers)
              </label>
              <button onClick={saveProduct} className="w-full h-11 rounded-full bg-[#111111] text-white font-semibold flex items-center justify-center gap-2" data-testid="save-product"><Save className="w-4 h-4" /> Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
