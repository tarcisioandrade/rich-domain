---
"@woltz/rich-domain": minor
---

Rename `lockMutationsWhenInvalid` to `persistInvalidMutations` (inverted semantics: `true` = dirty / form mode, default).

When `throwOnError` is `false` and `persistInvalidMutations` is `true` (default), failed schema or `rules` updates keep mutated values and `validationErrors` reflects the full current props (schema + rules). Set `persistInvalidMutations: false` to freeze the entity while invalid and revert failed updates.
