import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll appelé depuis un Server Component : ignoré si le
            // middleware rafraîchit déjà la session.
          }
        },
      },
    },
  );
}

/** L'utilisateur connecté, ou null.
 *
 * `auth.getUser()` est un appel réseau à l'API d'authentification, pas
 * une lecture du cookie. Le layout le demande pour la navigation, la
 * page le redemande pour ses propres données : sans mémorisation, tout
 * affichage paie deux fois le même aller-retour.
 *
 * Le cache() de React ne vit que le temps d'un rendu, donc il ne peut
 * pas servir une session périmée. Les Server Actions gardent
 * volontairement leur propre appel : une mutation doit vérifier
 * l'identité pour de bon, pas se fier à ce qu'un rendu a lu avant. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
