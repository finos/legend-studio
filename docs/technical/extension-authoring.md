# Extension Authoring

## Studio Plugins and Presets

Studio extension mechanism are done via `plugins`, we have different types of plugins for `tracer`, `telemetry`, `editor`, `protocol handling`, etc. When a set of plugins make sense to go together (i.e. in case of a `DSL`s like `Text` DSL, `Relational` DSL, etc.), we bundle them up as `presets`.

DSL is a very common use case where we have extension on, as each DSL are meant to target a family of data models for very specific use cases. One can roughly follow what we do for `Text` DSL as it can be considered a fairly simple and clear example of a DSL preset.

> Studio extension is at code level, not runtime level like other IDEs' plugins: it means that the extension code is compiled together with Studio core when building the app. This is a big downside as it requires authors to update their extensions more frequently as new version of Studio core comes out. Hopefully, we can figure a better strategy to decouple the core and the extensions in the near future.

## Working with Extensions

When working on extensions, your setup is most likely going be something like this:

1. A module that acts as the entry point to boot up Studio application (similar to [@finos/legend-application-studio-deployment](https://github.com/finos/legend-studio/tree/master/packages/legend-application-studio-deployment))
2. Other extensions modules that the entry points load

Sometimes, you could see problems being reported from within Studio core, but you don't really have the code to debug the issue. Following are several debugging methods that we recommend:

- Use browser debugger: If the bundler does not _mess_ with the source-maps then this is probably the most straight-forward method.
- Poke into the source code: Navigate the code at `node_modules/@finos/legend-application-studio/lib/...` and start hacking your way with `console.log` and `debugger`, etc.

  > When you navigate code in the IDE, remember that due to source mapping, we will let you navigate to the source code (which resides at `node_modules/@finos/legend-application-studio/src/...`) instead of the compiled code, placing breaking points or `console.log` here won't show any effect.

- Linking with Studio core locally: This goes a bit beyond debugging. Sometimes, you need to make changes in both Studio core and your extensions, it's useful to have a way to link your locale Studio core (e.g. `@finos/legend-application-studio`) with your extensions. To do this, you can explore solutions like [yalc](https://github.com/wclr/yalc) or [yarn link](https://yarnpkg.com/cli/link). The latter is what we often use as it's more native to our stack. To do this, you can simply use the following command:

```bash
# In the root directory of your extension
yarn link <location_to_module>
# e.g. yarn link ../../studio-core/packages/legend-application-studio
# This will add a `resolution` block to your `package.json`
```
