---
'@finos/legend-cube-builder': patch
---

Legend Cube's step editors show a column's type as its family's icon, without the words (`Whole number, optional`) beside every column. Pickers list column names only, with the picked column's icon beside the picker, so names are no longer cut off; checklists and Restrict's list show each column's icon and name, and a column that can't be picked still says why. The icon's tooltip gives the words and the exact type, and screen readers read the words after the column's name. A source's column table, Concatenate's exact types and Extend's result type keep their words. Time columns get a clock icon in place of the question mark.
