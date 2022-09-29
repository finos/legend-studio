# Modality

`Modality` is a design technique that presents content in a temporary mode that’s separate from the user's previous current context and requires an explicit action to exit. Presenting content modally can:

- Help people focus on a self-contained task or set of closely related options
- Ensure that people receive and, if necessary, act on critical information

Notes:

- Use `modality` when it makes sense: _Generally, people prefer to interact with apps in nonlinear ways. Consider creating a modal context only when it’s critical to get someone’s attention, when a task must be completed or abandoned to continue using the app, or to save important data._
- Always include a button that dismisses the modal view.
- When necessary, help people avoid data loss by getting confirmation before closing a modal view.
- In general, display a title that identifies the modal task.

Read more:

- [Apple - Human Interface Guidelines: Modality](https://developer.apple.com/design/human-interface-guidelines/ios/app-architecture/modality/)
- [Medium: Modality Is the One UX Concept That Most Designers Don’t Fully Understand](https://uxplanet.org/modality-the-one-ux-concept-you-need-to-understand-when-designing-intuitive-user-interfaces-e5e941c7acb1)

## Modal vs. Non-modal

Non-modal (or `modeless`) components are part of the main app: they do not appear on top of the current app like modal components. For example:

1. `non-modal screens` allow users to simply go back to parent screen (with `Back` button), unlike the `modal screens` which require users to complete an action before returning to the main window (“save” in our example) or cancel the current action.
2. `non-modal dialogs` do not disable the main content: showing the dialog box doesn’t change the functionality of the user interface. The user can continue interacting with the main content. e.g. the `Compose New Mail` in Google Mail

Therefore, we actually use a combination of `non-modal` and `modal` components a lot in our app without knowing all this formalities

Read more:

- [NNGroup: Modal & Nonmodal Dialogs: When (& When Not) to Use Them](https://www.nngroup.com/articles/modal-nonmodal-dialog/#:~:text=In%20situations%20where%20the%20task,them%20if%20they%20are%20irrelevant.)
- [Medium: Modality Is the One UX Concept That Most Designers Don’t Fully Understand](https://uxplanet.org/modality-the-one-ux-concept-you-need-to-understand-when-designing-intuitive-user-interfaces-e5e941c7acb1)

## Modal Components Classification and Usage Guidelines

[Material-UI](https://material-ui.com/) created an interesting inheritance hierarchy between their components: `Modal < Popover < Menu` and `Modal < Dialog`, but this hierarchy is purely for functional purpose, conceptually, things like `Tooltip` and `Banner` should also be considered modal. [Visual Studio Code: Command Pallete](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) is also modal. As such, the classification of these various modal components is important.

Read more:

- [Google - Material Design: Dialog](https://material.io/components/dialogs)
- [UX Collective: Pop-up, popover or popper? — a quick look into UI terms](https://uxdesign.cc/pop-up-popover-or-popper-a-quick-look-into-ui-terms-cb4114fca2a)
- [Apple - Human Interface Guidelines: Popovers](https://developer.apple.com/design/human-interface-guidelines/ios/views/popovers/)

### Dialog

(persistent, high priority) dialogs block app usage until the user takes a dialog action or exits the dialog (if available).

- Simple Dialog: these dialogs are used to host more complex form (i.e. more than 1 input) as compared to `non-modal`. For this, the current design is to have title in form of a meaningful sentence, e.g. `Build your service`, as such the title will be in `Sentence case`. We should also have a way to `cancel/dismiss` this dialog (upper corner (x) button should do it, and probably allowing to dismiss using `Esc` key and backdrop click). Also for this kind of dialogs, it usually have a footer with some actions, such as `Create`.
- Fullscreen Dialog: these dialogs are used to host mini-app, or fairly complex logic, or for viewing complicated entities (not ideal). The word `fullscreen` can be rather misleading (though generally these complex modal requires large modal), but we generally do not want to have the dialog started out full-screen; we should leave a padding so the user knows its a dialog and give them an option to `maximize` the modal (though this is totally up to the use case). The title should be in `Title Case`, such as `Query Builder`, `Configure Runtime`.

Notes:

- Try to make dialog less disruptive by keeping it simple and by properly re-adjust focus to the first actionable item in the dialog.
- Double-dialogs (or overlapping dialogs) should be discouraged as it makes the app feel complicated and forces the user to divert too far from the main app. Exceptions for this are miniapps which are hosted in a dialog, or very complicated fullscreen dialogs, or alerts appearing on top of dialog (but in generally, we should avoid this too).
- Always make sure to have at least one action in the modal (e.g. `About` dialog should have a button `Ok`): Make it explicit that there's a way to close the dialog, if there are data, make sure to notify if user lose data as they leave the dialog. NOTE: there are times when there is no action to take (this actually happens quite frequently in our app since we auto-save as people make changes) and the only thing for use to do is to close the modal after finish editing, consider to have one action like `Done (check icon)`, when hovering above the button, we can give a prompt to notify the user that the changes take effect as they edit, e.g. `(tick) Changes take effect as you edit`.
- When there are multiple actions, dismissive actions (e.g. `Cancel`) are always on the left.

### Alert

(prominent, high priority) Alerts are technically dialogs, but their usage is very specific in that it demands immediate attention. The key difference between this and `banner` is that this is confirmation is caused by an user action.

Since it is only ideal to show one alert at a time, we have a central place in the app where we dispatch command to show alert. Naturally, our styling is consistent here. For `alert`, the title is usually a question `Delete element?`, try to avoid vague questions like `Are you sure` or too detailed questions like `Are you sure you want to leave the app now?`. The details should be left for the prompt text following title. Also, notice that the title here will be in `Sentence case`.

Sometimes, the alert can prompt for confirmation, in such case, we prefer to have clear action button labels like `Proceed anyway` or `Delete File` instead of vague wording like `Yes`, `No`. Also, make sure the default option is the one that demands the least amount of caution in nature (e.g. `Cancel`, `Abort`) and the actions that demand great caution are highlighted properly--this is to prevent user from accidentally commit to latter

### Popup

A popup (or pop-up) is a modal view that can either take form as a pop-up menu or a pop-up dialog. The term popup is often not mentioned in official design doc as it's not specific enough. However, there's a nuance here: `popup menu` implies the menu is treated as a modal. To certain systems, such as `Material-UI`, it means `Menu` inherits `Modal` and thus it has a backdrop, when user clicks outside of the menu (e.g. dropdown menu, context menu), they cannot directly click on the element beneath the backdrop, but will trigger a clickaway event that in turn closes the menu; other system might treat `menu` as `non-modal`.

### Banner

(prominent, medium priority) Banners remain until dismissed by the user, or if the state that caused the banner is resolved (note that banner can appear in various location, e.g. below header, above footer). The key difference between this and `notification` is that it is persistent and does not track a process, but rather some state of the app (i.e. `connectivity`, `authorization`, `system announcement`)

### Tooltip

Tooltips display informative text when users hover over, focus on, or tap an element. Therefore, we try to avoid putting interactive elements inside a tooltip. Persistent tooltip that lingers after clicking on triggers (not when hovering on the content of the tooltip) can cause UI issues especially with scrolling.

For `tooltip`, only use a customized `<Tooltip>` component when the information is complex in nature and needs more sophisticated styling. Most of the time though, this prompt/info text is just a setence; for these cases, use HTML \<button\> `title` attribute.

### Notification

(temporary, low-priority) `Notifications` provide brief messages about app processes at the bottom of the screen. They tend to be temporarily but it's good to use notification to in form users about process or outcome of processes like failure or success (majorly for the former).

### Popover

A popover is a transient view that appears above other content onscreen when you tap a control or in an area. It can be thought of as `tooltip on steroid`, or `tooltip with interaction`. The need for popovers usually arises when we have a very complicated form view which requires a lot of fine-tuning editing interactions, e.g. diagram viewer, calendar/scheduling view.

We generally want to avoid this due to challenge with scrolling behavior, but library like [Popper.js](https://popper.js.org/) and `Material-UI` have nice way to address this.
