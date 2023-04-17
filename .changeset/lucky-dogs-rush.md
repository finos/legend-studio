---
'@finos/legend-application': major
---

**BREAKING CHANGE:** `LegendApplication.loadApplication()` now takes a required parameter of type `ApplicationStore`. The base `ApplicationStore` itself has been re-written to have platform injected to it rather than having it dependent on the platform to initialize; as before, the current supported platform is `BrowserPlatform` which include `BrowserNavigator` which has been removed from `WebNavigator` -- the testing tooling has been updated accordingly. Also, we have slimmed down our testing tools further by removing redundant application test utilities such as `TEST__getApplicationStore()` and `TEST__provideMockedApplicationStore()`.

Renamed `LegendApplicationComponentFrameworkProvider` to `ApplicationComponentFrameworkProvider`

The idiomatic usage to render an application component now is as follows (using `LegendStudio` as an example):

```ts
// LegendStudio.ts
export class LegendStudio extends LegendApplication {
  // ...
  async loadApplication(
    applicationStore: LegendStudioApplicationStore,
  ): Promise<void> {
    createRoot(getApplicationRootElement()).render(
      <ApplicationStoreProvider store={applicationStore}>
        <LegendStudioWebApplication baseUrl={this.baseUrl} />
      </ApplicationStoreProvider>,
    );
  }
}

// LegendStudioWebApplication.tsx
export const LegendStudioWebApplication = observer(
  (props: { baseUrl: string }) => {
    const { baseUrl } = props;

    return (
      // injects the browser platform to the application store
      <BrowserEnvironmentProvider baseUrl={baseUrl}>
        // provide application component framework
        <LegendStudioFrameworkProvider>
          // the web application router
          <LegendStudioWebApplicationRouter />
        </LegendStudioFrameworkProvider>
      </BrowserEnvironmentProvider>
    );
  },
);
```
