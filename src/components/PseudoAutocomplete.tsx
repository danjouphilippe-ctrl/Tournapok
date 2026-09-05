"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Suggestion = { id: string; pseudo: string; avatar_url: string | null };

export function PseudoAutocomplete({
  name,
  placeholder,
  className,
}: {
  name: string;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    const query = value.trim();
    if (!query) {
      setSuggestions([]);
      return;
    }

    const supabase = createClient();
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, pseudo, avatar_url")
        .ilike("pseudo", `%${query}%`)
        .limit(8);
      setSuggestions(data ?? []);
      setOpen(true);
    }, 200);

    return () => clearTimeout(timeout);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        name={name}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className ?? "input text-sm"}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-56 overflow-y-auto rounded-md border border-line bg-surface shadow-lg">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  skipNextSearch.current = true;
                  setValue(s.pseudo);
                  setSuggestions([]);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                {s.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-[10px] text-ink-soft">
                    {s.pseudo.slice(0, 1).toUpperCase()}
                  </span>
                )}
                {s.pseudo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
