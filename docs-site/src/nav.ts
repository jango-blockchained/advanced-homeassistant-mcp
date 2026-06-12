/**
 * Sidebar navigation config.
 *
 * Each section maps to a group in the sidebar. Pages are referenced
 * by their `slug` (the file path under `src/content/docs/` without
 * the `.mdx` extension). The `label` overrides the page's `title`
 * for the sidebar entry, and `external` opens a new tab.
 *
 * The order of pages inside a section is the array order; sections
 * themselves are also ordered by their position in this array.
 */
export interface NavItem {
  label: string;
  slug: string;
  external?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { label: "Introduction", slug: "getting-started/introduction" },
      { label: "Installation", slug: "getting-started/installation" },
      { label: "First Connection", slug: "getting-started/first-connection" },
      { label: "Connect Your AI", slug: "getting-started/connect-your-ai" },
    ],
  },
  {
    title: "Architecture",
    items: [
      { label: "Overview", slug: "architecture/overview" },
      { label: "Entry Points", slug: "architecture/entry-points" },
      { label: "Tool System", slug: "architecture/tool-system" },
      { label: "HA Client", slug: "architecture/ha-client" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Environment", slug: "configuration/environment" },
      { label: "Authentication", slug: "configuration/authentication" },
      { label: "Tools", slug: "configuration/tools" },
    ],
  },
  {
    title: "Tools Reference",
    items: [
      { label: "HA Tools", slug: "tools/ha-tools" },
      { label: "Generic Tools", slug: "tools/generic-tools" },
    ],
  },
  {
    title: "Deployment",
    items: [
      { label: "HTTP+WS", slug: "deployment/http" },
      { label: "STDIO", slug: "deployment/stdio" },
      { label: "Smithery", slug: "deployment/smithery" },
    ],
  },
  {
    title: "Reference",
    items: [
      { label: "Environment Variables", slug: "reference/environment-variables" },
      { label: "MCP Protocol", slug: "reference/mcp-protocol" },
      { label: "API Errors", slug: "reference/api-errors" },
    ],
  },
  {
    title: "Guides",
    items: [
      { label: "Adding a Tool", slug: "guides/adding-a-tool" },
      { label: "Testing", slug: "guides/testing" },
      { label: "Speech Features", slug: "guides/speech-features" },
    ],
  },
];

/** GitHub URL used by the top nav. */
export const REPO_URL = "https://github.com/jango-blockchained/advanced-homeassistant-mcp";
