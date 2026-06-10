const MAX_ADDRESSES = 8;

function storageKey(userId: string): string {
  return `delivery_saved_addresses:${userId}`;
}

export function getSavedAddresses(userId: string, primaryAddress?: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const fromStorage = Array.isArray(parsed)
      ? parsed.filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
      : [];
    const merged = [primaryAddress ?? '', ...fromStorage]
      .map((a) => a.trim())
      .filter(Boolean)
      .filter((a, i, arr) => arr.indexOf(a) === i)
      .slice(0, MAX_ADDRESSES);
    return merged;
  } catch {
    return primaryAddress?.trim() ? [primaryAddress.trim()] : [];
  }
}

export function saveAddresses(userId: string, addresses: string[]): void {
  const unique = addresses
    .map((a) => a.trim())
    .filter(Boolean)
    .filter((a, i, arr) => arr.indexOf(a) === i)
    .slice(0, MAX_ADDRESSES);
  localStorage.setItem(storageKey(userId), JSON.stringify(unique));
}

export function addAddress(userId: string, address: string, primaryAddress?: string): string[] {
  const next = getSavedAddresses(userId, primaryAddress);
  const trimmed = address.trim();
  if (!trimmed) return next;
  if (!next.includes(trimmed)) next.unshift(trimmed);
  saveAddresses(userId, next);
  return next.slice(0, MAX_ADDRESSES);
}

export function removeAddress(userId: string, address: string, primaryAddress?: string): string[] {
  const next = getSavedAddresses(userId, primaryAddress).filter((a) => a !== address);
  saveAddresses(userId, next);
  return next;
}
