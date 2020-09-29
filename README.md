# legend-studio

## Getting started

```bash
  npm install
  npm run setup
  npm start
```

## Developer setup

### Custom DEV server config

Depending on your developer environment, you might have customizations for the dev server, for example, if your environment has a different host for `localhost` and that host requires a special signed certficates and keys, you would need to provide those in `server/https`. See sample below:

```json
{
  "host": "localhost",
  // NOTE: the path must be relative to `webpack.config.js`
  "key": "./dev/server/localhost.key.pem",
  "cert": "./dev/server/localhost.cert.pem",
  "ca": "./dev/server/ca.cert.pem"
}
```

Whichever configs specified in this file will override that in `webpack.config.js`. See `dev/scripts/start.js` and setting `SERVER_CONFIG_PATH` for more details.

### IDE

If you use VSCode (and we hope you do...), you should install `Prettier` and `ESLint` plugins, then configuallore your workspace settings in `./.vscode/settings.json` like this:

```json
{
  "editor.tabSize": 2,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.options": {
    // use advanced ESLint rules for development
    "configFile": "./.eslintrc-advanced.js",
    "rulePaths": ["./dev/eslint_rules"]
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/package-lock.json": true
  },
  // This is useful when we want to use a different version of Typescript
  // "typescript.tsdk": "./node_modules/typescript/lib"
  "[css]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[scss]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[html]": {
    "editor.defaultFormatter": "vscode.html-language-features"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "vscode.typescript-language-features"
  },
  "[typescript]": {
    "editor.defaultFormatter": "vscode.typescript-language-features"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "vscode.typescript-language-features"
  },
  "prettier.singleQuote": true,
  "prettier.trailingComma": "es5",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "javascript.preferences.importModuleSpecifier": "non-relative",
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

## License

Copyright 2020 Goldman Sachs

Distributed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

SPDX-License-Identifier: [Apache-2.0](https://spdx.org/licenses/Apache-2.0)