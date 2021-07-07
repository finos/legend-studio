---
'@finos/legend-studio': patch
'@finos/legend-studio-manual-tests': patch
---

Fixed association mapping source key omission:
ex:
engine wouldn't parse the following snippet (fix open here: [engine-#300](https://github.com/finos/legend-engine/pull/301))

and we need to retain the <b>source</b> information for each property on studio to contstruct the protocol JSON and remove hashing issues

```
model::FirmPerson: Relational
  {
    AssociationMapping
    (
      firm[model_Person, model_Firm]: [model::Test]@FirmPerson,
      employee[model_Firm, model_Person]: [model::Test]@FirmPerson
    )
  }
```
