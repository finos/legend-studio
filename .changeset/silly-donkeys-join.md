---
'@finos/legend-application': major
---

**BREAKING CHANGE:** Reworked `ApplicationNavigator` completely: it nolonger genericize on the type of location, rather, location now has a fixed shape (which for simplification purpose. is `string` for now); the methods are now reorganized to be more self-explanatory; support for navigation blocking is also added, with the pair of method `blockNavigation()/unblockNavigation()`, the former of which receives a list of checkers for when to enable blocking as well as an event handler when blocking occurs.
