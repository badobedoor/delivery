type RestaurantTimeFields = {
  is_active: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

export function isRestaurantOpen(restaurant: RestaurantTimeFields): boolean {
  if (!restaurant.is_active) return false;

  const { opens_at, closes_at } = restaurant;
  if (!opens_at || !closes_at) return true;

  const now = new Date();
  const cairo = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  const current = cairo.getHours() * 60 + cairo.getMinutes();

  const [openH, openM] = opens_at.split(":").map(Number);
  const [closeH, closeM] = closes_at.split(":").map(Number);
  const open = openH * 60 + openM;
  const close = closeH * 60 + closeM;

  if (open <= close) {
    return current >= open && current < close;
  }
  // crosses midnight
  return current >= open || current < close;
}
