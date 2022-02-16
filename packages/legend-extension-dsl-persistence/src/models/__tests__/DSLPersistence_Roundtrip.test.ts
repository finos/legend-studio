import { DSLPersistence_GraphPreset } from '@finos/legend-extension-dsl-persistence';
import { TEST_DATA__roundtrip } from './TEST_DATA__DSLPersistence_Roundtrip';
import {
  TEST__checkBuildingElementsRoundtrip,
  TEST__GraphPluginManager,
} from '@finos/legend-graph';
import { unitTest } from '@finos/legend-shared';
import { Entity } from '@finos/legend-model-storage';

const pluginManager = new TEST__GraphPluginManager();
pluginManager.usePresets([new DSLPersistence_GraphPreset()]).install();

test(unitTest('Persistence roundtrip'), async () => {
  await TEST__checkBuildingElementsRoundtrip(
    TEST_DATA__roundtrip as Entity[],
    pluginManager,
  );
});
