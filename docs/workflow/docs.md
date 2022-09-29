# Documentation

This guide is for developers who wish to contribute to the documentation for our codebases. Sometimes you would like to test your doc changes and see them directly on your local studio; this goes through some of methods that are available.

### Approach 1: Overwriting Config

One of the more straightforward and quicker ways would be simply changing your config file and adding documentation directly. In your [`setup.js` file](https://github.com/finos/legend-studio/blob/master/packages/legend-application-studio-bootstrap/scripts/setup.js) from `legend-application-studio-bootstrap`, replace the `documentation` section with this code as well as the `value` in `markdownText` with the text that you would like to see displayed.

```js
  documentation: {
    url: 'https://legend.finos.org',
    registry: [
      {
        url: 'https://legend.finos.org/resource/studio/documentation/shared.json',
        simple: true,
      },
      {
        url: 'https://legend.finos.org/resource/studio/documentation/studio.json',
        simple: true,
      },
    ],
    entries: {
      'setup.setup-workspace': {
        url: 'https://legend.finos.org/docs/tutorials/studio-tutorial#create-a-workspace',
        markdownText: {
          value: 'Sample text you wish to preview 🧙',
        },
      },
    },
  },
```

Visit your setup studio page in your browser (default link: http://localhost:8080/studio) and you will see your changes reflected.

### Approach 2: Using mock-server

Another method is to edit your [`setup.js` file's](https://github.com/finos/legend-studio/blob/master/packages/legend-application-studio-bootstrap/scripts/setup.js) `documentation` section and uncomment the url where it says to use this end-point when developing documentation locally and comment out the previous endpoint.

```js
/**
  * Use this end-point when developing documentation locally
  */
{ url: 'http://localhost:60001/studio/documentation.json' },
// {
//   url: 'https://legend.finos.org/resource/studio/documentation/shared.json',
//   simple: true,
// },
```

Then, go to your [`dummydocumentation.json` file](https://github.com/finos/legend-studio/blob/master/fixtures/legend-mock-server/src/DummyDocumentationData.json) and add the entries that you would like to test.

```js
{
  "entries": {
    "setup.setup-workspace": {
      "url": "https://legend.finos.org/docs/tutorials/studio-tutorial#create-a-workspace",
      "markdownText": {
        "value": "Sample text you wish to preview 🧙"
      }
    }
  }
}

```

Run `yarn dev:mock-server` in one console and in another console, run `yarn install`, `yarn setup`, and `yarn dev`. Consequently, you should be able to see your doc changes when you visit your setup studio page in your browser (default link: http://localhost:8080/studio).

> If you would like to contribute a documentation entry, note that you will need to make a pull request to [legend `studio.json`](https://github.com/finos/legend/blob/master/website/static/resource/studio/documentation/studio.json) as this is where our documentation currently lives.
