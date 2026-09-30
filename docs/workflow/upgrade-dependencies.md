# Dependenies Upgrade Process

## Libraries

Run the interactive upgrade tool and follow our [strategy guide](./dependencies.md#updating-a-dependency) on dependencies upgrade to make your selection

```sh
yarn check:update
```

Update the package manifest cache/lock file

```sh
yarn fix:pkg
```

## Tools

### Yarn

```sh
yarn set version stable
```

> NOTE: You might need to manually upgrade the plugins; we're not so sure if the above command also include upgrading the commands, follow this [guide](https://yarnpkg.com/features/plugins)

### Node

Update Node version enforced in the root `package.json`

```jsonc
  ...
  "engines": {
    "node": ">=20.0.0"
  }
```

Update Node version used for pipeline workflow (use an [LTS release](https://github.com/nodejs/release#release-schedule))

```yml
- name: Setup Node
  uses: actions/setup-node@v4.3.0
  with:
    node-version: 24
```

### Docker

Currently, we have fairly basic `Dockerfile` configurations, we just need to update the version of the base static web server

```dockerfile
FROM finos/legend-shared-server:0.10.0
...
```

### Github Actions

Currently, we set up [dependabot](https://docs.github.com/en/code-security/dependabot) to check for new updates of these tools (e.g. `actions/setup-node`, `actions/cache`, etc.). Just regularly check open PRs and merge them will do the work
