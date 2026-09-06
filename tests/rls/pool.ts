import { rest, type TestUser } from "./helpers";

/** Réserve fixe de comptes de test, créés une seule fois puis
 * réutilisés à chaque exécution de la suite — pour éviter le
 * rate-limit d'inscription de Supabase (une vraie protection
 * anti-abus, même sur un projet de test). Chaque test tire un
 * compte du pool plutôt que d'en créer un nouveau ; comme chaque
 * test crée ses propres clubs/tournois "frais", réutiliser la même
 * personne physique sous des rôles différents d'un test à l'autre
 * ne provoque aucune contamination : les relations testées sont
 * toujours rattachées à un id de ressource tout juste créé. */
const POOL_SIZE = 10;
const PASSWORD = "RlsPoolTest2026!";

function poolEmail(index: number): string {
  return `danjouphilippe+rlspool${index}@gmail.com`;
}

const cache = new Map<number, TestUser>();

async function loginOrSignUp(index: number): Promise<TestUser> {
  const email = poolEmail(index);
  const pseudo = `RlsPool${String(index).padStart(2, "0")}`;

  const login = await rest.post<{ access_token?: string; user?: { id: string } }>(
    "/auth/v1/token?grant_type=password",
    { email, password: PASSWORD },
  );
  if (login.status === 200 && login.data.access_token && login.data.user) {
    return { token: login.data.access_token, userId: login.data.user.id, pseudo };
  }

  // Le compte n'existe pas encore : on le crée une bonne fois pour toutes.
  const signup = await rest.post<{ id?: string }>("/auth/v1/signup", {
    email,
    password: PASSWORD,
    data: { pseudo },
  });
  if (signup.status !== 200) {
    throw new Error(
      `Impossible de créer le compte du pool #${index} (${signup.status}): ${JSON.stringify(signup.data)}`,
    );
  }

  const retryLogin = await rest.post<{ access_token?: string; user?: { id: string } }>(
    "/auth/v1/token?grant_type=password",
    { email, password: PASSWORD },
  );
  if (retryLogin.status !== 200 || !retryLogin.data.access_token || !retryLogin.data.user) {
    throw new Error(
      `Compte du pool #${index} créé mais connexion impossible (${retryLogin.status}) — ` +
        `la confirmation d'email est-elle bien désactivée sur le projet de test ?`,
    );
  }
  return { token: retryLogin.data.access_token, userId: retryLogin.data.user.id, pseudo };
}

/** Renvoie le compte de test n°`index` (0 à 9), en le créant s'il
 * n'existe pas encore. Mémoïsé pour la durée du process : un même
 * index renvoie toujours le même jeton dans une seule exécution. */
export async function getPoolUser(index: number): Promise<TestUser> {
  if (index < 0 || index >= POOL_SIZE) {
    throw new Error(`Index de pool invalide : ${index} (0 à ${POOL_SIZE - 1})`);
  }
  const cached = cache.get(index);
  if (cached) return cached;

  const user = await loginOrSignUp(index);
  cache.set(index, user);
  return user;
}
