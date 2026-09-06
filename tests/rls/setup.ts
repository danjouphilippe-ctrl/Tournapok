import { existsSync } from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.test.local");

if (!existsSync(envPath)) {
  throw new Error(
    "tests/rls a besoin de .env.test.local (URL + clé anon du projet Supabase de test) — " +
      "voir la conversation sur la mise en place du projet 'tournapok-test'.",
  );
}

// Node 20.6+ : charge le fichier directement dans process.env, sans
// dépendance supplémentaire.
process.loadEnvFile(envPath);

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`${key} manquant dans .env.test.local`);
  }
}

// Garde-fou : ces tests suppriment/recréent des données à chaque
// exécution. Le nom du projet de test doit être clairement différent
// du projet de production pour éviter un accident de config.
if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("fpvreyhciuqvsidgvsvp")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL dans .env.test.local pointe vers le projet de PRODUCTION. " +
      "Arrêt par sécurité — ces tests ne doivent jamais tourner contre la vraie base.",
  );
}
