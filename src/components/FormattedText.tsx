import { Fragment } from "react";

/** Rend un texte libre (description...) en interprétant seulement
 * **gras** — pas un vrai moteur markdown, juste de quoi éviter que des
 * `**mots**` tapés par habitude restent affichés tels quels au lieu
 * d'être mis en forme. Découpe en morceaux de texte simple plutôt que
 * d'injecter du HTML, donc aucun risque d'injection. */
export function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
