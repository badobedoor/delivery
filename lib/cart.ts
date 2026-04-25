// Types
export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image_url: string | null;
  description: string | null;
  extras?: { name: string; price: number }[];
  size?: { name: string; price: number };
}

export type Cart = {
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
}

const CART_KEY          = "hala_cart";
const CART_UPDATE_EVENT = "hala-cart-updated";

function notifyCartUpdate() {
  window.dispatchEvent(new Event(CART_UPDATE_EVENT));
}

// 1. getCart
export function getCart(): Cart | null {
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

// 2. saveCart
export function saveCart(cart: Cart): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  notifyCartUpdate();
}

// 3. clearCart
export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  notifyCartUpdate();
}

// 4. addToCart
export function addToCart(
  restaurantId: string,
  restaurantName: string,
  item: CartItem
): { conflict: boolean; conflictName?: string } {
  const cart = getCart();
  if (cart && cart.restaurantId !== restaurantId) {
    return { conflict: true, conflictName: cart.restaurantName };
  }
  const existing = cart ?? { restaurantId, restaurantName, items: [] };
  const idx = existing.items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    existing.items[idx].qty += item.qty;
  } else {
    existing.items.push(item);
  }
  saveCart(existing);
  return { conflict: false };
}

// 5. removeFromCart
export function removeFromCart(itemId: string): void {
  const cart = getCart();
  if (!cart) return;
  cart.items = cart.items.filter((i) => i.id !== itemId);
  if (cart.items.length === 0) clearCart();
  else saveCart(cart);
}

// 6. updateQty
export function updateQty(itemId: string, qty: number): void {
  if (qty === 0) { removeFromCart(itemId); return; }
  const cart = getCart();
  if (!cart) return;
  const idx = cart.items.findIndex((i) => i.id === itemId);
  if (idx >= 0) cart.items[idx].qty = qty;
  saveCart(cart);
}

// 7. getCartCount
export function getCartCount(): number {
  const cart = getCart();
  if (!cart) return 0;
  return cart.items.reduce((sum, i) => sum + i.qty, 0);
}

// 8. getCartTotal
export function getCartTotal(): number {
  const cart = getCart();
  if (!cart) return 0;
  return cart.items.reduce((sum, i) => {
    const sizePrice = i.size?.price ?? 0;
    const extrasPrice = (i.extras ?? []).reduce((s, e) => s + e.price, 0);
    return sum + (i.price + sizePrice + extrasPrice) * i.qty;
  }, 0);
}
