---
'@finos/legend-graph': patch
---

Function test suite test data (`FunctionTestSuite.testData` / `V1_FunctionTestSuite.testData`) is now modelled as `DataResolver`s (`BaseDataResolver` / `ReferenceDataResolver`). Legacy function test data (`packageableElementPointer` or `store`) is deserialized to `BaseDataResolver`, and `BaseDataResolver` is still serialized in that legacy shape so engines without data resolver support for function tests keep working; `ReferenceDataResolver` uses the data resolver protocol shape. `observe_DataResolver` moves to `DSL_Data_ObserverHelper` (still exported).
