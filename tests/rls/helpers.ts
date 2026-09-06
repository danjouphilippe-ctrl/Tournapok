/** Petit client REST direct (sans @supabase/supabase-js) pour parler
 * au projet Supabase de test avec le jeton de tel ou tel utilisateur —
 * exactement ce qu'on a fait à la main toute la nuit avec les scripts
 * Python, mais en TypeScript et rejouable via `npm run test:rls`. */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type RestResult<T> = { status: number; data: T };

async function request<T>(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<RestResult<T>> {
  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${options.token ?? ANON_KEY}`,
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Prefer"] = "return=representation";
  }
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, data };
}

export const rest = {
  get: <T>(path: string, token?: string) => request<T>("GET", path, { token }),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>("POST", path, { body, token }),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>("PATCH", path, { body, token }),
  delete: <T>(path: string, token?: string) => request<T>("DELETE", path, { token }),
};

export type TestUser = { token: string; userId: string; pseudo: string };

let counter = 0;

/** Crée un compte confirmé frais (la confirmation d'email est
 * désactivée sur le projet de test) et renvoie de quoi l'utiliser
 * immédiatement dans les requêtes REST suivantes. Chaque appel génère
 * un email unique : aucun état partagé entre les tests. */
export async function signUpTestUser(pseudoPrefix: string): Promise<TestUser> {
  counter += 1;
  const unique = `${Date.now()}-${counter}`;
  const email = `danjouphilippe+rls${unique}@gmail.com`;
  const pseudo = `${pseudoPrefix}${unique}`;
  const password = "RlsTest2026!";

  const signup = await rest.post<{ id?: string; msg?: string }>("/auth/v1/signup", {
    email,
    password,
    data: { pseudo },
  });
  if (signup.status !== 200) {
    throw new Error(`Échec de l'inscription de test (${signup.status}): ${JSON.stringify(signup.data)}`);
  }

  const login = await rest.post<{ access_token?: string; user?: { id: string } }>(
    "/auth/v1/token?grant_type=password",
    { email, password },
  );
  if (login.status !== 200 || !login.data.access_token || !login.data.user) {
    throw new Error(
      `Échec de connexion de test (${login.status}) — la confirmation d'email est-elle ` +
        `bien désactivée sur le projet de test ? ${JSON.stringify(login.data)}`,
    );
  }

  return { token: login.data.access_token, userId: login.data.user.id, pseudo };
}
