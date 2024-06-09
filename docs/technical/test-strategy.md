# Testing

## Approach

For web applications, we champion the [testing trophy](https://kentcdodds.com/blog/write-tests) approach popularized by Kent C. Dodds. Unlike the classic testing pyramid, this approach places the focus on writing a lot of integration tests rather than on writing a lot of unit tests.

```
         ___________
        /           \                                   /\
       /     E2E     \                                 /  \
      /---------------\                               /    \
     /                 \                             /      \
    /                   \                           /  E2E   \
   /     INTEGRATION     \                         /----------\
   \                     /         vs.            /            \
    \                   /                        /              \
     \-----------------/                        /  INTEGRATION   \
      \     UNIT      /                        /------------------\
       \-------------/                        /                    \
       /             \                       /                      \
      /    STATIC     \                     /          UNIT          \
     /                 \                   /                          \
    /___________________\                 /____________________________\
```

For the details, please see the full article. But the gist is instead of focusing on achieving `100% code coverage`, we aim to achieve highest possible `code confidence` and `return of investment`. Writing a lot of `unit` tests does help boost confidence (though only at micro scale), but also puts pressure on the cost of changes - almost any changes would break some tests. As such, focusing on how the app works on the larger scale such as at integration level and beyond, would allow us to develop with more flexibility while ensuring that what we changed/added do not break the existing feature set.

> In the `trophy` paradigm, `static` refers to a linting and type-checking which gives a huge confidence boosting during development and helps prevent bugs with `undefined` value.<br/><br/>Also, just a note why end-to-end (functional) testing just takes a small portion in both diagrams? That's because end-to-end tests, despite being super powerful, are usually costly to setup and maintain.<br/><br/>See detailed comparison between different testing levels [here](https://kentcdodds.com/blog/unit-vs-integration-vs-e2e-tests)

## Implementation

`static`: We use [ESLint](https://eslint.org/) for linting and [Typescript](https://www.typescriptlang.org/) for type-checking.

`unit`: We should really only write unit tests for utilities and helpers. We use [Jest](https://jestjs.io/) as the testing framework.

`integration`: We should have integration tests to cover all use cases. We don't make real network call here, so we should mock out our network client (or not (?), see [TODO](#TODO)). We also use `Jest`.

`e2e`: Almost the same as `integration` test, except we do make real network call and interact with the backend. We would like to use [Playwright](hhttps://playwright.dev/). In a way, `e2e` tests are valuable here because it can be used to test the whole application stack as well as a `demo` for usage and features of the app.

## TODO

- Mock server request instead of mocking the method that makes the network call, maybe this is the better way to write integration test (or even e2e tests)?
  https://kentcdodds.com/blog/stop-mocking-fetch?ck_subscriber_id=564011516
  https://github.com/mswjs/msw
