import type { EditorStore } from '@finos/legend-studio';
import {
  getMockedApplicationStore,
  getMockedEditorStore,
  getTestApplicationConfig,
  PluginManager,
} from '@finos/legend-studio';
import { QueryBuilderPlugin } from '../../QueryBuilderPlugin';

export const buildQueryBuilderMockedEditorStore = (): EditorStore => {
  const pluginManager = PluginManager.create();
  pluginManager.usePlugins([new QueryBuilderPlugin()]).install();
  const mockedApplicationStore = getMockedApplicationStore(
    getTestApplicationConfig({
      options: {
        '@finos/legend-studio-plugin-query-builder': {
          TEMPORARY__enableGraphFetch: true,
        },
      },
    }),
    pluginManager,
  );
  return getMockedEditorStore(mockedApplicationStore);
};
