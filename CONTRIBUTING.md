# Contributing

1. Fork it (<https://github.com/finos/legend-studio/fork>)
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Read our [contribution guidelines](.github/CONTRIBUTING.md) and [Community Code of Conduct](https://www.finos.org/code-of-conduct)
4. Commit your changes (`git commit -am 'Add some fooBar'`)
5. Push to the branch (`git push origin feature/fooBar`)
6. Create a new Pull Request

_NOTE:_ Commits and pull requests to FINOS repositories will only be accepted from those contributors with an active, executed Individual Contributor License Agreement (ICLA) with FINOS OR who are covered under an existing and active Corporate Contribution License Agreement (CCLA) executed with FINOS. Commits from individuals not covered under an ICLA or CCLA will be flagged and blocked by the FINOS Clabot tool. Please note that some CCLAs require individuals/employees to be explicitly named on the CCLA.

*Need an ICLA? Unsure if you are covered under an existing CCLA? Email [help@finos.org](mailto:help@finos.org)*

## Markers

One of the major use case of Studio is to add support for new types, we are in the process of modularizing the app so that we can support extenions, but for now, we rely on the convention that one should look for places with marker `@MARKER: NEW ELEMENT TYPE SUPPORT` to add support for new element type.

There are places that we do smart analytics similar to what the compiler does in the backend in order to provide smart-suggestion and improving UX; anywhere where these analytics have been done we will mark with `@MARKER: ACTION ANALYTICS`.

## Component Organization

We try to be explicit when naming components (and files in general) so we can easily look up a file globally instead of having to know its location.

We also avoid using `index.ts(x)`

We tend to have a couple of components within one file. This is technically not bad, however, due to the fact that we are using [react-refresh](https://reactnative.dev/docs/fast-refresh) (or `Fast Refresh`) sometimes it's better to not load up many components per file. In particular, let's say we have:

```typescript
// file A.tsx

const ComponentA = () => { ... }
const ComponentB = () => {
  ...
  useEffect(...)
  ...
}
```

If we edit `ComponentA` since `react-refresh` re-render all components from the same module file, `ComponentB` `useEffect` [will be called again](https://reactnative.dev/docs/fast-refresh#fast-refresh-and-hooks). If this `useEffect` contains critical flow in the app that does not allow another call (for example, initializing a singleton) then refreshing the app with `react-refresh` will throw error. Obviously the most straight-forward way is to have each component in a separate file, but sometimes that will pollute the codebase. Hence, be mindful where you place your components.

## Typescript

Needless to say, let's avoid using `any`

Second, it is quite important to understand that Typescript is a [structural type system](https://github.com/microsoft/TypeScript/wiki/FAQ#what-is-structural-typing) rather than a nominal type system,
this means that an empty class/interface are considered to be supertype of everything and will not warn us about any type error. For example:

```javascript
class AbstractType {}
class SomeElement {
  type: AbstractType;

  setType(): void {
    this.type = 1; // this will not be type-checked properly
  }
}
```

As such, we should try our best to not create empty classes. This usually happen when we create abstract classes so that we can have multiple sub-classes declared.

NOTE that an empty class that extends a non-empty class will not get into this problem
