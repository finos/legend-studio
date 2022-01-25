# Monorepo

This is not a "dissertation" on the concept of monorepo (mono-repo) nor a discussion thread on why we should or should not use monorepo. This is a technical record of how we transform our monolithic codebase (i.e. the whole codebase is one giant package) into a monorepo project. In the following sections, we will discuss our approach and implementation with regards to tooling and the development workflow in a monorepo project.

## Approach

The life-cycle of a codebase roughly comprises the following phases:

- `setup` installing dependencies and linking modules to establish the module dependency graph.
- `develop` watch and auto-rebuild module (potentially serve the app) on code changes, other tasks might include testing and linting.
- `build` build and bundle module to prepare artifacts for packaging and `publish`
- `publish` version and publish the module(s) to module registry (e.g. NPM), other tasks might include deploying.

Among these, the `setup` phase and the `publish` phase are rarely run; besides, thanks to tooling support, they are fairly trivial to do in a monorepo project. Our impressions with the `publish` phase is that it's more about the convention (involving changelogs, commit messages, version tags, semver, etc.) rather than the implementation that is cumbersome.

The `build` phase is often very similar to the `develop` phase, if not a bit more simplified, as it is run as one operation; whereas `develop` often involves watching for changing and trigger re-building on changes, which requires caching and thus, a more sophisticated tooling stack. This is where we realize the biggest challenge when setting up our monorepo project: it's hard to keep the same `watch` behavior while developing on a monorepo project.

For example, let's consider the following common scenario, we have 3 modules:

- `lib-A`: shared library and utilities
- `component-B`: a `react` component that uses utility methods from `lib-A`, this module will have a CSS stylesheet.
- `app-C`: an webapp that has an entry point as a HTML document that loads a `react` app that uses `component-B`. Modules like these are often considered the leaves and should not be depended on by any other modules.

When the codebase was still monolithic, everything is squashed into just `app-C`, we can make change anywhere (be it in the stylesheets, HTML documents, or Javascript modules) and the devtool will be able to trigger rebuild and reload the webapp being served in the browser. This has been our standard development workflow so far. However, when the codebase is a monorepo, setting up the watcher is much trickier. If we set them up to watch for changes across all the modules, this not only runs the risk of lacking devtool support, but also defeats the scalability aspect of monorepo.

As we are so used to thinking of the codebase as one entity, at first, we wasted a huge amount of time trying to bend the devtool to our will by parallelizing our terminal processes in order to watch-and-rebuild all modules at the same time. We learned it the hard way that the most natural solution is simply to respect the module boundary and hierarchy. In other words, every time when there are changes in a child module, we must re-build that module first and somehow find a way to signal the dependent modules to re-build. If the devtools do not support this mechanism, we would, instead, have to manually rebuild and re-run the webapp server. _Come to think about it, to a Java developer, this is the default development workflow, which goes to show how devtools could really influence our way of thinking (for better or worse)._

## Implementation

