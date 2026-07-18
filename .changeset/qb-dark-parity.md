---
'@finos/legend-query-builder': patch
---

Restore Query Builder dark-theme colors to their pre-tokenization values
(regression from #5299). The tokenization sweep had shifted ~330 declarations
to canonical token shades — muted text became brighter, tree connector lines
went from light to dark, error reds / accent blues / chip and header greys all
moved. 226 declarations are restored to their exact original dark values:
mis-mapped surface/border tokens swapped to value-preserving tokens, and
colors with no matching token (legacy muted greys, connector-line lights,
error reds, accent blues, category colors) reverted to their original palette
values. The ~100 remaining differences are imperceptible single-notch shifts
(delta <= 19/255) kept to avoid regressing the light theme, plus the
previously-fixed undefined-variable bugs.
