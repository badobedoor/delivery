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
  notes?: string;
  /** Deterministic identity key used for merge decisions (generated automatically). */
  signature?: string;
}

/** Build a deterministic identity string from all customisable fields.
 *  Items with the same meal id AND same size AND same extras AND same notes
 *  will produce the same signature → they are merged.
 *  Different signatures → separate cart lines.
 *  Sorting extras ensures order-independence.
 *  Uses stable identifiers (id) when available to survive name changes. */
export function generateCartSignature(item: {
  id: string;
  size?: { id?: string | number; name?: string } | null;
  extras?: { id?: string | number; name?: string }[] | null;
  notes?: string | null;
}): string {
  const parts = [item.id];

  const sizeKey = item.size?.id ?? item.size?.name;
  if (sizeKey) {
    parts.push(`sz:${sizeKey}`);
  }

  const extras = item.extras ?? [];
  if (extras.length > 0) {
    const sorted = extras
      .map((e) => e.id ?? e.name ?? '')
      .sort()
      .join('|');
    parts.push(`xt:${sorted}`);
  }

  if (item.notes?.trim()) {
    parts.push(`nt:${item.notes.trim()}`);
  }

  return parts.join('__');
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
  const cart = JSON.parse(raw) as Cart;
  /* Backward compat: hydrate items saved before signatures existed */
  if (cart.items.some((i) => !i.signature)) {
    cart.items = cart.items.map((item) => ({
      ...item,
      signature: item.signature ?? generateCartSignature(item),
    }));
  }
  return cart;
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
  const signature = item.signature ?? generateCartSignature(item);
  const signedItem = { ...item, signature };
  const idx = existing.items.findIndex((i) => i.signature === signature);
  if (idx >= 0) {
    existing.items[idx].qty += signedItem.qty;
  } else {
    existing.items.push(signedItem);
  }
  saveCart(existing);
  return { conflict: false };
}

// 5. removeFromCart
export function removeFromCart(signature: string): void {
  const cart = getCart();
  if (!cart) return;
  cart.items = cart.items.filter((i) => i.signature !== signature);
  if (cart.items.length === 0) clearCart();
  else saveCart(cart);
}

// 6. updateQty
export function updateQty(signature: string, qty: number): void {
  if (qty === 0) { removeFromCart(signature); return; }
  const cart = getCart();
  if (!cart) return;
  const idx = cart.items.findIndex((i) => i.signature === signature);
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
