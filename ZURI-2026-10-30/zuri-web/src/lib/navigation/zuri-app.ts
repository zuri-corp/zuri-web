export const ZURI_APP_PATH='/app';
export function validZuriAppHash(hash:unknown):hash is string{
 return typeof hash==='string'&&/^#\/(?:lounge|aura|motion|rizz|lore)(?:\/[a-z-]+)?(?:\?[^#\s]{0,1000})?$/i.test(hash);
}
