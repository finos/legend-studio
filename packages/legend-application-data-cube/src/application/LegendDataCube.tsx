import {
  LegendApplication,
  type LegendApplicationConfig,
  type LegendApplicationConfigurationInput,
  type ApplicationStore,
  type LegendApplicationPlugin,
  type LegendApplicationPluginManager,
  getApplicationRootElement,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import {
  LegendDataCubeApplicationConfig,
  type LegendDataCubeApplicationConfigurationData,
} from './LegendDataCubeApplicationConfig.js';
import { LegendDataCubePluginManager } from './LegendDataCubePluginManager.js';
import { Core_LegendDataCube_LegendApplicationPlugin } from './Core_LegendDataCube_LegendApplicationPlugin.js';
import { Core_LegendDataCubeApplicationPlugin } from './Core_LegendDataCubeApplicationPlugin.js';
import { LegendDataCubeWebApplication } from '../components/LegendDataCubeWebApplication.js';
import { createRoot } from 'react-dom/client';

export class LegendDataCube extends LegendApplication {
  declare config: LegendDataCubeApplicationConfig;
  declare pluginManager: LegendDataCubePluginManager;

  static create(): LegendDataCube {
    const application = new LegendDataCube(
      LegendDataCubePluginManager.create(),
    );
    application.withBasePresets([]);
    application.withBasePlugins([
      new Core_LegendDataCube_LegendApplicationPlugin(),
      new Core_LegendDataCubeApplicationPlugin(),
    ]);
    return application;
  }

  async configureApplication(
    input: LegendApplicationConfigurationInput<LegendDataCubeApplicationConfigurationData>,
  ): Promise<LegendApplicationConfig> {
    return new LegendDataCubeApplicationConfig(input);
  }
  async loadApplication(
    applicationStore: ApplicationStore<
      LegendApplicationConfig,
      LegendApplicationPluginManager<LegendApplicationPlugin>
    >,
  ): Promise<void> {
    createRoot(getApplicationRootElement()).render(
      <ApplicationStoreProvider store={applicationStore}>
        <LegendDataCubeWebApplication baseUrl={this.baseAddress} />
      </ApplicationStoreProvider>,
    );
  }
}
