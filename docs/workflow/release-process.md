# Release Process

This repository is a [monorepo](../technical/monorepo.md) contains `library` packages and `application` packages. The former are meant to be published to [NPM](https://www.npmjs.com/) while the latter are meant to be published to `DockerHub`. The release process is orchestrated using [changesets](https://github.com/atlassian/changesets) will facillitate bumping versioning for both types of packages. While `library` packages' versioning strictly follows [semver](https://semver.org/), `application` packages' versioning is done in a quite different and unique fashion: we keep all the `application` packages **on the same version**, because these applications are part of the `Legend` application bundle. This version is what **defines** a release, in other words, every time we say we _cut a new release_, this version is bumped. We will go into details in the following sections:

- [Versioning](#versioning)
- [Standard releases](#standard-releases)
- [Iteration releases](#iteration-releases)
- [Patch releases](#patch-releases)
- [Snapshot releases (!)](<#snapshot-releases-(!)>)
- [Manual releases (!)](<#manual-releases-(!)>)

## Versioning

By `versioning` we mean how we determine the applications' version in a release. The format of the release version is `x.y.z` (e.g. `0.3.0`, `4.0.0`, `4.2.0`), where:

- Bumping the first number `x` (i.e. `major`) represents a [standard release](#standard-releases): a release that is scheduled, following a relatively fixed cycle, with `Github milestone` used for planning. e.g. 1.0.0, 2.0.0, 3.0.0, etc.
- Bumping the second number `y` (i.e. `minor`) represents an [iteration release](#iteration-releases): a release that happens between `standard releases` to provide new features/bug fixes. e.g. 1.1.0, 1.2.0, 1.3.0, etc.
- Bumping the third number `z` (i.e. `patch`), always as a prerelease, represents a [patch release](#patch-releases): a release, branching off any past `standard` or `iteration` release, that introduces exclusively bug fixes for it. e.g. 13.281.1-patch.0, 13.281.1-patch.1, 14.0.1-patch.0, etc.

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
- Having a corresponding tag (e.g. `v13.282.0`)
- **NOT** having a corresponding `release branch`: one is created when the release needs a [patch](#patch-releases)

To initiate an `iteration release`:

- Run the workflow [(Manual) Prepare New Release](https://github.com/finos/legend-studio/actions/workflows/manual__prepare-new-release.yml) with bump type `minor`
- Merge the `Iteration Release x.y.0` PR

> ⚠️ Note: before mergining make sure the PR is up-to-date with the latest change merged, sometimes, it can take a while for this PR to get updated. Merging this PR before it gets updated could result in a failed release and we would have to re-release.

## Patch releases

> Before patching, roll forward if you can: merge the fix into the `default branch` and cut the next [iteration release](#iteration-releases). If a deployment is broken right now, redeploy the previous release's Docker image (e.g. `finos/legend-studio:13.281.0`) while the fix rolls forward. Patch only when a deployment needs the fix but can't take what the `default branch` holds.

A `patch release` brings bug fixes, already merged into the `default branch`, to a past release. It follows these specifications:

- Patching any past `standard` or `iteration` release (e.g. `13.281.0`)
- Being cut from that release's `release branch` (e.g. `release/13.281.0`), created from the release's commit the first time it is patched
- Being a prerelease of the next `patch` version, using changesets' [prerelease mode](https://github.com/changesets/changesets/blob/main/docs/prereleases.md) with tag `patch`: e.g. `13.281.1-patch.0`, then `13.281.1-patch.1` for the next patch on the same branch. Libraries get the same suffix (e.g. `@finos/legend-graph@32.10.1-patch.0`), so they never collide with versions the `default branch` has already published, and are published under the NPM dist-tag `patch`, so `latest` never moves back
- Taking only `patch` changesets
- Having a corresponding tag (e.g. `v13.281.1-patch.0`) and a [Github release](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) marked as a prerelease
- **NOT** being merged or cherry-picked back to the `default branch`: the fixes are already there

To initiate a `patch release`:

- Merge each fix into the `default branch` as its own PR with a `patch` changeset. If a fix reached the `default branch` inside a larger PR (e.g. a merge of a development branch), redo it as its own PR, or the patch release carries everything else in that PR too.
- Run the workflow [(Manual) Prepare Patch Release](https://github.com/finos/legend-studio/actions/workflows/manual__prepare-patch-release.yml) with the release to patch (e.g. `13.281.0`) and the fix commits on the `default branch`, oldest first. It creates the `release branch` if needed, enters prerelease mode, cherry-picks the commits (bringing their changesets along) and opens a `Prepare Patch Release vx.y.z-patch.n` PR into the `release branch`.
- Review and merge that PR. The release workflow then opens the `Patch Release vx.y.z-patch.n` PR.
- Merge the `Patch Release` PR to publish.

`release/*` branches are protected: PRs into them need an approving review, the `verification/cla-signed` check and a linear history, so squash or rebase them.

If the workflow can't prepare the patch release (e.g. a cherry-pick conflicts), do the same by hand and open the PR into the `release branch` yourself:

```sh
# the commit the release was published from: its tag, or the `chore: bump versions and release` commit with that version
git push <finos-remote> <release-commit>:refs/heads/release/13.281.0  # first patch of this release only
git switch -c patch-13.281.0 <finos-remote>/release/13.281.0
yarn changeset:cli pre enter patch  # first patch of this release only
git add .changeset/pre.json && git commit -m "chore: enter prerelease mode for patch releases of v13.281.0"
git cherry-pick -x <fix-commit> ...  # resolve conflicts if any
```

> The release workflow refuses to create a release PR on a `release branch` that is not in prerelease mode `patch`, or whose changesets ask for more than `patch`; and on the `default branch` when it is in prerelease mode.
>
> A `release branch` runs its own copy of the release workflow and scripts, i.e. the ones of the release it was cut from. Releases cut before this process existed still work with the steps above, but their older workflow names the PR `Recovery Release` and does not tag the release. Two kinds of older releases need their `.github/workflows/release.yml` updated on the `release branch`, with a PR, before they can be patched: releases cut before 2025-01-23, which use a Github action that is no longer allowed, and releases up to `13.282.0` if the `NPM_TOKEN` secret is gone, since they publish with it rather than [trusted publishing](https://docs.npmjs.com/trusted-publishers). The workflow token can't push workflow changes, so a person has to open that PR.
>
> PRs opened by workflows (e.g. `Prepare Patch Release`) don't start CI checks on their own. Close and reopen the PR to run them.

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
