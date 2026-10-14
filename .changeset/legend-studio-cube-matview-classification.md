---
'@finos/legend-application-studio': patch
---

Create MatView with Cube: Add as MatView asks for the classification of the view's data (one of the data product classifications Studio's config gives, or typed when it gives none) and its primary key, among the columns of the step that runs, and writes the data set with `privacyClassification: { sensitivity }`, the primary key and the empty lists the engine gives every data set it parses. A view without a classification failed with a NullPointerException.
