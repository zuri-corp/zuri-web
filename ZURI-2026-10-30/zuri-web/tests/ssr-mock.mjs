export const refresh = { calls: 0, cookies: [], cacheHeaders: {} };
export function createServerClient(_url, _key, options) {
  return {auth:{async getUser() {
    refresh.calls++;
    options.cookies.setAll(refresh.cookies, refresh.cacheHeaders);
    return {data:{user:null},error:null};
  }}};
}
