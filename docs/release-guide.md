# Release Guidelines

## Changesets

We use `changesets` to automate our versioning and release process via [github actions](https://github.com/changesets/action). The CI workflow comprises 2 sets of action:

- **Versioning**: It checks for presence of changesets and open a PR called `New Release` that aggregate changesets to respective package changelogs to bump package versions and their workspace dependencies in `package.json` files. Merging this PR will trigger the publish process.
- **Publishing**: It calls our script to publish new packages to NPM and Docker. After that, it picks up the published version tags and create release and tags on Github. The Github release automatically picks up changelog entries generated from the merged changesets.

## Release Notes

Merging the PR `New Release` created by `changesets` will _effectively_ create a new release. This PR will have a fairly good summary of the changes that happen in the release. However, these are library changelogs and are meant for technical users (e.g. `@finos/legend-shared`, `@finos/legend-application-components`, etc.). For the applications, we need to create separate release notes, which are more user-friendly on our [documentation site](http://github.com/finos/legend).

> Since this repository contains `libraries` as well as `applications`, versioning can be tricky. As such, we use `changesets` to link the application packages together so that all the apps will be versioned together. This way, we could have a version of the applications with each release, and thus, it's more clear and convenient for writing the release notes. _Also note that this is application so the versioning here does not need to follow `semver` strictly._

For each new release, we should:

- Add an entry in the root [CHANGELOG.md](../CHANGELOG.md) for the version of the application and the link to the documentation site
- Create a release on Github that points at an application tag, here we can pick `@finos/legend-studio-app`.

## Manual Release Process

> :warning: NOTE: only use this for emergency release or in case the pipeline release fails for some reason. We use the pipeline because we want to guarantee what we publish to NPM or Docker is guaranteed to match the versions when
> they are first released. So when you do manual releasing like this, proceed with extreme caution! Please make sure
> you know what you are doing :pray:.

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

# 3. Create a git annotated tag
# <!> Need to do this step if we wish to push this version to Github
git -a <version> -m <version>
git push --follow-tags

# 4. Create a release for the version on Github, use the change in
# `CHANGELOG.md` as release note

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
