import * as React from "react";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SearchModal — a Cmd+K command palette that searches the docs
 * site via Pagefind.
 *
 * The Pagefind index is generated at the end of `bun run build`
 * (see package.json scripts.build). It outputs JS chunks under
 * /pagefind/ in the dist directory. We load them lazily on
 * first open and cache the result.
 *
 * This is a React island; mount it from the layout with
 * `client:load` so the keyboard listener is active as soon as
 * the page is interactive.
 */

// Pagefind's runtime API is loaded on first search.
type PagefindAPI = {
  search: (query: string) => Promise<{
    results: Array<{
      id: string;
      data: () => Promise<{
        url: string;
        meta: { title: string; section?: string };
        excerpt: string;
      }>;
    }>;
  }>;
};

let pagefindPromise: Promise<PagefindAPI> | null = null;

function loadPagefind(): Promise<PagefindAPI> {
  if (pagefindPromise) return pagefindPromise;
  // Load the Pagefind runtime at runtime (not at build time). The
  // script is emitted by `pagefind --site dist` into dist/pagefind/
  // and served from the same origin. We inject a <script> tag
  // and resolve once it (and its transitive imports) have loaded.
  pagefindPromise = new Promise<PagefindAPI>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-pagefind]");
    if (existing) {
      // Already loaded or loading — poll for the global.
      const check = () => {
        const pf = (window as unknown as { pagefind?: PagefindAPI }).pagefind;
        if (pf) resolve(pf);
        else if (existing.dataset.loaded === "1") reject(new Error("Pagefind failed"));
        else setTimeout(check, 50);
      };
      check();
      return;
    }
    const script = document.createElement("script");
    script.src = "/pagefind/pagefind.js";
    script.async = true;
    script.dataset.pagefind = "";
    script.onload = () => {
      script.dataset.loaded = "1";
      const pf = (window as unknown as { pagefind?: PagefindAPI }).pagefind;
      if (pf) resolve(pf);
      else reject(new Error("Pagefind script loaded but no global found"));
    };
    script.onerror = () => reject(new Error("Failed to load Pagefind script"));
    document.head.appendChild(script);
  });
  return pagefindPromise;
}

interface Result {
  id: string;
  url: string;
  title: string;
  section?: string;
  excerpt: string;
}

export default function SearchModal() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Result[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const routerRef = React.useRef<HTMLDivElement>(null);

  // Cmd+K / Ctrl+K to open
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus the input when opening
  React.useEffect(() => {
    if (open) {
      // Tick to let the portal render
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Debounced search
  React.useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    const t = setTimeout(async () => {
      try {
        const pf = await loadPagefind();
        const search = await pf.search(term);
        const r: Result[] = await Promise.all(
          search.results.slice(0, 10).map(async (hit) => {
            const data = await hit.data();
            return {
              id: hit.id,
              url: data.url,
              title: data.meta.title ?? "Untitled",
              section: data.meta.section,
              excerpt: data.excerpt,
            };
          }),
        );
        if (!cancelled) {
          setResults(r);
          setIsLoading(false);
        }
      } catch (_err) {
        // Pagefind isn't available in dev mode (no index built).
        // Show a friendly fallback.
        if (!cancelled) {
          setResults([]);
          setIsLoading(false);
        }
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  // External trigger: the TopNav search button dispatches a custom
  // event so we can open the modal without prop-drilling.
  React.useEffect(() => {
    const onTrigger = () => setOpen(true);
    document.addEventListener("open-search", onTrigger);
    return () => document.removeEventListener("open-search", onTrigger);
  }, []);

  if (!open) return null;

  return (
    <div
      ref={routerRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[15vh]"
      onClick={(e) => {
        if (e.target === routerRef.current) setOpen(false);
      }}
    >
      <div
        className={cn(
          "bg-popover text-popover-foreground w-full max-w-xl overflow-hidden rounded-lg border shadow-2xl",
        )}
      >
        <Command label="Search docs" shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="Search the docs..."
              className="placeholder:text-muted-foreground flex h-11 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            {isLoading && (
              <div className="text-muted-foreground py-6 text-center text-sm">Searching...</div>
            )}
            {!isLoading && query.trim().length < 2 && (
              <div className="text-muted-foreground py-6 text-center text-sm">
                Type at least 2 characters to search.
              </div>
            )}
            {!isLoading && results.length === 0 && query.trim().length >= 2 && (
              <Command.Empty className="py-6 text-center text-sm">
                No results for "{query}".
              </Command.Empty>
            )}
            {results.length > 0 && (
              <Command.Group heading="Results">
                {results.map((r) => (
                  <Command.Item
                    key={r.id}
                    value={r.url}
                    onSelect={() => {
                      window.location.href = r.url;
                    }}
                    className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer rounded-sm px-2 py-2 text-sm"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {r.section && (
                          <span className="text-muted-foreground mr-2 text-xs">{r.section}</span>
                        )}
                        {r.title}
                      </span>
                      <span
                        className="text-muted-foreground line-clamp-2 text-xs"
                        dangerouslySetInnerHTML={{ __html: r.excerpt }}
                      />
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
