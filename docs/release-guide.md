# Release Guidelines

## CI/CD

We use `changesets` to automate our versioning and release process via [github actions](https://github.com/changesets/action). The CI workflow does 2 sets of action:

- **Versioning**: It checks for presence of changesets and open a PR that aggregate changesets to respective package changelogs to bump package versions and their workspace dependencies in `package.json` files. Merging this PR will trigger the publish process.
- **Publishing**: It calls our script to publish new packages to NPM. After that, it picks up the published version tags and create release and tags on Github. The release automatically picks up changelog entries generated from the merged changesets.

> Yarn is planning to [follow the release workflow](https://github.com/yarnpkg/berry/issues/1510) of `changesets`. When this happens, we can switch out to use `Yarn` alone and only use `changesets` actions and bots for CI.

## Manual Release Process

For **versioning**, we can run `yarn version` to merge all the changesets, update the `CHANGELOG.md` and `package.json` files.

For **publishing** there is more work. We can call the script used in CI for releasing, but when we need to do a prerelease or a beta/alpha release, we need to do this manually and understand the steps.

```sh
# This is the procedure to release a package in our monorepo project:

# 1. Build and prepare publish contents
yarn publish:prepare

# 2. Publish using Yarn
# You might need to set the YARN_NPM_AUTH_TOKEN
# `YARN_NPM_AUTH_TOKEN=<your NPM token> yarn npm publish
# or running `yarn npm login`
#
# You can also specify the publish tag on NPM. e.g. `next`
# See https://yarnpkg.com/cli/npm/publish
yarn npm publish --tag <publish-tag> --tolerate-republish

# 3. Remove artifacts modified in step (2).



# ------------ Only if we need to push to Github --------------

# 4. Make changes to `CHANGELOG.md` and update the package version
# like in step (2)

# 5. Create a git annotated tag
# <!> Need to do this step if we wish to push this version to Github
git -a <version> -m <version>
git push --follow-tags

# 6. Create a release for the version on Github, use the change in
# `CHANGELOG.md` as release note
```
