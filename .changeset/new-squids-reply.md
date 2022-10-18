---
'@finos/legend-application-query': major
---

**BREAKING CHANGE:** Reworked query setup page, the list of option is not partitioned based on various dimensions: is it create/edit action? is it advanced mode, who is the target audience, etc. In particular, we replaced `QuerySetupOptionRendererConfiguration` by `QuerySetupActionConfiguration`

```ts
type QuerySetupActionConfiguration = {
  key: string;
  isCreateAction: boolean;
  isAdvanced: boolean;
  tag?: string;
  label: string;
  icon: React.ReactNode;
  className?: string | undefined;
  action: (setupStore: QuerySetupStore) => Promise<void>;
};
```
