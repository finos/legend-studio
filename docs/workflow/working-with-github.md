# Working with Github

This provides a general guideline on how to work with Github and `git CLI`, if you are familiar with [Github flow](https://docs.github.com/en/get-started/quickstart/github-flow), you would be able to pick this up quite quickly.

> We meant to keep this guideline friendly to developers who are new Git and Github, if you are one, please check out these [helpful](https://www.atlassian.com/git/tutorials/setting-up-a-repository) [resources](https://lab.github.com/githubtraining/create-a-release-based-workflow)

## Standard contribution workflow

We disallow working directly with the default branch, therefore, your workflow should be something like this:

- [Create a fork of the repo](https://docs.github.com/en/get-started/quickstart/fork-a-repo#forking-a-repository)
- Checkout the fork locally `git pull https://https://github.com/USER_NAME/legend-studio`
- Setup the `upstream` remote `git remote add upstream https://https://github.com/finos/legend-studio`
- Checkout your local feature branch `git checkout -b feature-1`
- Work and commit your changes on the feature branch
- Push the feature branch `git push -u origin feature-1`
- Create a PR, getting it approved and merged
- [Sync the fork](https://docs.github.com/en/github/collaborating-with-pull-requests/working-with-forks/syncing-a-fork) (or you can use the command `git pull --rebase upstream master`)
- _Restart the process for the next contributions..._

## Working on bug fixes for a release

The workflow above is applicable to you most of the time, however, if you are working on bug fixes for a particular release, the workflow is slightly different.

_Let's say the release we're rolling out bug fixes for is `1.0.0`, at this point the release coordinator [should have already created](https://docs.github.com/en/github/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-and-deleting-branches-within-your-repository#creating-a-branch) the release branch `release/1.0.0` in the main repository. Your workflow would be something like this_

- **One-time setup**: fetch the release branch and sync it with your fork

```sh
git fetch upstream
git checkout release/1.0.0
git push -f
```

- Checkout your local feature branch from the release branch `git checkout -b feature-1`
- Work and commit your changes on the feature branch
- Push the feature branch `git push -u origin feature-1`
- Create a PR, **changing to merge to the release branch** `release/1.0.0` instead of the default branch, getting it approved and merged
- Sync the fork (similarly to the above, except on Github, you would need to switch to the release branch to fetch upstream or use the command `git pull --rebease upstream release/1.0.0`)
- _Restart the process for the next contributions..._
