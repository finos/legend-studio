# Typescript Usage

## Avoid `any`

Using `any` often defeats the purpose of using Typescript. If the type is not known, use `unknown` so you are forced to handle type narrowing down the line.

## Understand Typescript structual type system

Typescript is a [structural type system](https://github.com/microsoft/TypeScript/wiki/FAQ#what-is-structural-typing) rather than a nominal type system: this means that an empty `class/interface` is considered to be supertype of everything and therefore; i.e. sometimes type errors are not reported where you expect them to happen.

```ts
class AbstractType {}
class SomeElement {
  type: AbstractType;

  setType(): void {
    this.type = 1; // this will not be type-checked properly
  }
}
```

To avoid this problem, we can add a `branding` [flag](https://betterprogramming.pub/nominal-typescript-eee36e9432d2) to [differentiate type](https://basarat.gitbook.io/typescript/main-1/nominaltyping).

```ts
class AbstractType {
  private _$nominalTypeBrand!: 'AbstractType';
}
class SomeElement {
  type: AbstractType;

  setType(): void {
    this.type = 1; // this will throw error now
  }
}
```

## Using path mappings/module aliasing

Typescript supports resolving module aliases via [path mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping). This nice feature allows us to write our import statement without the ugly relative parent path notation chains `../../../../`.

However, this does not seem to be in sync with what the Typescript team envisioned for this feature. Their general take on this is that [you should write the import path that works at runtime](https://github.com/microsoft/TypeScript/issues/26722#issuecomment-524375687), and avoids modifying/patching the emitted `*.js` files. Also, `path mappings` are meant to [reflect the behavior of whatever](https://github.com/microsoft/TypeScript/issues/26722#issuecomment-516935532) is actually resolving `*.js` files, such as `webpack`. Therefore, Typescript will not resolve these aliases [when it emits files](https://github.com/microsoft/TypeScript/issues/15479); in other words, when we use `tsc` to build type definitions, they are broken if path mapping is used. For that reason, we decide to keep using `relative path` for import and avoid using path mapping for directory under `src`.

> In a way, the problem mentioned above is alleviated by the fact that our codebase is split into modules and linked via package dependency. But note that we only use `tsc` for building type definition, so if the Typescript team decides to [support alias resolution](https://github.com/microsoft/TypeScript/issues/30952) we might taking on `path mappings`.

## Avoid direct browser APIs for navigation

Do **not** use `window.open()`, `window.location.href`, or other browser globals to navigate or open URLs. Instead, use the **navigation service** provided by the application store. This ensures:

- Navigation is **testable** — the service can be mocked/spied on in tests without requiring `window` stubs.
- Navigation is **consistent** across the application.
- We avoid tight coupling to browser globals, making components easier to unit test.

```ts
// ❌ Bad — uses browser global directly
window.open(`${legendServicesUrl}/${encodedPattern}`);
window.location.href = someUrl;

// ✅ Good — uses the navigation service for external URLs
applicationStore.navigationService.navigator.visitAddress(
  `${legendServicesUrl}/${encodedPattern}`,
);

// ✅ Good — for in-app route changes
applicationStore.navigationService.navigator.goToLocation(route);
```

The same principle applies broadly: prefer framework-provided abstractions over raw browser APIs when they exist in the codebase (e.g. use the `settingService` for persistence rather than `localStorage` directly).
