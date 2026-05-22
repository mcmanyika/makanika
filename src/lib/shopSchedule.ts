/** Shop scheduling defaults (Mon–Sat, 8am–5pm local). */

export const BUSINESS_HOUR_START = 8;
export const BUSINESS_HOUR_END = 17;

/** JavaScript getDay(): 0 = Sunday, 1 = Monday, … 6 = Saturday */
export const SHOP_OPEN_DAYS = [1, 2, 3, 4, 5, 6] as const;

export const SHOP_HOURS_LABEL =
  "Monday–Saturday, 8:00 AM – 5:00 PM (shop local time)";

export const SHOP_CLOSED_DAY_LABEL = "Sunday";

export function isShopOpenDay(day: number): boolean {
  return (SHOP_OPEN_DAYS as readonly number[]).includes(day);
}

export function isWithinBusinessHours(
  start: Date,
  durationMinutes: number
): boolean {
  if (!isShopOpenDay(start.getDay())) return false;
  if (start.getHours() < BUSINESS_HOUR_START) return false;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  if (end.getHours() > BUSINESS_HOUR_END) return false;
  if (end.getHours() === BUSINESS_HOUR_END && end.getMinutes() > 0) {
    return false;
  }
  return true;
}
