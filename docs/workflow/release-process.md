# Release Process

This repository is a [monorepo](../technical/monorepo.md) contains `library` packages and `application` packages. The former are meant to be published to [NPM](https://www.npmjs.com/) while the latter are meant to be published to `DockerHub`. The release process is orchestrated using [changesets](https://github.com/atlassian/changesets) will facillitate bumping versioning for both types of packages. While `library` packages' versioning strictly follows [semver](https://semver.org/), `application` packages' versioning is done in a quite different and unique fashion: we keep all the `application` packages **on the same version**, because these applications are part of the `Legend` application bundle. This version is what **defines** a release, in other words, every time we say we _cut a new release_, this version is bumped. We will go into details in the following sections:

- [Versioning](#versioning)
- [Standard releases](#standard-releases)
- [Iteration releases](#iteration-releases)
- [Recovery releases](#recovery-releases)
- [Snapshot releases (!)](<#snapshot-releases-(!)>)
- [Manual releases (!)](<#manual-releases-(!)>)

## Versioning

By `versioning` we mean how we determine the applications' version in a release. The format of the release version is `x.y.z` (e.g. `0.3.0`, `4.0.0`, `4.2.0`), where:

- Bumping the first number `x` (i.e. `major`) represents a [standard release](#standard-releases): a release that is scheduled, following a relatively fixed cycle, with `Github milestone` used for planning. e.g. 1.0.0, 2.0.0, 3.0.0, etc.
- Bumping the second number `y` (i.e. `minor`) represents an [iteration release](#iteration-releases): a release that happens between `standard releases` to provide new features/bug fixes. e.g. 1.1.0, 1.2.0, 1.3.0, etc.
- Bumping the third number `z` (i.e. `patch`) represents a [recovery release](#recovery-releases): a release, branching off from `standard releases`, that introduces exclusively bug fixes for a past `standard release`. e.g. 1.0.1, 2.0.1, 2.0.2, etc.

> Since `recovery releases` branch off `standard releases`, versions like `x.y.1` where `y !== 0` should never really exist, e.g. `1.2.1`, `1.2.2` are invalid.

[changesets/action](https://github.com/changesets/action) will accumulate all the changesets in the development cycle and keep open a PR with the code for bumping versions. **Merging this PR will conclude `versioning` process and will automatically trigger the release process**. The following sections will each type of releases cn be initiated.

## Standard releases

A `standard release` follows these specifications:

- Corresponding to a`major` version bump (e.g. 1.0.0, 2.0.0, 3.0.0)
- Being cut from the `default branch`
- Following a fixed cycle of development (typically 2 weeks to a month) planned ahead using [Github milestones](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones)
- Having a corresponding [Github release](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- Having a corresponding tag (e.g. `v2.0.0`)
- Having a corresponding `release branch` (e.g. `release/2.0.0`)

To initiate a `standard release`:

- Run the workflow [(Manual) Prepare New Release](https://github.com/finos/legend-studio/actions/workflows/manual__prepare-new-release.yml) with bump type `major`
- Merge the `Release x.0.0` PR

> ⚠️ Note: before mergining make sure the PR is up-to-date with the latest change merged, sometimes, it can take a while for this PR to get updated. Merging this PR before it gets updated could result in a failed release and we would have to re-release.

- After publishing, post-release automation will run and do some cleanups as well as prepare for the next development cycle

> Post-release procedure comprises several steps, if for some reasons, parts of the automation fails, please do these manually:
>
> - Create a tag for the release (e.g. `v4.0.0`)
> - Create a Github release (e.g. `Version v4.0.0`)
> - Create a new release branch off the latest release tag (e.g. `release/4.0.0`)
> - Move all open issues in the latest release milestone to the next release milestone. (e.g. milestone `5.0.0`)

## Iteration releases

An `iteration release` follows these specifications:

- Corresponding to a`minor` version bump (e.g. 1.1.0, 1.2.0, 1.3.0)
- Being cut from the `default branch`
- **NOT** following a fixed cycle of development
- **NOT** having a corresponding [Github release](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- **NOT** having a corresponding tag
- **NOT** having a corresponding `release branch`

To initiate a `standard release`:

- Run the workflow [(Manual) Prepare New Release](https://github.com/finos/legend-studio/actions/workflows/manual__prepare-new-release.yml) with bump type `minor`
- Merge the `Iteration Release x.y.0` PR

> ⚠️ Note: before mergining make sure the PR is up-to-date with the latest change merged, sometimes, it can take a while for this PR to get updated. Merging this PR before it gets updated could result in a failed release and we would have to re-release.

## Recovery releases

A `recovery release` is meant to patch an old `standard release` with bug fixes; therefore we hardly need to do this. It follows these specifications:

- Corresponding to a`patch` version bump (e.g. 1.0.1, 2.0.1, 2.0.2)
- Being cut from a `release branch` (e.g. `release/1.0.0`)
- **NOT** following a fixed cycle of development: often coming right after a `standard release` to path bugs
- **NOT** having a corresponding [Github release](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- **NOT** having a corresponding tag
- **NOT** having a corresponding `release branch`

To initiate a `recovery release`:

- Merge the `Recovery Release x.y.z` PR
- `cherry pick` the commits on the release branch onto the default branch. **Note: please do not merge the release branch back onto the default branch!**. To do this, you can follow [this guide](https://stackoverflow.com/a/3933416). In particular, you can cherry pick between the 2 release commit on this branch (e.g. between `1.0.0` and `1.0.1`) using Git command like `git cherry-pick A..B`, then create a PR against default branch for this. The `cherry-pick` PR name **must follow** the format `Cherry-picking changes in version $VERSION` (e.g. `Cherry-picking changes in version 4.0.0`) or else the pipeline will fail. Check out [these](https://github.com/finos/legend-studio/pull/494) [examples](https://github.com/finos/legend-studio/pull/518). Future patch releases for the same `standard release` will be done on the same release branch. For example, `4.0.2` will be done on top of `4.0.1` on branch `release/1.4.0`.

> Note that cherry-picking the patch changes back onto the default branch is a **must**, otherwise, we might risk publishing packages with the same versions on NPM when cutting releases on the `default branch`. Also, please note that since the changesets have been consumed as part of the patch release, **there should not be any changeset files added**, if the PR name follows the convention, changeset checks will be skipped, if you made a mistake, you must update the PR name and [repush](https://github.community/t/when-changing-the-pr-title-github-event-pull-request-title-wont-pick-up-the-new-title/171784/2) to skip the changeset check, re-running jobs is not enough.

## Snapshot releases (!)

Snapshot releases, created from snapshots of the `default branch`, include `development` releases which are meant only for libraries, and `snapshot/alpha/beta/rc/...` releases which are meant for applications.

- `development` releases can be triggered manually using the workflow [(Manual) NPM Snapshot Publish](https://github.com/finos/legend-studio/actions/workflows/manual__publish-npm-snapshot.yml). Published packages will be available in `dev` channel with version format `0.0.0-dev-{commitSHA}-{date}-${timestamp}` (e.g. `0.0.0-dev-a1e1e35a-20210916-1634347595932`).
- `snapshot` releases are **automated** via the workflow [Docker Snapshot Publish](https://github.com/finos/legend-studio/actions/workflows/publish-docker-snapshot.yml).
- `alpha/beta/rc/...` releases (or any releases with [semver-compliant](https://semver.org/) image tag - e.g. `1.7.0-rc.1`, `1.9.0-beta`) can be triggered manually using the workflow [(Manual) Docker Publish](https://github.com/finos/legend-studio/actions/workflows/manual__publish-docker.yml)

## Manual releases (!)

Manual releases do not refer to yet another type of release, but about how a release could be done manually when there are problems. Although each type of release has their own specification, the publishing process of them all are similar.

> :warning: NOTE: only use this for emergency release or in case the fails for some reason. We put a lot of controls around our pipeline actions to make sure the release process for libraries and applications are coordinated properly. So when you do manual releasing like this, proceed with **extreme caution**! Please make sure you know what you are doing :pray:
>
> Also note that this is done from your local machine, so you would need right to publish packages on `Docker` and `NPM`.

For **versioning**, we can run `yarn release:version` to merge all the changesets, update the `CHANGELOG.md` and bump versions in `package.json` files. For **publishing**, follow the steps below.

```sh
# ------------------------ Versioning -------------------------

# Create a GitHub personal access token at https://github.com/settings/tokens/new
# and add it as the GITHUB_TOKEN environment variable
GITHUB_TOKEN = ...

# Use changesets to do versioning: dissolve all changeset files, update the `CHANGELOG.md` and bump versions in `package.json` files
yarn release:version

# ---------------------------- NPM ----------------------------

# Build and prepare publish contents
yarn publish:prepare

# Login to NPM
npm login # or set NPM_TOKEN in the environment

# Publish to NPM
# You can also specify the publish dist tag on NPM. e.g. `next`
# See https://yarnpkg.com/cli/npm/publish
#
# Navigate to the directory where the publish content is prepared
# See the `publishConfig.directory` in package.json
# And the run the following command:
npm publish --tag <publish-tag>

# ---------------------------- Docker ----------------------------

# Assume that the project has been built, else, run `yarn build`

# Login to Docker
docker login

# Build image and publish to Docker Hub
yarn workspace @finos/legend-application-studio-deployment publish:docker
```
