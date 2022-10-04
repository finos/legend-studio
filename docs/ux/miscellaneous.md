## Ellipses

Understand when ellipses are needed when labeling commands, prompts, and button titles. Read more from [Microsofts Windows Design Guideline](https://docs.microsoft.com/en-us/windows/win32/uxguide/cmd-menus) and see this [discussion](https://stackoverflow.com/questions/637683/when-to-use-ellipsis-after-menu-items).

- Put `ellipses` after command text when the menu triggered by this command requires additional information (input or a selection) before it carries out the operation, e.g. `Search`, (non-example: `About`, `Help`)
- `ellipses` should be used to indicate wait, e.g. `Loading...`
- As input placeholder text, we decide to NOT use `ellipses` at the end, for example: `Search...`
- Side note: `ellipses` for styling should be used whenever possible for truncated text

## Letter Casing

Understand the differences between `ALL CAPS CASE`, `Title Case`, and `Sentence case`. Read more from [these](https://uxplanet.org/why-letter-casing-is-important-to-consider-during-design-decisions-50402acd0a4e) [discussions](https://medium.com/@jsaito/making-a-case-for-letter-case-19d09f653c98).

- `ALL CAPS CASE` sometimes can be used purely for visual purpose, but also for emphasis, the latter we should really be careful not to abuse.
- `Title Case` should only be used for title, command and button labels; it's has some emphasis to it, as well as nice symmetry, but harder to read for long sentences. A controversial case is button command, for example, Microsofts would favor `Clear all notifications` whereas Apple would favor `Clear All Notifications`, we choose to follow the latter style. In short, we will use `Title Case` for button title, command.
- `Sentence case` (or normal mixed case) should be used for longer text like instructions, prompt texts, etc.

## Panel/List Placeholder

- Do not leave empty panel or empty list blank, it creates confusion and waste screen real-estate. Instead, show something like `Click to choose something...` or `Drop element here to start`, `Add a new item...`, etc. In read-only mode, show indicator like `No property`, `Source is not set`. We have built some components for these use-case which container resize-aware capability, we should leverage these as much as possible.

## Tooltip on flip-flop button/toggler

When we have a button that toggles a state, e.g. `Show/Hide username`, `Toggle flag`, but does not come with a label to describe its current state, it's helpful to add a tooltip, but what should we say in the tooltip? Should we try to describe the result action, e.g. `Mark as Favourite / Remove Favourite`, or should we describe the current state `Not saved as Favourite / Saved as Favourited`? We think it's clearest in these situation to do something like this `[on|off] Toggle mark as Favourite`.

## Button label

_TBD_ (what kind of label should we use for toggler?)
