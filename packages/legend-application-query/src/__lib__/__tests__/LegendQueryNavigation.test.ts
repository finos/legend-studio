/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test, expect, describe } from '@jest/globals';
import {
  LEGEND_QUERY_ROUTE_PATTERN,
  LEGEND_QUERY_ROUTE_PATTERN_TOKEN,
  LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN,
  LEGEND_QUERY_QUERY_PARAM_TOKEN,
  generateQuerySetupRoute,
  generateEditExistingQuerySetupRoute,
  generateCreateMappingQuerySetupRoute,
  generateCloneServiceQuerySetupRoute,
  generateQueryProductionizerSetupRoute,
  generateUpdateExistingServiceQuerySetup,
  generateLoadProjectServiceQuerySetup,
  generateMappingQueryCreatorRoute,
  generateServiceQueryCreatorRoute,
  generateExistingQueryEditorRoute,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateExistingServiceQueryUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateProjectServiceQueryUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProductionizeQueryUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateTaxonomyDataspaceViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateNewDataCubeUrl,
} from '../LegendQueryNavigation.js';

describe('LegendQueryNavigation', () => {
  describe('Route patterns', () => {
    test('should define route pattern tokens', () => {
      expect(LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV).toBe('gav');
      expect(LEGEND_QUERY_ROUTE_PATTERN_TOKEN.QUERY_ID).toBe('queryId');
      expect(LEGEND_QUERY_ROUTE_PATTERN_TOKEN.MAPPING_PATH).toBe('mappingPath');
      expect(LEGEND_QUERY_ROUTE_PATTERN_TOKEN.RUNTIME_PATH).toBe('runtimePath');
      expect(LEGEND_QUERY_ROUTE_PATTERN_TOKEN.SERVICE_PATH).toBe('servicePath');
    });

    test('should define route patterns', () => {
      expect(LEGEND_QUERY_ROUTE_PATTERN.DEFAULT).toBe('/');
      expect(LEGEND_QUERY_ROUTE_PATTERN.SETUP).toBe('/setup');
      expect(LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY_SETUP).toBe(
        '/setup/existing-query',
      );
      expect(LEGEND_QUERY_ROUTE_PATTERN.CREATE_MAPPING_QUERY_SETUP).toBe(
        '/setup/manual',
      );
      expect(LEGEND_QUERY_ROUTE_PATTERN.CLONE_SERVICE_QUERY_SETUP).toBe(
        '/setup/clone-service-query',
      );
      expect(LEGEND_QUERY_ROUTE_PATTERN.QUERY_PRODUCTIONIZER_SETUP).toBe(
        '/setup/productionize-query',
      );
      expect(
        LEGEND_QUERY_ROUTE_PATTERN.UPDATE_EXISTING_SERVICE_QUERY_SETUP,
      ).toBe('/setup/update-existing-service-query');
      expect(LEGEND_QUERY_ROUTE_PATTERN.LOAD_PROJECT_SERVICE_QUERY_SETUP).toBe(
        '/setup/load-project-service-query',
      );
    });

    test('should define query param tokens', () => {
      expect(LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.SHOW_ALL_GROUPS).toBe(
        'showAllGroups',
      );
      expect(LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.SHOW_ADVANCED_ACTIONS).toBe(
        'showAdvancedActions',
      );
      expect(LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.TAG).toBe('tag');
      expect(LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY).toBe(
        'executionKey',
      );
    });
  });

  describe('Route generators', () => {
    test('should generate query setup route', () => {
      expect(generateQuerySetupRoute()).toBe('/setup');
      expect(generateQuerySetupRoute(true)).toBe('/setup?showAllGroups=true');
      expect(generateQuerySetupRoute(true, true)).toBe(
        '/setup?showAllGroups=true&showAdvancedActions=true',
      );
      expect(generateQuerySetupRoute(true, true, 'test-tag')).toBe(
        '/setup?showAllGroups=true&showAdvancedActions=true&tag=test-tag',
      );
    });

    test('should generate edit existing query setup route', () => {
      expect(generateEditExistingQuerySetupRoute()).toBe(
        '/setup/existing-query',
      );
    });

    test('should generate create mapping query setup route', () => {
      expect(generateCreateMappingQuerySetupRoute()).toBe('/setup/manual');
    });

    test('should generate clone service query setup route', () => {
      expect(generateCloneServiceQuerySetupRoute()).toBe(
        '/setup/clone-service-query',
      );
    });

    test('should generate query productionizer setup route', () => {
      expect(generateQueryProductionizerSetupRoute()).toBe(
        '/setup/productionize-query',
      );
    });

    test('should generate update existing service query setup route', () => {
      expect(generateUpdateExistingServiceQuerySetup()).toBe(
        '/setup/update-existing-service-query',
      );
    });

    test('should generate load project service query setup route', () => {
      expect(generateLoadProjectServiceQuerySetup()).toBe(
        '/setup/load-project-service-query',
      );
    });

    test('should generate mapping query creator route', () => {
      const route = generateMappingQueryCreatorRoute(
        'test-group',
        'test-artifact',
        '1.0.0',
        'model::TestMapping',
        'model::TestRuntime',
      );
      expect(route).toBe(
        '/create/manual/test-group:test-artifact:1.0.0/model::TestMapping/model::TestRuntime',
      );
    });

    test('should generate service query creator route', () => {
      const route = generateServiceQueryCreatorRoute(
        'test-group',
        'test-artifact',
        '1.0.0',
        'model::TestService',
      );
      expect(route).toBe(
        '/create-from-service/test-group:test-artifact:1.0.0/model::TestService',
      );

      const routeWithExecKey = generateServiceQueryCreatorRoute(
        'test-group',
        'test-artifact',
        '1.0.0',
        'model::TestService',
        'test-exec-key',
      );
      expect(routeWithExecKey).toBe(
        '/create-from-service/test-group:test-artifact:1.0.0/model::TestService?executionKey=test-exec-key',
      );
    });

    test('should generate existing query editor route', () => {
      const route = generateExistingQueryEditorRoute('test-query-id');
      expect(route).toBe('/edit/test-query-id');
    });
  });

  describe('External application navigation', () => {
    test('should generate studio project view URL', () => {
      const url = EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
        'https://studio.example.com',
        'test-group',
        'test-artifact',
        '1.0.0',
        'model::TestEntity',
      );
      expect(url).toBe(
        'https://studio.example.com/view/archive/test-group:test-artifact:1.0.0/entity/model::TestEntity',
      );

      const urlWithoutEntity =
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
          'https://studio.example.com',
          'test-group',
          'test-artifact',
          '1.0.0',
          undefined,
        );
      expect(urlWithoutEntity).toBe(
        'https://studio.example.com/view/archive/test-group:test-artifact:1.0.0',
      );
    });

    test('should generate studio SDLC project view URL', () => {
      const url =
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
          'https://studio.example.com',
          'test-project',
          '1.0.0',
          'model::TestEntity',
        );
      expect(url).toBe(
        'https://studio.example.com/view/test-project/version/1.0.0/entity/model::TestEntity',
      );

      const urlWithoutVersion =
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
          'https://studio.example.com',
          'test-project',
          undefined,
          'model::TestEntity',
        );
      expect(urlWithoutVersion).toBe(
        'https://studio.example.com/view/test-project/entity/model::TestEntity',
      );

      const urlWithoutEntity =
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
          'https://studio.example.com',
          'test-project',
          '1.0.0',
          undefined,
        );
      expect(urlWithoutEntity).toBe(
        'https://studio.example.com/view/test-project/version/1.0.0',
      );
    });

    test('should generate studio update existing service query URL', () => {
      const url =
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateExistingServiceQueryUrl(
          'https://studio.example.com',
          'test-group',
          'test-artifact',
          'model::TestService',
        );
      expect(url).toBe(
        'https://studio.example.com/extensions/update-service-query/model::TestService@test-group:test-artifact',
      );
    });

    test('should generate studio update project service query URL', () => {
      const url =
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateProjectServiceQueryUrl(
          'https://studio.example.com',
          'test-project',
        );
      expect(url).toBe(
        'https://studio.example.com/extensions/update-project-service-query/test-project',
      );
    });

    test('should generate studio productionize query URL', () => {
      const url =
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioProductionizeQueryUrl(
          'https://studio.example.com',
          'test-query-id',
        );
      expect(url).toBe(
        'https://studio.example.com/extensions/productionize-query/test-query-id',
      );
    });

    test('should generate taxonomy dataspace view URL', () => {
      const url =
        EXTERNAL_APPLICATION_NAVIGATION__generateTaxonomyDataspaceViewUrl(
          'https://taxonomy.example.com',
          'test-group',
          'test-artifact',
          '1.0.0',
          'model::TestDataSpace',
        );
      expect(url).toBe(
        'https://taxonomy.example.com/dataspace/test-group:test-artifact:1.0.0/model::TestDataSpace',
      );
    });

    test('should generate new data cube URL', () => {
      const sourceData = { data: 'test-data' };
      const url = EXTERNAL_APPLICATION_NAVIGATION__generateNewDataCubeUrl(
        'https://datacube.example.com',
        sourceData,
      );
      expect(url).toContain('https://datacube.example.com?sourceData=');
      // The exact value will be encoded, so we just check that it contains the base URL
    });
  });
});
