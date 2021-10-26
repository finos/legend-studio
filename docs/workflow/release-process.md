# Release Process

This is a guide on the release process of this repository. Note that this repository contains several libraries (meant to be published to `NPM`) and applications (meant to be deployable and published to `DockerHub`). For libraries' releases, we use [changesets](https://github.com/atlassian/changesets). Application releases are done in a pretty standard manner. All applications' versions are kept the similar (since we consider them all part of the same application suite) and we do a minor version bump every 2 weeks to a month--_the main focus for now is to be transparent about "what goes into the next release?" so users know the coming features as well as to enable us writing better documentation/release notes_. Patch version bumps are meant for bug fixes post a release.

We will go into details in the following sections:

- [Standard releases](#standard-releases)
- [Patch releases](#patch-releases)
- [Dev/Beta/RC releases](#dev/beta/rc-releases)
- [Release notes](#release-notes)
- [Manual release process](#manual-release-process)

## Standard releases

Our development and release process follow [Github flow](https://docs.github.com/en/get-started/quickstart/github-flow). As mentioned, the release process for libraries is backed by [changesets](https://github.com/atlassian/changesets), but the release process for applications is what we want to focus here. The highlights are:

- New features will be added to the `default branch`.
- A `standard release` is done by cutting a new release off the `default branch`.
- **All** applications' versions are kept the similar.
- For standard releases, applications' versions bump will **always** be at least `minor` bumps (e.g. `1.6.0`, `1.7.0`), `patch` bumps are only meant for [stabilizing a past standard release](#patch-releases).

The `standard release` process, in particular, goes like this:

- Release coordinators need to approve and merge `New Release` PR to create a patch release.
- After the release, coordinators must run the workflow [Prepare New Release (Manual)](https://github.com/finos/legend-studio/actions/workflows/release-prepare-manual.yml) and approve the `Prepare New Release` PR.

> Preparing a new release comprises several steps:
>
> - Create a new release branch off the latest release tag (e.g. `release/0.4.0` branch for tag `v0.4.0`).
> - Create a PR with the version bump changeset for next standard release.
> - Move all open issues in the latest release milestone to the next release milestone.

### Changesets

We use `changesets` to automate our versioning and release process via [github actions](https://github.com/changesets/action). The CI workflow comprises 2 sets of action:

- **Versioning**: It checks for presence of changesets and open a PR called `New Release` that aggregate changesets to respective package changelogs to bump package versions and their workspace dependencies in `package.json` files. Merging this PR will trigger the publish process.
- **Publishing**: It calls our script to publish new packages to NPM and Docker. After that, it picks up the published version tags and create release and tags on Github. The Github release automatically picks up changelog entries generated from the merged changesets.

## Patch releases

Patch release is meant for introducing bug fixes to a past release. After a `standard release`, release coordinators should have created a release branch corresponding to that release, for example `release/1.4.0`. Developers working on bug fixes for version `1.4.0` **must** create PRs against this branch to patch. We also use `changesets` to ochestrate the release process, so the process goes like this:

- Release coordinators need to approve and merge `New Patch Release` PR to create a patch release.
- After a new patch release is cut (e.g. `1.6.1`, `1.7.1`, `1.7.2`), release coordinator need to `cherry pick` the commits on the release branch onto the default branch. **Note: please do not merge the release branch back onto the default branch!**. To do this, you can follow [this guide](https://stackoverflow.com/a/3933416). In particular, you can cherry pick between the 2 release commit on this branch (e.g. between `1.6.0` and `1.6.1`) using Git command like `git cherry-pick A..B`, then create a PR against default branch for this. The `cherry-pick` PR name **must follow** the format `Cherry-picking changes in version $VERSION` (e.g. `Cherry-picking changes in version 0.4.0`) or else the pipeline will fail. Check out [these](https://github.com/finos/legend-studio/pull/494) [examples](https://github.com/finos/legend-studio/pull/518).
- Future patch releases for a `standard release` will be done on the same release branch. For example, `1.4.2` will be done on top of `1.4.1` on branch `release/1.4.0`.

> Note that cherry-picking the patch changes back onto the default branch is a **must**, otherwise, we might risk publishing packages with the same versions on NPM when doing a release on the default branch. Also, please note that since the changesets have been consumed as part of the patch release, **there should not be any changeset files added**, if the PR name follows the convention, changeset checks will be skipped, if you made a mistake, you must update the PR name and [repush](https://github.community/t/when-changing-the-pr-title-github-event-pull-request-title-wont-pick-up-the-new-title/171784/2) to skip the changeset check, re-running jobs is not enough.

## Dev/Beta/RC releases

> `development` releases are meant only for libraries, while `snapshot`, `beta`, and `rc` releases are restricted only to applications. Also, all of these releases are cut off the default branch.

For libraries' releases, we publish their versioned packages to [NPM](https://www.npmjs.com/).

- `development` releases can be triggered manually using the workflow [NPM Snapshot Publish (Manual)](https://github.com/finos/legend-studio/actions/workflows/npm-snapshot-publish-manual.yml). Published packages will be available in `dev` channel with version format `0.0.0-dev-{commitSHA}-{date}-${timestamp}` (e.g. `0.0.0-dev-a1e1e35a-20210916-1634347595932`).

For applications' releases, we publish their images to [DockerHub](https://hub.docker.com/).

- `Snapshot` releases are automated via the workflow [Docker Snapshot Publish](https://github.com/finos/legend-studio/actions/workflows/docker-publish-manual.yml).
- `beta`, `alpha`, `rc`, etc. releases (or any releases with `semver-compliant` tag) can be triggered manually using the workflow [Docker Publish (Manual)](https://github.com/finos/legend-studio/actions/workflows/docker-publish-manual.yml). Note, we expect the version tag to be [semver-compliant](https://semver.org/) (e.g. `1.7.0-rc.1`, `1.9.0-beta`)

## Release notes

Merging the PR `New Release` created by `changesets` will _effectively_ create a new release. This PR will have a fairly good summary of the changes that happen in the release. However, these are library changelogs and are meant for technical users (e.g. `@finos/legend-shared`, `@finos/legend-dev-utils`, etc.). For the applications, we need to create separate release notes, which are more user-friendly on our [documentation site](http://github.com/finos/legend).

> Since this repository contains `libraries` as well as `applications`, versioning can be tricky. As such, we use `changesets` to link the application packages together so that all the applications will be versioned together. This way, we could have a version of the application suite with each release, and thus, it's more clear and convenient for writing the release notes. _Also note that this is application so the versioning here does not need to follow `semver` strictly._
>
> By default, `changesets` create tags and Github release for each published library, this is appropriate since it links the version of the library with its source code. However, this accumulates and quickly create a lot of tags per release. With other projects like `babel` or `react`, all libraries _move_ versions together,
> this means that they don't bump into the same problems as ours. As such, we have decided to clean all tags and releases created by `changesets` and publish a single version on Github with a version corresponding to the version of the main application package `@finos/legend-studio-app`. Since version bump is managed automatically, it's still possible to trace Git commit corresponding to a release of each library. _In the future, we will publish this as part of the changelog of the application_.

For each new release, we should:

- Update the release note on Github for the latest tag created by the release workflow
- Add an entry in the root [CHANGELOG.md](../CHANGELOG.md) for the version of the application and the link to the documentation site

## Manual release process

> :warning: NOTE: only use this for emergency release or in case the pipeline release fails for some reason. We put a lot of controls around our pipeline actions to make sure the release process for libraries and applications are coordinated properly. So when you do manual releasing like this, proceed with **extreme caution**! Please make sure you know what you are doing :pray:
>
> Also note that this is done from your local device, so you would need `admin` access to push changes to Github as well as right to publish packages on `Docker` and `NPM`. As said, this is quite cumbersome and error-prone, therefore, we try to avoid it as much as possible.

For **versioning**, we can run `yarn version` to merge all the changesets, update the `CHANGELOG.md` and bump versions in `package.json` files. For **publishing**, follow the steps below.

```sh
# ---------------------------- NPM ----------------------------

# 1. Build and prepare publish contents
yarn publish:prepare

# 2. Login to NPM
npm login # or set NPM_TOKEN in the environment

# 3. Publish to NPM
# You can also specify the publish tag on NPM. e.g. `next`
# See https://yarnpkg.com/cli/npm/publish
npm publish --tag <publish-tag>

# ------------ Only if we need to push to Github -------------

# 3. Create a Git annotated tag for the new version
# <!> This is the version of @finos/legend-studio-app prefixed with `v`
# <!> Need to do this step if we wish to push this version to Github
git -a <version> -m <version>
git push --follow-tags

# 4. Update the release note for the version on Github

# ---------------------------- Docker ----------------------------

# Assuming the application to publish is Studio, i.e. @finos/legned-studio-deployment

# 1. Swap out the `workspace:*` in `package.json` to point
# at fixed versions.

# 2. Try to dry-build Docker image
yarn workspace @finos/legend-studio-deployment build-dry:docker

# 3. Login to Docker
docker login

# 4. Build image and publish to Docker Hub
yarn workspace @finos/legend-studio-deployment publish:docker
```
