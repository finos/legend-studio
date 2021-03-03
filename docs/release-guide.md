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

# 1. Build the artifacts for publishing
yarn build

# 2. Prepare publish content:
#   i.    Copy the root LICENSE files to the package root.
#   ii.   If this is a Typescript package, flat out the
#         `tsconfig.json` file (i.e. resolve all `extends`)
#   iii.  Update the version in `package.json`
#         For example: `{ ..., "version": "2.0.0.alpha.0` }`
yarn tsc build:ts --showConfig # this will show the full config, replace the content of `tsconfig.json` with this

# 4. Check publish content:
yarn workspace <your-package-name> check:publish

# 4. Publish using Yarn
# You might need to set the YARN_NPM_AUTH_TOKEN
# `YARN_NPM_AUTH_TOKEN=<your token> yarn npm publish
# or running `yarn npm login`
#
# You can also specify the publish tag on NPM. e.g. `next`
# See https://yarnpkg.com/cli/npm/publish
yarn npm publish --tag <publish-tag> --tolerate-republish

# 5. Remove artifacts modified in step (2).



# ------------ Only if we need to push to Github --------------

# 6. Make changes to `CHANGELOG.md` and update the package version
# like in step (2)

# 7. Create a git annotated tag
# <!> Need to do this step if we wish to push this version to Github
git -a <version> -m <version>
git push --follow-tags

# 8. Create a release for the version on Github, use the change in
# `CHANGELOG.md` as release note
```

## Publish Docker Image

- TODO
- (Manually) bump the version in `pom/xml`. Is that all?
- Should we move everything to a new fixtures/package and move `pom.xml` there?
- How do we currently setup the `config.json` files? and what does it mena when we configure `e2e` tests to run in the pipeline
