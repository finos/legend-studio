# Release Process

This is a guide on the release process of this repository. Note that this repository contains several libraries (meant to be published to `NPM`) and applications (meant to be deployable and published to `DockerHub`). For libraries' releases, we use [changesets](https://github.com/atlassian/changesets). Application releases are done in a pretty standard manner. All applications' versions are kept the similar (since we consider them all part of the same application suite) and we do a minor version bump every 2 weeks to a month. Patch version bumps are meant for bug fixes post a release.

We will go into details in the following sections:

- [Standard releases](#standard-releases)
- [Patch releases](#patch-releases)
- [Dev/Beta/RC releases](#dev/beta/rc-releases)
- [Release notes](#release-notes)
- [Manual release process](#manual-release-process)

## Standard releases

As mentioned, the release process for libraries is backed by [changesets](https://github.com/atlassian/changesets). We will go in more details about that in the next sub section. The release process for application is really what we want to discuss in depth here. We adopt a `trunk-based development approach` and our release process here is very similar to [Github flow](https://docs.github.com/en/get-started/quickstart/github-flow), which champions CI/CD.

- New features will be added to the default branch
- Application version bump will **always** be minor bumps (e.g. `1.6.0`, `1.7.0`)
- At the beginning of a new application version bump, we will create a release branch for that version (i.e. `release/1.6.0`, `release/1.7.0`), this will be used for adding bug fixes and creating [patch releases](#patch-releases)
- When a patch release is created (e.g. `1.6.1`, `1.7.1`, `1.7.2`), release coordinator need to `cherry pick` the commits on the release branch onto the default branch. To do this, you can follow [this guide](https://stackoverflow.com/a/3933416). In particular, you can cherry pick between the 2 release commit on this branch (e.g. between `1.6.0` and `1.6.1`) using Git command like `git cherry-pick A..B`, then create a PR against default branch for this. You should follow the naming convention for this PR, for example `Chery-picking changes in v1.6.1`
- When we want to do a new release, create a changeset with minor bump for one of the application, e.g. `@finos/legend-studio-app`, since all applications' versions are configured in `changesets` to be linked together, this will bump all applications together. Approve and merge the `New Release` will trigger a pipeline to publish a new release.

### Changesets

We use `changesets` to automate our versioning and release process via [github actions](https://github.com/changesets/action). The CI workflow comprises 2 sets of action:

- **Versioning**: It checks for presence of changesets and open a PR called `New Release` that aggregate changesets to respective package changelogs to bump package versions and their workspace dependencies in `package.json` files. Merging this PR will trigger the publish process.
- **Publishing**: It calls our script to publish new packages to NPM and Docker. After that, it picks up the published version tags and create release and tags on Github. The Github release automatically picks up changelog entries generated from the merged changesets.

## Patch releases

Patch release is meant for fixing bugs for a standard release. After a standard release being done, release coordinators should have create a release branch corresponding to that release, for example `release/1.4.0`. Developers working on bug fixes for this particular version will be creating PRs against this branch.

When a new patch release being done, release coordinators need to cherry-pick the changes back onto the default branch. **Note: please do not merge the release branch back onto the default branch!**

We also use `changesets` to ochestrate the release process for patch release, release coordinate need to approve and merge `New Patch Release` PR to create a patch release.

## Dev/Beta/RC releases

> This is still Work-in-progess. We haven't really had the need for this type of release, so we haven't setup the pipeline for these releases yet.

`Development` releases are meant for both libraries and applications, but `beta` and `rc` releases are only restricted to applications. All of these are cut off the default branch. _Currently, we have no need for this, so there are works to be done to make this happen:_

- [ ] First and foremost, we will not rely on `changeset` for any of these releases
- [ ] For `dev` release, make sure the format of **all** libraries' version is `0.0.0-dev-{COMMIT_SHA}-{DATE-YYYYMMDD}`, for example `0.0.0-dev-33226fada-20210913`. We need to create a separate Github actions that run a script that calls `npm publish --tag dev` to publish libraries to `NPM` [with the appropriate dist-tags](https://docs.npmjs.com/cli/v7/commands/npm-dist-tag#purpose) and publish to `DockerHub` under the `SNAPSHOT` tag (subjected to change)
- [ ] For `beta` and `rc`, we will only publish the application, for these, we will need to create a sepearte Github actions that can potentially [take inputs](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions#inputs) for the release types (`alpha`, `beta`, `rc`), the version and the suffix number to formulate a sensible version number, e.g. `1.7.0-rc.1` and publish this to `DockerHub`

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
