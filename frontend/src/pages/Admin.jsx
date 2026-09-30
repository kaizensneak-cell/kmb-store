import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Plus, Trash2, Pencil, Upload, X, ArrowLeft, Save } from "lucide-react";
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
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);

  const authed = !!token;
  const headers = { "X-Admin-Password": token };

  const refresh = () => {
    api.get("/products").then((r) => setProducts(r.data));
    api.get("/config").then((r) => setCommunes(r.data.communes || []));
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
    try {
      if (editing.id) await api.put(`/products/${editing.id}`, payload, { headers });
      else await api.post("/products", payload, { headers });
      toast.success("Produit enregistré");
      setEditing(null);
      refresh();
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
      </div>

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
