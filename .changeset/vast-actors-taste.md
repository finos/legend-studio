---
'@finos/legend-shared': patch
---

Also, users now type in the csv-decoded value (so "Hello", not """Hello"""), and we take care of csv-encoding it on the metamodel (so user types "Hello" on the RelationElement editor, and we store it as """Hello""" in the metamodel). Also, update import and exports with these new CSV parsing rules
