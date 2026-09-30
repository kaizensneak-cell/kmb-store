import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  const loadFavorites = useCallback(async () => {
    try {
      const r = await authApi.get("/favorites");
      setFavorites(r.data.product_ids || []);
    } catch {
      setFavorites([]);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const r = await authApi.get("/auth/me");
      setUser(r.data);
      loadFavorites();
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadFavorites]);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const login = () => {
    const redirectUrl = window.location.origin + "/compte";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const completeLogin = async (sessionId) => {
    const r = await authApi.post("/auth/session", {}, { headers: { "X-Session-ID": sessionId } });
    setUser(r.data);
    await loadFavorites();
    return r.data;
  };

  const logout = async () => {
    try { await authApi.post("/auth/logout"); } catch {}
    setUser(null);
    setFavorites([]);
    toast.success("Déconnecté");
  };

  const isFavorite = (id) => favorites.includes(id);

  const toggleFavorite = async (id) => {
    if (!user) { toast.error("Connectez-vous pour enregistrer vos favoris"); return; }
    try {
      const r = await authApi.post(`/favorites/${id}`);
      setFavorites((prev) => (r.data.favorited ? [...prev, id] : prev.filter((x) => x !== id)));
    } catch {
      toast.error("Erreur");
    }
  };

  const recordOrder = async (payload) => {
    if (!user) return;
    try { await authApi.post("/orders", payload); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, completeLogin, favorites, isFavorite, toggleFavorite, recordOrder }}>
      {children}
    </AuthContext.Provider>
  );
};
