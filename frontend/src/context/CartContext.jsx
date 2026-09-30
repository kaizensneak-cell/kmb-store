import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const load = () => {
  try {
    return JSON.parse(localStorage.getItem("kmb_cart") || "{}");
  } catch {
    return {};
  }
};

export const CartProvider = ({ children }) => {
  const saved = load();
  const [items, setItems] = useState(saved.items || []);
  const [commune, setCommune] = useState(saved.commune || null);
  const [landmark, setLandmark] = useState(saved.landmark || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("kmb_cart", JSON.stringify({ items, commune, landmark }));
  }, [items, commune, landmark]);

  const addItem = (product, size, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id && i.size === size);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { product, size, qty }];
    });
  };

  const removeItem = (id, size) =>
    setItems((prev) => prev.filter((i) => !(i.product.id === id && i.size === size)));

  const updateQty = (id, size, qty) =>
    setItems((prev) =>
      prev.map((i) => (i.product.id === id && i.size === size ? { ...i, qty: Math.max(1, qty) } : i))
    );

  const clear = () => {
    setItems([]);
    setCommune(null);
    setLandmark("");
  };

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const deliveryFee = commune ? commune.fee : 0;
  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{ items, commune, setCommune, landmark, setLandmark, open, setOpen, addItem, removeItem, updateQty, clear, count, subtotal, deliveryFee, total }}
    >
      {children}
    </CartContext.Provider>
  );
};
