---
'legend-studio': patch
---

**Enforce Consistent MUI Package Versions via Resolutions**

**Summary**: Updated the `resolutions` field in the root `package.json` to enforce consistent versions for MUI packages across the monorepo, addressing minor version discrepancies that could lead to type inconsistencies or runtime issues.

**Details**:

- **@mui/system**: Forced to version **7.3.6** (from a mix of 7.3.3 and 7.3.6 in the current branch). This ensures all dependencies use the latest minor version available in the dependency graph, reducing the risk of behavioral differences due to patch-level variations.
- **@mui/types**: Forced to version **7.4.9** (from a mix of 7.4.9 and 7.2.24). This prevents potential type definition conflicts by ensuring all packages reference the same, most recent type declarations.
- **@mui/utils**: Forced to version **7.3.6** (from a mix of 7.3.6 and 6.4.9). This avoids API mismatches by standardizing on the latest version, ensuring consistent utility function behavior across the project.

**Why This Is Safe**:

- The enforced versions (7.3.6 for `@mui/system` and `@mui/utils`, 7.4.9 for `@mui/types`) are already present in the dependency graph of the current branch, indicating they are compatible with at least some parts of the monorepo. By standardizing on these versions, we reduce variability without introducing entirely new dependencies.
- These changes align with the versions used in the `finos-master` branch for the primary listings, ensuring continuity with the baseline. The resolutions only address secondary, older versions that were being pulled in due to inconsistent dependency specifications.
- MUI packages within the same major version (7.x) are generally backwards compatible across minor and patch updates, minimizing the risk of breaking changes. The enforced versions are minor updates over the alternatives, which typically include bug fixes and improvements rather than breaking API changes.
- This change does not alter the peer dependency mismatch issue with `@mui/x-date-pickers` (expecting `@mui/material` and `@mui/system` in 5.x or 6.x range), which exists in both branches and requires a separate resolution strategy. It focuses solely on stabilizing the resolved versions within the current major version.

**Impact**: This update will modify the `yarn.lock` file upon running `yarn install`, ensuring all packages in the monorepo resolve to the specified MUI versions. This should mitigate type resolution issues and reduce warnings related to version mismatches in the dependency tree.
