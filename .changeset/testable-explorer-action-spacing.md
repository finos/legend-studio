---
'@finos/legend-application-studio': patch
---

Fix cramped spacing in testable test explorers (mapping tests, function tests):
the run/stop action buttons nested inside a test row's label rendered flush
against the test name; they are now pushed to the right edge of the row with a
minimum gap, and long test names ellipsize instead of pushing the buttons out.
