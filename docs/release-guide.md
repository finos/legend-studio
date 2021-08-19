# Release Guidelines

## CI/CD

We use `changesets` to automate our versioning and release process via [github actions](https://github.com/changesets/action). The CI workflow comprises 2 sets of action:

- **Versioning**: It checks for presence of changesets and open a PR that aggregate changesets to respective package changelogs to bump package versions and their workspace dependencies in `package.json` files. Merging this PR will trigger the publish process.
- **Publishing**: It calls our script to publish new packages to NPM and Docker. After that, it picks up the published version tags and create release and tags on Github. The Github release automatically picks up changelog entries generated from the merged changesets.

> Yarn is planning to [follow the release workflow](https://github.com/yarnpkg/berry/issues/1510) of `changesets`. When this happens, we can switch out to use `Yarn` alone to potentially _slim down_ our `publish:prepare` script and only use `changesets` actions and bots for CI.

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

# 1. Swap out the `workspace:*` in `package.json` to point
# at fixed versions.

# 2. Try to dry-build Docker image
yarn workspace @finos/legend-studio-deployment build-dry:docker

# 3. Login to Docker
docker login

# 4. Build image and publish to Docker Hub
yarn workspace @finos/legend-studio-deployment publish:docker
```
