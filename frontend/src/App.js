import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import Home from "@/pages/Home";
import ProductPage from "@/pages/ProductPage";
import Admin from "@/pages/Admin";
import Account from "@/pages/Account";
import AuthCallback from "@/pages/AuthCallback";

function AppRouter() {
  const location = useLocation();
  // Process OAuth session_id from URL fragment FIRST (synchronously, before other routes)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/produit/:id" element={<ProductPage />} />
      <Route path="/compte" element={<Account />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
