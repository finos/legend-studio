# Collaborator responsibilities

> This is an overview of the responsibilities expected from collaborators who are part of the organization maintaining this project, if you are not part of this group, this is probably irrelevant to you

There are 4 main roles for people working on this repository, and each comes with their own set of responsibilities.

- **[Maintainers](#maintainers)**: people who maintain the project, who can merge PRs
- **[Release coordinators](#release-coordinators)**: people who monitor, keep track, and do the actual release
- **[Developers](#developers)**: people who actually implement the feature, bug fixes, etc.
- **[Reviewers](#reviewers)**: people review PRs

## Maintainers

The most important thing to pay attention to as maintainers is when merging PRs, please make sure to always use the `squash` merging strategy, _unless requested to do otherwise and the commit list seems sensible and do not pose risk of polluting the default branch history_.

## Release coordinators

- Do release planning (at the moment, we can't guarantee a fixed release cycle, but one usually lasts around 2 weeks to a month), _the main focus for now is to be transparent about "what goes into the next release?" so users know the coming features as well as to enable us to write better documentation/release notes_.
- Work with `developers` to add relavent issues to the milestone and assign them accordingly.
- When PR are submitted against the release branch, coordinators need to check if these need documentation or not: new feature and interface change almost always guarantee documentation change, bug fixes, if notable also require documentation.
- Communicate about the timeline and progress with `developers` and `reviewers`.
- Carry out the actual release:
  - Merge the auto-generated release PRs to cut new releases (see [example](https://github.com/finos/legend-studio/pull/576))
  - Before a `standard release` or an `iteration release`, run the workflow [(Manual) Prepare New Release](https://github.com/finos/legend-studio/actions/workflows/manual__prepare-new-release.yml) and merge the new release version bump changeset PR.
  - After a `standard release`, update the Github release to point at the `release notes` for the new release.
  - After a `recovery release`, `cherry-pick` the changes from the release branch back on to the default branch to keep the development branch up to date.

> Learn more in-depth about the release process and post-release tasks of the release coordinators in [this guide](./release-process.md).

## Developers

- When working on a bug fix:
  - If there is no issue filed for the bug, please create one with a **minimal** reproducible test case and make sure to mention this issue in your PR and `changeset` of your PR..
  - Remember that `changeset` is meant to be brief, you don't really need to add a full post-mortem, instead, put that in the description of the PR
  - If this is a notable bug, please add it to the release note and link the documentation PR to your PR
- When working on a new feature:
  - If there is no issue filed for the feature, and you are just start thinking about what you need to do or need to discuss with other on your plan, please create a new `Feature Request` with detailed implementation steps, this would be used to keep track of the progress of your work using [tasks list](https://docs.github.com/en/issues/tracking-your-work-with-issues/about-task-lists).
  - Add documentation with `screenshots` and `GIFs` and link the documentation PR to your PR.

> If you plan to work on some enhancement, refactoring or plan to make **substantial** code changes with your new feature, instead of filing a new `Feature Request`, file a `Request for Comments (RFC)` instead. Use `RFC` as the place you gather feedback on your idea and implementation plan, to build up good design documentations.
>
> _Compared to [others](https://github.com/reactjs/rfcs#what-the-process-is), we have a really simplified process for filing `RFCs`, so please don't misuse them for what in fact should have been feature requests._

## Reviewers

- Make sure the change has proper `changeset`: please be strict here, there are changes that do not require any changeset at all, but because of our convention, we will needto cover code changes with an empty `changeset`. As such, please remind the developers to break down their changesets properly.
- Pay attention to the branch the PR is trying to merge into, if the PR is a bug fix for a past release, the base branch **must be** the corresponding release branch.
- Be vigilant when you see new dependencies introduced, refer to [our guide for dependencies](./dependencies).
- When reviewing an interface change or a new feature, please check and verify how the feature look and work. This is tricky even with tests, so thank you so much for doing this :pray:.
