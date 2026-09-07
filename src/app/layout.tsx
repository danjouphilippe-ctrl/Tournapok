import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AppMain, AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import { AUCUNE_NOTIFICATION, getNotificationCounts } from "@/lib/notifications";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TournaPok",
  description: "Gère tes tournois de poker Texas Hold'em.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  /* La navigation vit ici plutôt que dans chaque page : c'est le seul
   * endroit qui enveloppe tout le site. Elle se retire elle-même des
   * écrans qui ne doivent pas en porter (connexion, affichage de
   * salle), en lisant le chemin côté client. */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, notifications] = user
    ? await Promise.all([
        supabase.from("profiles").select("pseudo").eq("id", user.id).single(),
        getNotificationCounts(supabase, user.id),
      ])
    : [null, AUCUNE_NOTIFICATION];

  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {user && (
          <AppNav pseudo={profile?.data?.pseudo ?? null} notifications={notifications.total} />
        )}
        <AppMain>{children}</AppMain>
      </body>
    </html>
  );
}
