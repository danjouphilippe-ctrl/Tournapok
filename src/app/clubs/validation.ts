import type { ParsedClubFields } from "./actions";

/** Pure, non extraite dans "actions.ts" car un fichier "use server" ne
 * peut exporter que des fonctions async (toute exportation y devient
 * une Server Function) — voir node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md. */
export function parseClubFields(formData: FormData): ParsedClubFields {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  const legalForm = String(formData.get("legal_form") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "private");

  if (!name) {
    return { ok: false, error: "Le club doit avoir un nom." };
  }
  if (!["public", "private"].includes(visibility)) {
    return { ok: false, error: "Visibilité invalide." };
  }

  return {
    ok: true,
    row: {
      name,
      description: description || null,
      location: location || null,
      logo_url: logoUrl || null,
      legal_form: legalForm || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      visibility,
    },
  };
}
