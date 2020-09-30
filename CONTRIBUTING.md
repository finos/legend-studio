# Legend Contribution and Governance Policies

This document describes the contribution process and governance policies of the FINOS {project name} project. The project is also governed by the [Linux Foundation Antitrust Policy](https://www.linuxfoundation.org/antitrust-policy/), and the FINOS [IP Policy](IP-Policy.pdf), [Code of Conduct](Code-of-Conduct.md), [Collaborative Principles](Collaborative-Principles.md), and [Meeting Procedures](Meeting-Procedures.md).

## Contribution Process

Before making a contribution, please take the following steps:
1. Check whether there's already an open issue related to your proposed contribution. If there is, join the discussion and propose your contribution there.
2. If there isn't already a relevant issue, create one, describing your contribution and the problem you're trying to solve.
3. Respond to any questions or suggestions raised in the issue by other developers.
4. [Fork the project repository](https://github.com/finos/legend-studio/fork) and prepare your proposed contribution.
5. Submit a pull request.

NOTE: All contributors must have a contributor license agreement (CLA) on file with FINOS before their pull requests will be merged. Please review the FINOS [contribution requirements](https://finosfoundation.atlassian.net/wiki/spaces/FINOS/pages/75530375/Contribution+Compliance+Requirements) and submit (or have your employer submit) the required CLA before submitting a pull request.

## Contributing Issues

### Prerequisites

* [ ] Have you [searched for duplicates](https://github.com/finos/legend-studio/issues?utf8=%E2%9C%93&q=)?  A simple search for exception error messages or a summary of the unexpected behaviour should suffice.
* [ ] Are you running the latest version?
* [ ] Are you sure this is a bug or missing capability?

### Raising an Issue
* Create your issue [here](https://github.com/finos/legend-studio/issues/new).
* New issues contain two templates in the description: bug report and enhancement request. Please pick the most appropriate for your issue, **then delete the other**.
  * Please also tag the new issue with either "Bug" or "Enhancement".
* Please use [Markdown formatting](https://help.github.com/categories/writing-on-github/)
liberally to assist in readability.
  * [Code fences](https://help.github.com/articles/creating-and-highlighting-code-blocks/) for exception stack traces and log entries, for example, massively improve readability.

## Contributing Pull Requests (Code & Docs)
To make review of PRs easier, please:

 * Please make sure your PRs will merge cleanly - PRs that don't are unlikely to be accepted.
 * For code contributions, follow the existing code layout.
 * For documentation contributions, follow the general structure, language, and tone of the [existing docs](https://github.com/finos/legend-studio/wiki).
 * Keep commits small and cohesive - if you have multiple contributions, please submit them as independent commits (and ideally as independent PRs too).
 * Reference issue #s if your PR has anything to do with an issue (even if it doesn't address it).
 * Minimise non-functional changes (e.g. whitespace).
 * Ensure all new files include a header comment block containing the [Apache License v2.0 and your copyright information](http://www.apache.org/licenses/LICENSE-2.0#apply).
 * If necessary (e.g. due to 3rd party dependency licensing requirements), update the [NOTICE file](https://github.com/finos/legend-studio/blob/master/NOTICE) with any new attribution or other notices

### Commit and PR Messages

* **Reference issues, wiki pages, and pull requests liberally!**
* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move button left..." not "Moves button left...")
* Limit the first line to 72 characters or less

## Markers

One of the major use case of Studio is to add support for new types, we are in the process of modularizing the app so that we can support extenions, but for now, we rely on the convention that one should look for places with marker `@MARKER: NEW ELEMENT TYPE SUPPORT` to add support for new element type.

There are places that we do smart analytics similar to what the compiler does in the backend in order to provide smart-suggestion and improving UX; anywhere where these analytics have been done we will mark with `@MARKER: ACTION ANALYTICS`.

## Component Organization

We try to be explicit when naming components (and files in general) so we can easily look up a file globally instead of having to know its location.

We also avoid using `index.ts(x)`

We tend to have a couple of components within one file. This is technically not bad, however, due to the fact that we are using [react-refresh](https://reactnative.dev/docs/fast-refresh) (or `Fast Refresh`) sometimes it's better to not load up many components per file. In particular, let's say we have:

```typescript
// file A.tsx

const ComponentA = () => { ... }
const ComponentB = () => {
  ...
  useEffect(...)
  ...
}
```

If we edit `ComponentA` since `react-refresh` re-render all components from the same module file, `ComponentB` `useEffect` [will be called again](https://reactnative.dev/docs/fast-refresh#fast-refresh-and-hooks). If this `useEffect` contains critical flow in the app that does not allow another call (for example, initializing a singleton) then refreshing the app with `react-refresh` will throw error. Obviously the most straight-forward way is to have each component in a separate file, but sometimes that will pollute the codebase. Hence, be mindful where you place your components.

## Typescript

Needless to say, let's avoid using `any`

Second, it is quite important to understand that Typescript is a [structural type system](https://github.com/microsoft/TypeScript/wiki/FAQ#what-is-structural-typing) rather than a nominal type system,
this means that an empty class/interface are considered to be supertype of everything and will not warn us about any type error. For example:

```javascript
class AbstractType {}
class SomeElement {
  type: AbstractType;

  setType(): void {
    this.type = 1; // this will not be type-checked properly
  }
}
```

As such, we should try our best to not create empty classes. This usually happen when we create abstract classes so that we can have multiple sub-classes declared.

NOTE that an empty class that extends a non-empty class will not get into this problem

## Governance

### Roles

The project community consists of Contributors and Maintainers:
* A **Contributor** is anyone who submits a contribution to the project. (Contributions may include code, issues, comments, documentation, media, or any combination of the above.)
* A **Maintainer** is a Contributor who, by virtue of their contribution history, has been given write access to project repositories and may merge approved contributions.
* The **Lead Maintainer** is the project's interface with the FINOS team and Board. They are responsible for approving [quarterly project reports](https://finosfoundation.atlassian.net/wiki/spaces/FINOS/pages/93225748/Board+Reporting+and+Program+Health+Checks) and communicating on behalf of the project. The Lead Maintainer is elected by a vote of the Maintainers. 

### Contribution Rules

Anyone is welcome to submit a contribution to the project. The rules below apply to all contributions. (The key words "MUST", "SHALL", "SHOULD", "MAY", etc. in this document are to be interpreted as described in [IETF RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).)

* All contributions MUST be submitted as pull requests, including contributions by Maintainers.
* All pull requests SHOULD be reviewed by a Maintainer (other than the Contributor) before being merged.
* Pull requests for non-trivial contributions SHOULD remain open for a review period sufficient to give all Maintainers a sufficient opportunity to review and comment on them.
* After the review period, if no Maintainer has an objection to the pull request, any Maintainer MAY merge it.
* If any Maintainer objects to a pull request, the Maintainers SHOULD try to come to consensus through discussion. If not consensus can be reached, any Maintainer MAY call for a vote on the contribution.

### Maintainer Voting

The Maintainers MAY hold votes only when they are unable to reach consensus on an issue. Any Maintainer MAY call a vote on a contested issue, after which Maintainers SHALL have 36 hours to register their votes. Votes SHALL take the form of "+1" (agree), "-1" (disagree), "+0" (abstain). Issues SHALL be decided by the majority of votes cast. If there is only one Maintainer, they SHALL decide any issue otherwise requiring a Maintainer vote. If a vote is tied, the Lead Maintainer MAY cast an additional tie-breaker vote.

The Maintainers SHALL decide the following matters by consensus or, if necessary, a vote:
* Contested pull requests
* Election and removal of the Lead Maintainer
* Election and removal of Maintainers

All Maintainer votes MUST be carried out transparently, with all discussion and voting occurring in public, either:
* in comments associated with the relevant issue or pull request, if applicable;
* on the project mailing list or other official public communication channel; or
* during a regular, minuted project meeting.

### Maintainer Qualifications

Any Contributor who has made a substantial contribution to the project MAY apply (or be nominated) to become a Maintainer. The existing Maintainers SHALL decide whether to approve the nomination according to the Maintainer Voting process above.

### Changes to this Document

This document MAY be amended by a vote of the Maintainers according to the Maintainer Voting process above.