Our monolithic codebase has a fairly standard setup, nothing far from a project created using [create-react-app](https://create-react-app.dev/): we use [React](https://reactjs.org/) with [Typescript](https://www.typescriptlang.org/) for type-checking, [Webpack](https://webpack.js.org/) for bundling, [Babel](https://babeljs.io/) for transpiling, [ESLint](https://eslint.org/) for linting, [Sass](https://sass-lang.com/) for styling, and [Jest](https://jestjs.io/) for testing.

At the point of writing, the most prominent package managers like [NPM](https://docs.npmjs.com/cli/v6/commands/npm) and [Yarn](https://yarnpkg.com/package/yarn) have support for monorepo project via the `workspaces` feature. Nevertheless, we have opted in to using [Yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/) because firstly, the NPM counterpart is still [work-in-progress](https://docs.npmjs.com/cli/v7/using-npm/workspaces) and secondly, we have already used `Yarn` as our default package manager thanks to its richer feature set.

With this, we could start shaping our codebase in monorepo structure. The following section details the tooling support and setup.

### Monorepo Workspaces Manager: Yarn

We use [Yarn](https://yarnpkg.com/) as our monorepo manager. At the time of speaking, `lerna` is still a very popular choice, but `Yarn@berry` has made a lot of `lerna` features redundant (e.g. [bootstraping](https://github.com/lerna/lerna/tree/main/commands/bootstrap), running scripts in parallel or [topological order](https://yarnpkg.com/cli/workspaces/foreach)).

> Yarn 2 has many niche features such as [Plug n Play](https://yarnpkg.com/features/pnp/#gatsby-focus-wrapper), but this currently [does not work well ESM](https://github.com/yarnpkg/berry/issues/638) so we will explore that option later.

### Module System: ECMAScript Module (ESM)

One problem that we have to deal with that does not happen for a monolithic codebase is to decide the type of Javascript modules we want to produce during `build` phase for each modules. The top level modules are consumed directly by the browser, and tools like `webpack` handles this well. Bundled code at the top level include source code from all dependencies, usually minified to optimize download speed (there are other techniques that we yet to consider such as [code-splitting](https://developer.mozilla.org/en-US/docs/Glossary/Code_splitting) or [module-federation](https://webpack.js.org/concepts/module-federation/)). But when we build library modules, if we choose the same strategy for bundling code, we will end up with duplicated dependencies in the top level module bundle.

This is why we need to be able to do the followings:

- Run [tree-shaking](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking) while bundling top-level module.
- While bundling library modules, mark some dependencies as external and do not bundle these. The ideal case is to ship source code as-is: i.e. just transpile, do not bundle nor ship any dependencies at all.

These concerns are addressed by most bundlers like `webpack` or `rollup`. The former, however is not too straight-forward: to [fully support tree-shaking](https://webpack.js.org/guides/tree-shaking/), we need to build and ship the library modules (i.e. non-top-level modules) as [ESM](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/), rather than [CommonJS (CJS)](https://auth0.com/blog/javascript-module-systems-showdown/). For the latter, we can go with the ideal option by using Typescript compiler `tsc`, which does no bundling at all. The advantages of this approach over bundling will be discussed in the next [section](#to-bundle-or-not-to-bundle).

### To Bundle or Not to Bundle?

There is probably only one clear advantage that bundling offer which is download size. For this reason, we tend to bundle top-level modules whose code is consumed by browsers and downloaded by the users. For non top-level modules, such as utilities or libraries, the only time we download their build artifacts is during development time. Sure it helps to save disk space here, but shipping unbundled code offers many advantage.

- Less build time.
- No need to rebuild packages when upgrade dependencies (without breaking changes)
- More friendly towards browser debugging tools.
- Easier debugging during development in IDE.
- More flexible about how we reorganize dependencies: either moving them to a shared package or having them specified in many different packages.

Bundling often comes with uglifying and optimization that makes code extremely hard to read and navigate, where as source code that only gets _lightly transpiled_ are much closer to source code and thus, much easier to understand. As such, for all of these reasons, we decide to ship unbundled code for library modules.

### Bundler: Webpack

For modules with non-JS code, such as `HTML` or `Sass` - similar to `component-B` and `app-C` - the devtool operations require multiple steps. For `build` phase can be broken down into a series of steps, e.g. `build:typescript && build:sass && build:html && ...`. However, for `develop` phase, it implies we either have to:

- run `watch` processes in parallel: `<run-script-in-parallel> watch:typescript watch:sass ...`
- or, use tools like `webpack` or `gulp` to collate those tasks into one seemingly `atomic` operation, hence, to create a pipeline.

Ideally, the latter is the option we want choose to go with for both `build` and `develop`. As such, for top-level modules like `app-C`, we pick `webpack` due to its maturity, flexibility, and its [rich set of plugins](https://webpack.js.org/plugins/) for code processing, including its built-in `watcher` with [Hot Module Replacement](https://webpack.js.org/concepts/hot-module-replacement/) support and [`dev-server`](https://webpack.js.org/configuration/dev-server/) which are extremely useful for development.

In terms of development workflow, for leaf modules like webapp `app-C`, when we rebuild modules that `app-C` depends on, `webpack-dev-server` should be able to pick up this change and either reload the app or `hot-replace` its module without refreshing/reloading the web page.

### Compiler/Transpiler: Typescript (and Babel for test)

There are 2 ways to process Typescript code:

- Using Typescript compiler [`tsc`](https://www.typescriptlang.org/docs/handbook/compiler-options.html). `tsc` does type-checking and thus is able to create type declaration `*.d.ts` files.
- Using `babel` plugin [`@babel/preset-typescript`](https://babeljs.io/docs/en/babel-preset-typescript). Note that `babel` [does not do type-checking](https://babeljs.io/docs/en/#type-annotations-flow-and-typescript). Also, `babel` supports many plugins and [output runtime target](https://www.google.com/search?q=typescript+support+target+runtime&rlz=1C5CHFA_enUS781US781&oq=typescript+support+target+runtime&aqs=chrome..69i57j33i160.8648j0j1&sourceid=chrome&ie=UTF-8) which `tsc` doesn't.

Typescript has a niche feature that can be used to facilitate the monorepo structure called [Project Reference](https://www.typescriptlang.org/docs/handbook/project-references.html). It manages the dependency graph between modules just like what `yarn` does but with caching specialized for the Typescript compiler [tsc](https://www.typescriptlang.org/docs/handbook/compiler-options.html).

> A downside of using `project reference` is unnecessary [tediousness](https://github.com/microsoft/TypeScript/issues/25376), we need to specify all projects (modules) on top level `tsconfig` and all referenced projects in the module `tsconfig`, hence duplicating declaration of dependencies in `package.json`. See [example](https://github.com/RyanCavanaugh/learn-a). But this is not a deal-breaker because we can create a checker to enforce this constraint.

Since we ship library modules as unbundled code, if we need to use any `babel` plugin, we can do so when bundling top-level module using `webpack` with `babel`. `babel` can be used in test as it offers speed by skipping `type-checking` which we don't quite need for test code.

### Stylesheets: Sass

If we used `CSS-in-JS` solutions like [styled-components](https://styled-components.com/), [emotion](https://emotion.sh/docs/introduction), or [jss](https://cssinjs.org/), splitting up styling code would naturally come when we move code. However, as we use [Sass](https://sass-lang.com/),the problem is not so trivial. There are 2 problems:

- When we transpile code using `babel` or `tsc`, the import statement is not translated to use `css`.
- Statements like `import 'style.css'` [are technically side-effects](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free) and so [not friendly for tree-shaking](https://github.com/webpack/webpack/issues/6741).

As such, the strategy we go with is to compile sass file and output to the `lib` folder, hence, expecting consumers to manually import these stylesheets.

### Version Manager and Publisher: Yarn

[lerna](https://github.com/lerna/lerna) does a great job at managing version, it also helps with [generating changelogs using conventional commit](https://github.com/lerna/lerna/tree/main/commands/version#--conventional-commits). However, as mentioned, most of its feature set are already covered by Yarn, so we decide to use Yarn instead as our version manager and publisher.

We use [changesets](https://github.com/atlassian/changesets) for versioning and documenting changes (creating changelogs) and `Yarn` for publishing. `changesets` is still a pretty _young_ project and requires more work to [integrate better](https://github.com/atlassian/changesets/issues/432) with `Yarn@berry`. What we really like about `changesets` is its [fresh take on monorepo release process](https://github.com/atlassian/changesets/blob/master/docs/detailed-explanation.md), such as how it creates separate `CHANGELOG.md` files and release tags for each package. `Yarn@berry` is also considering to [unify its releasing workflow](https://github.com/yarnpkg/berry/issues/1510) with that of `changesets`, so we might only need `Yarn` in the future.

### IDE: Visual Studio Code

We use [Visual Studio Code (vscode)](https://code.visualstudio.com/). `vscode` seems to naturally support monorepo, the only thing we need to do is to ensure running `yarn install` so modules are linked properly, `Go to definition (Ctrl + Click)` should work nicely without any other config.

> The most important setup for VSCode to work is for Typescript. If we use project reference, we don't seem to need `paths` to be able to have auto-imports work properly in VSCode. However, we must go to auto-imports setting and change it to `on` instead of `auto` as this might hide away imports from our monorepo modules.<br/><br/>An example of this is when you have a module `@something/a` that depends on `@something/b`. `@something/b` exports a function called `helloworld()`. While working in `@something/a`, we type `hellow` at this point, `helloworld` should have been suggested but it doesn't. However, when we manually import `helloworld` by specifying `import { helloworld } from '@something/b'` it works just fine, which means our setup is correct. At this point, forcing `auto-imports` to be `on` in VSCode settings solves the issue

## References

- [Developing in a Large Monorepo - Jai Santhosh - JSConf Korea](https://www.youtube.com/watch?v=pTi0MQbD7No)
- [Github: Guide to use Jest with Lerna](https://github.com/facebook/jest/issues/3112)
- [Github: TypeScript Project References Demo](https://github.com/RyanCavanaugh/project-references-demo)
- [Github: Lerna + Project References](https://github.com/RyanCavanaugh/learn-a)

## Previous Discussions

- [Dan Luu: Monorepo](http://danluu.com/monorepo/)
- [Gregory Szorc: On Monolithic Repositories](https://gregoryszorc.com/blog/2014/09/09/on-monolithic-repositories/)
- [Facebook Engineering: Scaling Mecurial at Facebook](https://engineering.fb.com/2014/01/07/core-data/scaling-mercurial-at-facebook/)
- [Youtube: F8 2015 - Big Code: Developer Infrastructure at Facebook's Scale](https://www.youtube.com/watch?v=X0VH78ye4yY&ab_channel=FacebookDevelopers)
