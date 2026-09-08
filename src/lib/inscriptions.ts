/* La règle d'ouverture des inscriptions, au même endroit pour le serveur
 * qui la fait respecter et pour la page qui doit l'annoncer.
 *
 * Elle vivait dans auth/actions.ts, mais un module "use server" ne peut
 * exporter que des fonctions asynchrones : la page n'avait aucun moyen
 * de savoir que les inscriptions étaient fermées, et l'annonçait donc
 * après coup, une fois le formulaire rempli. */

/** Le site est en test privé avant l'évènement du 28 novembre 2026 :
 * seul le compte du créateur et ses alias +xxx peuvent s'inscrire. Les
 * comptes déjà créés ne sont pas concernés — ce verrou ne porte que sur
 * la création. À retirer une fois le site ouvert aux joueurs. */
export const INSCRIPTIONS_OUVERTES = false;

export const DATE_OUVERTURE = "28 novembre 2026";

export function isAllowedSignupEmail(email: string): boolean {
  if (INSCRIPTIONS_OUVERTES) return true;
  const normalized = email.trim().toLowerCase();
  return (
    normalized === "danjouphilippe@gmail.com" ||
    (normalized.startsWith("danjouphilippe+") && normalized.endsWith("@gmail.com"))
  );
}

/** Traduit les erreurs d'inscription de Supabase, qui arrivent en
 * anglais et dans un vocabulaire d'API.
 *
 * On ne relaie jamais le message brut : « User already registered » ou
 * « For security purposes, you can only request this after 27 seconds »
 * ne veulent rien dire pour quelqu'un qui essaie juste de créer un
 * compte — et le second se produira dès l'ouverture, le service d'envoi
 * d'emails de Supabase étant sévèrement plafonné. */
export function messageErreurInscription(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "Un compte existe déjà avec cet email. Connecte-toi, ou demande un nouveau mot de passe.";
  }
  if (m.includes("password")) {
    return "Le mot de passe doit faire au moins 6 caractères.";
  }
  if (m.includes("email") && (m.includes("invalid") || m.includes("validate"))) {
    return "Cette adresse email ne semble pas valide.";
  }
  if (m.includes("for security purposes") || m.includes("rate limit") || m.includes("too many")) {
    return "Trop de tentatives d'affilée. Patiente une minute avant de réessayer.";
  }
  return "L'inscription n'a pas abouti. Réessaie dans un instant.";
}
