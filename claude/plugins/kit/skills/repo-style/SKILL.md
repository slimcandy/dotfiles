---
name: repo-style
description: Alex's rules for personal repos and their demo sites (slimcandy/*, *.avolkov.dev). Use when creating, reviving or setting up a repo, its README, package.json, git branch, Netlify site, domain or link preview, and when checking whether a project is done.
---

# Repo style

Personal projects shown to the world, not big open source. Each gets the **smallest setup that does its job**.

## Principles

- **Minimal stack, picked per project.** Plain HTML/CSS when that's enough, a plain ES module for a small library. Vite or Preact only for a genuinely interactive app.
- **Modern JavaScript only:** ES modules, no CommonJS builds, no dual packages. TypeScript only where it's already in place or clearly pays off.
- **No ceremony:** no GitHub Actions, no CHANGELOG, no `docs/` folder, no ESLint/Prettier/Husky, no GitHub Releases.
- **Tests only where they're the point:** the code is checked against an independent judge, a reference implementation (ExifTool, react-dom, the real Tailwind compiler). One command runs them locally.
- **The README is the single source of truth** for people and agents: what it is, the live link, a screenshot, how to run it, how the tests work. No `CLAUDE.md`, `AGENTS.md`, `.cursorrules` in the repo.
- **No licence.** The code is shown, not licensed: no `LICENSE` file; in `package.json` use `"license": "UNLICENSED"`. Don't change a licence an existing repo already has without asking. npm packages are published by hand with `npm publish`.
- **Credit sources honestly** (books, articles): "I followed X, then went further with Y".

## Repo

- **Branch: `master` only**, never `main`. New repos: `git init -b master`. Existing: `gh api -X POST repos/slimcandy/<repo>/branches/main/rename -f new_name=master` (keeps redirects), check `gh api repos/slimcandy/<repo>/branches` shows no `main`, update the local clone and the Netlify build branch. Archived repos: unarchive, rename, archive again.
- Description, homepage and topics set: `gh repo edit`.
- **English only:** UI strings, examples, README, commit messages. Translate Russian text when touching a project.
- Short, imperative, user-facing commit messages ("Support iOS Dynamic Type").
- No dead `js.garden` URLs (`grep -r js.garden`).

## Demo site

- **Netlify**, one site per project, building from `master`. Domain `<sub>.avolkov.dev`: GoDaddy CNAME `<sub>` → `<site>.netlify.app`, Let's Encrypt certificate, Force HTTPS. "Built with Netlify" badge off.
- **Strict CSP**, zero console errors, checked in Chromium and WebKit.
- **Install section** after the feature demos, linked from the page navigation: requirements, numbered steps (install → import/configure → use, each a copyable code block), registry links, a line for users of older versions. An app that isn't on npm gets a "Run it" section instead.
- **Works down to iPhone SE 2 (375 × 667):** no horizontal page scroll, code blocks fit (they may bleed to the screen edges), touch targets ≥ 24 px, text readable without zooming. Rendering in real Safari via Safari MCP (`set_viewport_size` 375×667); measurements in Playwright WebKit `--device="iPhone SE (3rd gen)"` (desktop Safari here has a 14 px minimum font size, which skews widths).
- **Rich link preview (mandatory)**, model: `/Users/alex/Downloads/belgrade-taxi/index.html`.
  - `<head>`: `<title>`, `meta description`, `link rel="canonical"` (the avolkov.dev URL), `og:type`, `og:site_name`, `og:locale`, `og:url`, `og:title`, `og:description`, `og:image` (absolute, `?v=N`), `og:image:type`, `og:image:width`, `og:image:height`, `og:image:alt`, `twitter:card` = `summary_large_image`, `meta name="author"`, `og:publish_date`, `link rel="apple-touch-icon"` (180 × 180 PNG).
  - Card: 1200 × 630 sRGB JPEG made from the page's own design by a committed script, so it can be remade.
  - Verify after deploy: the image returns 200 `image/jpeg`; LinkedIn Post Inspector or a Telegram message shows the card.
- **UI from Tailwind Plus** (local copy `/Users/alex/Downloads/tailwind-plus`, Application UI v4 or Catalyst for React). Copy only the snippets a page uses; never publish them as a standalone kit. Layout, type, colour and the demo's idea are unique per project.
- **Wide-gamut colour:** accents in `oklch()` (or `color(display-p3 …)`) in `@theme`, not hex or `rgb()`. JS animations read the same tokens via `getComputedStyle`.
- Readable contrast, works with the keyboard, respects `prefers-reduced-motion`.
- **MonoLisa for monospace only on `avolkov.dev` and its subdomains** (the licence covers that one site); elsewhere the system monospace stack. Follow the private repo's README: `gh api repos/slimcandy/monolisa-font/readme -H "Accept: application/vnd.github.raw"`. Never commit the font files; add the site to its "Used by" table.

## Done

- [ ] installs and runs from a clean clone
- [ ] the judge passes, where the project has one
- [ ] live on `<sub>.avolkov.dev`
- [ ] rich link preview checked in Post Inspector or Telegram
- [ ] readable contrast, keyboard, reduced motion
- [ ] minimal README: screenshot, live link, how to run it
- [ ] description, homepage, topics set; no `js.garden`
- [ ] default branch `master`, no `main`
- [ ] Install (or Run it) section after the demos
- [ ] works at 375 × 667, checked in Safari
- [ ] on `*.avolkov.dev`: code uses MonoLisa, font files not in git, site in the "Used by" table
