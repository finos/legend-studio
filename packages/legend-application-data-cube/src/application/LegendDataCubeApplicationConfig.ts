import {
  LegendApplicationConfig,
  type LegendApplicationConfigurationData,
  type LegendApplicationConfigurationInput,
} from '@finos/legend-application';
import {
  assertNonNullable,
  guaranteeNonEmptyString,
} from '@finos/legend-shared';

export interface LegendDataCubeApplicationConfigurationData
  extends LegendApplicationConfigurationData {
  depot: {
    url: string;
  };
  engine: { url: string; queryUrl: string };
}

export class LegendDataCubeApplicationConfig extends LegendApplicationConfig {
  readonly engineServerUrl: string;
  readonly depotServerUrl: string;
  readonly engineQueryServerUrl: string;

  constructor(
    input: LegendApplicationConfigurationInput<LegendDataCubeApplicationConfigurationData>,
  ) {
    super(input);

    // engine
    assertNonNullable(
      input.configData.engine,
      `Can't configure application: 'engine' field is missing`,
    );
    this.engineServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.engine.url,
        `Can't configure application: 'engine.url' field is missing or empty`,
      ),
    );
    this.engineQueryServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      input.configData.engine.queryUrl,
    );
    // depot
    assertNonNullable(
      input.configData.depot,
      `Can't configure application: 'depot' field is missing`,
    );
    this.depotServerUrl = LegendApplicationConfig.resolveAbsoluteUrl(
      guaranteeNonEmptyString(
        input.configData.depot.url,
        `Can't configure application: 'depot.url' field is missing or empty`,
      ),
    );
  }
  getDefaultApplicationStorageKey(): string {
    return 'legend-data-cube';
  }
}
