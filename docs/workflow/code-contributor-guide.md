# Code Contributor Guide

This is a place where we document miscellaneous and advanced topics regarding development.

## Debugging

### Debugging errors happening inside React components

Usually, this is straightforward, if not for the fact that our usage of `mobx` `observer()` make `React` devtool unable to give some component proper names, so you most likely will see some stack trace like this

```
... (some error) ...

(anonymous)     index.js:90
(anonymous)     index.js:100
...
Editor          index.js:300
...
```

To have better idea of where the error is propagated from, one can refer to [this guide](https://mobx.js.org/react-integration.html). The way we can make React devtool to properly pick up the name of the component wrapped in `observer()` is to do he following:

```ts
// before
const SomeComponent = observer((props: ...) => { ... });
// after
const SomeComponent = observer(function SomeComponent(props: ...) { ... });
```

### Using browser debugger during development

To speed up development with `Webpack`, we have [disabled source-mapping](https://github.com/finos/legend-studio/pull/707/commits/e237a87be41030a23c185d8aac7984e9ee4e6192). If you need source-mapping to properly use browser debugger tool, you could re-enable `source-mapping` by running `Webpack` in `debug` mode, do so by using `dev:webpack:debug` script for each application workspace.

```sh
yarn workspace @finos/legend-application-studio-deployment dev:webpack:debug
```

## Troubleshooting

### Getting 'Your connection is not private' in Chromium-based browsers

You'd probably run into this issue when running in browsers like Chrome because it does not acknowledge our self-signed certificate. If so, you can follow this [guide](https://www.technipages.com/google-chrome-bypass-your-connection-is-not-private-message) on how to by pass this issue:

1. In the browser address bar, type `chrome://flags/#allow-insecure-localhost` and switch to `Enable`.
2. Go to the page again `localhost:9000/studio`, you should still see the warning. However, now, click somewhere on the page and type `thisisunsafe` and you should see the page gets reloaded and display properly.

### Getting `Unauthorized` and 401 call to SDLC after logging into Gitlab and being redirected to Studio

Clear all cookies for the site (including SDLC, engine, and Studio) and try to refresh. As a quick try, you can open Studio in a incognito window.
