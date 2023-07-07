# Writing Application Documentation/Help/Contextual-support Guide

This guide is for developers who wish to write application documentation/guide to provide better help for users. We will provide an overview on our application documentation and support strategy as well as some notes on documentation development process.

### Overview

Our documentation/support strategy comprises the following layers (starting from the one which is closest to the application and the codebase):

1. **Inline documentations:** These include input-field prompt, placeholder, info/confirmation dialog, notification, etc. These are the basic minimal help the developers should support the users with when building the feature. It's a _delicate balance_ to strike, it's easy to overload the screen with too much information, which turns out to confuse users more than helping them. As such, the general guideline here is to keep these **succinct**, straight-forward; _avoid giving users long explanation unless it is needed to help them make informed decisions (explanations are better provided in other form of documentation - continue reading)_. These documentations are most likely hard-coded and local to the feature.
2. **Explanations/Examples:** These include explanation/help/suggestion which are useful to help users to understand, take action, but **not crucial** to the point we have to show them directly to the users, they often come in form of tooltip when hovering above info/question icons or buttons, hyperlinks, code-snippet suggestions, etc. We don't recommend using these to give long and detailed example/tutorial. These documentations are most likely hard-coded and local to the feature.
3. **Contextual documentations:** We can detect where the users is in the app (i.e. `navigation context`) and notify users from the `virtual assistant` documentation entries relevant to that context. This is useful to provide more contextual knowledge to users to help enrich their understanding of the feature/system. For example: when users are adding a new property to a class, we could show them documentation about `multiplicity` and `primitive types`. These documentations are most likely written as part of the knowledge base of the documentation service/virtual assistant.
4. **Glossary/Reference Manual:** We allow users to search from a library of questions/documentation entries (from `virtual assistant`). These documentation are most likely included as part of the knowledge base of the documentation service/virtual assistant.
5. **Tutorials:** Sometimes, the feature/workflow could be much better explained with a tutorial/video; we will redirect them to our external documentation website for these contents.
6. **Contact Support/Help:** Sometimes, users might struggle even with the best-effort documentations/examples, they will need to contact support, asking for help. These will require us to have an easy-access point for users. Sometimes, it's also appropriate to encourage users to reach out to support, for example, when an `illegal/unexpected application state` is reached by the users.

We have tried our best to layer our documentation/support strategy. However, please bear in mind, the usage guidelines we provided should only be taken as reference, _not commands_; rather, the important takeaway is to be aware of all these nice tools in your arsenal, then find the right combination that will work best for your features and users.

### Notes on application documentation development process

`Virtual assistant` and `documentation service` offer powerful way to scale and generalize our documentation strategy. These services share a common knowledge base-not (yet) `AI`-powered 🤯-which needs to be updated manually. Each documentation entry has a key associated with it and the app, therefore, even for inline documentations, developers can refer to an existing documentation entry from `documentation service` by referring to its key and use our component to render this documentation entry either as a text block, a link to an external site, or to show the documentation in `virtual assistant`. Currently, the knowledge base is loaded from external sources: the main one is hosted from [finos/legend](https://github.com/finos/legend/tree/master/website/static/resource/studio/documentation) repo, so if you need to add a new entry, please create a PR there. However, during development, there are 2 convenient approaches to see add/test your documentations:

#### Approach 1: Overwriting the application config

Documentation entries directly specified in the application config will be added and overwrite any entries specified in the external and core knowledge bases. As such, directly add your documentation entries the application config. For example, if you're working on `Legend Studio`, modify your `packages/legend-application-studio-deployment/dev/config.json` to have:

```jsonc
{
  ...
  "documentation": {
    ...
    "entries": {
      "my-documentation-entry-key": { // <-- change to your documentation entry key
        "markdownText": {
          "value": "Sample text you wish to preview 🧙"
        }
      }
    }
  }
}
```

Reload the application to pick up the new config file, you should see your documentation entry showing up.

#### Approach 2: Using a mock server

Since the documentation service can load its knowledge bases from external sources, we can create an endpoint to serve your new documentation entries:

1. Update the [local documentation knowledge base](https://github.com/finos/legend-studio/blob/master/fixtures/legend-mock-server/src/DummyDocumentationData.json) to have your new entries:

```json
{
  "entries": {
    "my-documentation-entry-key": {
      // <-- change to your documentation entry key
      "markdownText": {
        "value": "Sample text you wish to preview 🧙"
      }
    }
  }
}
```

2. Start the mock server:

```sh
yarn dev:mock-server
```

3. Configure your application to load documentation entries from this server:

```jsonc
{
  ...
  "documentation": {
    ...
    "registry": [
      { "url": "http://localhost:9999/resource/documentation.json" },
    ],
  }
}
```

4. Reload the application to pick up the new config file, you should see your documentation entry showing up.
