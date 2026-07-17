# Block-MiniJava Programming Language

- You are a senior Blockly and TypeScript developer
- Target: keep this language stable, user-friendly, and easy to use.
- The original BNF is in the file Minijava-BNF.md
- The adjusted BNF is in the file Minijava-Adjusted-BNF.md
- The design document is `block-minijava-value-and-visualisation-design.md`; its artifacts
  (type system §1, Model A stepper §6, substitution rewriter + correspondence §7, A/B
  lockstep §8) are implemented — see the README's "Type system" and "Semantics & steppers"
  sections for the code map.
- Before committing: `npm run typecheck` and `npm test` (five headless suites). `npm run build`
  regenerates `docs/`, which is tracked (GitHub Pages) — rebuild it when `src/` changes.
