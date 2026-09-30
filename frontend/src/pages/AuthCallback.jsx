import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = location.hash || window.location.hash;
    const sessionId = new URLSearchParams(hash.replace(/^#/, "")).get("session_id");
    (async () => {
      if (!sessionId) { navigate("/"); return; }
      try {
        await completeLogin(sessionId);
        window.history.replaceState(null, "", window.location.pathname);
        toast.success("Connexion réussie");
        navigate("/compte", { replace: true });
      } catch {
        toast.error("Échec de la connexion");
        navigate("/", { replace: true });
      }
    })();
  }, [completeLogin, location.hash, navigate]);

  return (
    <div className="min-h-screen bg-[#F6F2EC] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="mono-label text-[11px] text-neutral-600">Connexion en cours…</p>
      </div>
    </div>
  );
}
