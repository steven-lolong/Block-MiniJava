# Block-MiniJava Programming Language

- You are a senior Blockly and TypeScript developer
- Target: keep this language stable, user-friendly, easy to use, and elegant design with beautiful color that contrast for day and night view.
- The bnf is from: https://courses.cs.washington.edu/courses/cse401/22au/project/BNF-for-MiniJava.html
- The design document is `block-minijava-value-and-visualisation-design.md`; its artifacts
  (type system §1, Model A stepper §6, substitution rewriter + correspondence §7, A/B
  lockstep §8) are implemented — see the README's "Type system" and "Semantics & steppers"
  sections for the code map.
- Before committing: `npm run typecheck` and `npm test` (four headless suites). `npm run build`
  regenerates `docs/`, which is tracked (GitHub Pages) — rebuild it when `src/` changes.
