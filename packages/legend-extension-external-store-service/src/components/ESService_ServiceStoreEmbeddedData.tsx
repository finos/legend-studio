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

import { EDITOR_LANGUAGE } from '@finos/legend-application';
import {
  CaretDownIcon,
  clsx,
  ContextMenu,
  CustomSelectorInput,
  DropdownMenu,
  LockIcon,
  MenuContent,
  MenuContentItem,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  TimesIcon,
  ToggleOffIcon,
  ToggleOnIcon,
} from '@finos/legend-art';
import { ExternalFormatData } from '@finos/legend-graph';
import {
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  prettyCONSTName,
} from '@finos/legend-shared';
import {
  ExternalFormatDataEditor,
  externalFormatData_setContentType,
  externalFormatData_setData,
  useEditorStore,
  ExternalFormatDataState,
  StudioTextInputEditor,
} from '@finos/legend-studio';
import { observer } from 'mobx-react-lite';
import { EqualToJsonPattern } from '../models/metamodels/pure/model/data/contentPattern/ESService_EqualToJsonPattern';
import { EqualToPattern } from '../models/metamodels/pure/model/data/contentPattern/ESService_EqualToPattern';
import type { StringValuePattern } from '../models/metamodels/pure/model/data/contentPattern/ESService_StringValuePattern';
import { ServiceRequestPattern } from '../models/metamodels/pure/model/data/ESService_ServiceRequestPattern';
import { ServiceResponseDefinition } from '../models/metamodels/pure/model/data/ESService_ServiceResponseDefinition';
import { ServiceStubMapping } from '../models/metamodels/pure/model/data/ESService_ServiceStubMapping';
import { HTTP_METHOD } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ESService_ServiceStoreService';
import { V1_StringValuePatternType } from '../models/protocols/pure/v1/transformation/pureProtocol/V1_ESService_ProtocolHelper';
import {
  serviceStore_embeddedData_addServiceStubMapping,
  serviceStore_embeddedData_deleteServiceStubMapping,
  serviceStore_serviceRequestPattern_addBodyPatterns,
  serviceStore_serviceRequestPattern_addHeaderParams,
  serviceStore_serviceRequestPattern_addQueryParams,
  serviceStore_serviceRequestPattern_deleteBodyPatterns,
  serviceStore_serviceRequestPattern_deleteHeaderParams,
  serviceStore_serviceRequestPattern_deleteQueryParams,
  serviceStore_serviceRequestPattern_setMethod,
  serviceStore_serviceRequestPattern_setUrl,
  serviceStore_serviceRequestPattern_setUrlPath,
  serviceStore_serviceRequestPattern_updateBodyPattern,
  serviceStore_serviceRequestPattern_updateHeaderParameterName,
  serviceStore_serviceRequestPattern_updateHeaderParamValue,
  serviceStore_serviceRequestPattern_updateQueryParameterName,
  serviceStore_serviceRequestPattern_updateQueryParamValue,
  serviceStore_serviceResponseDefinition_setBody,
  serviceStore_serviceStubMapping_setServiceRequestPattern,
  serviceStore_serviceStubMapping_setServiceResponseDefinition,
  serviceStore_stringValuePattern_setExpectedValue,
} from '../stores/studio/ESService_GraphModifierHelper';
import {
  type ServiceStoreEmbeddedDataState,
  ServiceStubMappingState,
  SERVICE_REQUEST_PATTERN_TAB_TYPE,
  SERVICE_STUB_MAPPING_TAB_TYPE,
} from '../stores/studio/ESService_ServiceStoreEmbeddedDataEditorState';

export type StringValuePatternOption = {
  value: string;
  label: string;
};

export const QueryParamsEditor = observer(
  (props: {
    serviceRequestPattern: ServiceRequestPattern;
    isReadOnly: boolean;
  }) => {
    const { serviceRequestPattern, isReadOnly } = props;
    const stringValuePatternOptions = Object.values(
      V1_StringValuePatternType,
    ).map((stringValuePatternType) => ({
      value: stringValuePatternType,
      label: stringValuePatternType,
    }));
    const onStringValuePatternChange = (
      val: StringValuePatternOption,
      key: string,
    ): void => {
      let stringValuePattern: StringValuePattern;
      if (val.value === V1_StringValuePatternType.EQUAL_TO_JSON_PATTERN) {
        stringValuePattern = new EqualToJsonPattern();
        serviceStore_stringValuePattern_setExpectedValue(
          stringValuePattern,
          '',
        );
        serviceStore_serviceRequestPattern_updateQueryParamValue(
          serviceRequestPattern,
          key,
          stringValuePattern,
        );
      } else {
        stringValuePattern = new EqualToPattern();
        serviceStore_stringValuePattern_setExpectedValue(
          stringValuePattern,
          '',
        );
        serviceStore_serviceRequestPattern_updateQueryParamValue(
          serviceRequestPattern,
          key,
          stringValuePattern,
        );
      }
    };
    const addQueryParam = (): void => {
      const equalToPattern = new EqualToPattern();
      serviceStore_stringValuePattern_setExpectedValue(equalToPattern, '');
      serviceStore_serviceRequestPattern_addQueryParams(
        serviceRequestPattern,
        '',
        equalToPattern,
      );
    };

    return (
      <div className="query-params-editor">
        <div className="query-params-editor__header">
          <div className="query-params-editor__header__title">
            <div className="query-params-editor__header__title__label">
              Query Params
            </div>
          </div>
          <div className="query-params-editor__header__actions">
            <button
              className="query-params-editor__header__action"
              onClick={addQueryParam}
              disabled={isReadOnly}
              tabIndex={-1}
              title={'Add query param'}
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        <div className="query-params-editor__content">
          {Array.from(serviceRequestPattern.queryParams?.values() ?? []).map(
            (queryParam: StringValuePattern, index: number) => (
              <div
                className="query-params-editor__content"
                key={queryParam._UUID}
              >
                <div className="query-params-editor__content__group">
                  <input
                    disabled={isReadOnly}
                    spellCheck={false}
                    className="query-params-editor__param-name"
                    value={
                      Array.from(
                        serviceRequestPattern.queryParams?.keys() ?? [],
                      )[index]
                    }
                    placeholder={`Parameter name`}
                    onChange={(event): void =>
                      serviceStore_serviceRequestPattern_updateQueryParameterName(
                        serviceRequestPattern,
                        guaranteeNonNullable(
                          Array.from(
                            serviceRequestPattern.queryParams?.keys() ?? [],
                          )[index],
                        ),
                        event.target.value,
                      )
                    }
                  />
                  <CustomSelectorInput
                    className="query-params-editor__selector"
                    options={stringValuePatternOptions}
                    onChange={(val: StringValuePatternOption): void =>
                      onStringValuePatternChange(
                        val,
                        guaranteeNonNullable(
                          Array.from(
                            serviceRequestPattern.queryParams?.keys() ?? [],
                          )[index],
                        ),
                      )
                    }
                    value={
                      queryParam instanceof EqualToPattern
                        ? stringValuePatternOptions.at(0)
                        : stringValuePatternOptions.at(1)
                    }
                    placeholder={'Choose a string value pattern type'}
                    darkMode={true}
                  />
                  <div className="query-params-editor__actions">
                    <button
                      className="query-params-editor__remove-btn"
                      onClick={(): void =>
                        serviceStore_serviceRequestPattern_deleteQueryParams(
                          serviceRequestPattern,
                          guaranteeNonNullable(
                            Array.from(
                              serviceRequestPattern.queryParams?.keys() ?? [],
                            )[index],
                          ),
                        )
                      }
                      tabIndex={-1}
                      title={'Remove'}
                    >
                      <TimesIcon />
                    </button>
                  </div>
                </div>
                <div className="query-params-editor__content__group">
                  <div className="query-params-editor__expected-value">
                    <StudioTextInputEditor
                      language={
                        queryParam instanceof EqualToJsonPattern
                          ? EDITOR_LANGUAGE.JSON
                          : EDITOR_LANGUAGE.PURE
                      }
                      inputValue={queryParam.expectedValue}
                      updateInput={(val: string): void =>
                        serviceStore_stringValuePattern_setExpectedValue(
                          queryParam,
                          val,
                        )
                      }
                      hideGutter={true}
                    />
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    );
  },
);

export const HeaderParamsEditor = observer(
  (props: {
    serviceRequestPattern: ServiceRequestPattern;
    isReadOnly: boolean;
  }) => {
    const { serviceRequestPattern, isReadOnly } = props;
    const stringValuePatternOptions = Object.values(
      V1_StringValuePatternType,
    ).map((stringValuePatternType) => ({
      value: stringValuePatternType,
      label: stringValuePatternType,
    }));
    const onStringValuePatternChange = (
      val: StringValuePatternOption,
      key: string,
    ): void => {
      let stringValuePattern: StringValuePattern;
      if (val.value === V1_StringValuePatternType.EQUAL_TO_JSON_PATTERN) {
        stringValuePattern = new EqualToJsonPattern();
        serviceStore_stringValuePattern_setExpectedValue(
          stringValuePattern,
          '',
        );
        serviceStore_serviceRequestPattern_updateHeaderParamValue(
          serviceRequestPattern,
          key,
          stringValuePattern,
        );
      } else {
        stringValuePattern = new EqualToPattern();
        serviceStore_stringValuePattern_setExpectedValue(
          stringValuePattern,
          '',
        );
        serviceStore_serviceRequestPattern_updateHeaderParamValue(
          serviceRequestPattern,
          key,
          stringValuePattern,
        );
      }
    };
    const addHeaderParam = (): void => {
      const equalToPattern = new EqualToPattern();
      serviceStore_stringValuePattern_setExpectedValue(equalToPattern, '');
      serviceStore_serviceRequestPattern_addHeaderParams(
        serviceRequestPattern,
        '',
        equalToPattern,
      );
    };

    return (
      <div className="header-params-editor">
        <div className="header-params-editor__header">
          <div className="header-params-editor__header__title">
            <div className="header-params-editor__header__title__label">
              Header Params
            </div>
          </div>
          <div className="header-params-editor__header__actions">
            <button
              className="header-params-editor__header__action"
              onClick={addHeaderParam}
              disabled={isReadOnly}
              tabIndex={-1}
              title={'Add header param'}
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        <div className="header-params-editor__content">
          {Array.from(serviceRequestPattern.headerParams?.values() ?? []).map(
            (headerParam: StringValuePattern, index: number) => (
              <div
                className="header-params-editor__content"
                key={headerParam._UUID}
              >
                <div className="header-params-editor__content__group">
                  <input
                    disabled={isReadOnly}
                    spellCheck={false}
                    className="header-params-editor__param-name"
                    value={
                      Array.from(
                        serviceRequestPattern.headerParams?.keys() ?? [],
                      )[index]
                    }
                    placeholder={`Parameter name`}
                    onChange={(event): void =>
                      serviceStore_serviceRequestPattern_updateHeaderParameterName(
                        serviceRequestPattern,
                        guaranteeNonNullable(
                          Array.from(
                            serviceRequestPattern.headerParams?.keys() ?? [],
                          )[index],
                        ),
                        event.target.value,
                      )
                    }
                  />
                  <CustomSelectorInput
                    className="header-params-editor__selector"
                    options={stringValuePatternOptions}
                    onChange={(val: StringValuePatternOption): void =>
                      onStringValuePatternChange(
                        val,
                        guaranteeNonNullable(
                          Array.from(
                            serviceRequestPattern.headerParams?.keys() ?? [],
                          )[index],
                        ),
                      )
                    }
                    value={
                      headerParam instanceof EqualToPattern
                        ? stringValuePatternOptions.at(0)
                        : stringValuePatternOptions.at(1)
                    }
                    placeholder={'Choose a string value pattern type'}
                    darkMode={true}
                  />
                  <div className="header-params-editor__actions">
                    <button
                      className="header-params-editor__remove-btn"
                      onClick={(): void =>
                        serviceStore_serviceRequestPattern_deleteHeaderParams(
                          serviceRequestPattern,
                          guaranteeNonNullable(
                            Array.from(
                              serviceRequestPattern.headerParams?.keys() ?? [],
                            )[index],
                          ),
                        )
                      }
                      tabIndex={-1}
                      title={'Remove'}
                    >
                      <TimesIcon />
                    </button>
                  </div>
                </div>
                <div className="header-params-editor__content__group">
                  <div className="header-params-editor__expected-value">
                    <StudioTextInputEditor
                      language={
                        headerParam instanceof EqualToJsonPattern
                          ? EDITOR_LANGUAGE.JSON
                          : EDITOR_LANGUAGE.PURE
                      }
                      inputValue={headerParam.expectedValue}
                      updateInput={(val: string): void =>
                        serviceStore_stringValuePattern_setExpectedValue(
                          headerParam,
                          val,
                        )
                      }
                      hideGutter={true}
                    />
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    );
  },
);

export const BodyPatternsEditor = observer(
  (props: {
    serviceRequestPattern: ServiceRequestPattern;
    isReadOnly: boolean;
  }) => {
    const { serviceRequestPattern, isReadOnly } = props;
    const stringValuePatternOptions = Object.values(
      V1_StringValuePatternType,
    ).map((stringValuePatternType) => ({
      value: stringValuePatternType,
      label: stringValuePatternType,
    }));
    const onStringValuePatternChange = (
      val: StringValuePatternOption,
      index: number,
    ): void => {
      let stringValuePattern: StringValuePattern;
      if (val.value === V1_StringValuePatternType.EQUAL_TO_JSON_PATTERN) {
        stringValuePattern = new EqualToJsonPattern();
        serviceStore_stringValuePattern_setExpectedValue(
          stringValuePattern,
          '',
        );
        serviceStore_serviceRequestPattern_updateBodyPattern(
          serviceRequestPattern,
          index,
          stringValuePattern,
        );
      } else {
        stringValuePattern = new EqualToPattern();
        serviceStore_stringValuePattern_setExpectedValue(
          stringValuePattern,
          '',
        );
        serviceStore_serviceRequestPattern_updateBodyPattern(
          serviceRequestPattern,
          index,
          stringValuePattern,
        );
      }
    };
    const addBodyPattern = (): void => {
      const equalToPattern = new EqualToPattern();
      serviceStore_stringValuePattern_setExpectedValue(equalToPattern, '');
      serviceStore_serviceRequestPattern_addBodyPatterns(
        serviceRequestPattern,
        equalToPattern,
      );
    };

    return (
      <div className="body-patterns-editor">
        <div className="body-patterns-editor__header">
          <div className="body-patterns-editor__header__title">
            <div className="body-patterns-editor__header__title__label">
              Body Patterns
            </div>
          </div>
          <div className="body-patterns-editor__header__actions">
            <button
              className="body-patterns-editor__header__action"
              onClick={addBodyPattern}
              disabled={isReadOnly}
              tabIndex={-1}
              title={'Add body pattern'}
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        <div className="body-patterns-editor__content">
          {serviceRequestPattern.bodyPatterns.map(
            (bodyPattern: StringValuePattern, index: number) => (
              <div
                className="body-patterns-editor__content"
                key={bodyPattern._UUID}
              >
                <div className="body-patterns-editor__content__group">
                  <CustomSelectorInput
                    className="body-patterns-editor__selector"
                    options={stringValuePatternOptions}
                    onChange={(val: StringValuePatternOption): void =>
                      onStringValuePatternChange(val, index)
                    }
                    value={
                      bodyPattern instanceof EqualToPattern
                        ? stringValuePatternOptions.at(0)
                        : stringValuePatternOptions.at(1)
                    }
                    placeholder={'Choose a string value pattern type'}
                    darkMode={true}
                  />
                  <div className="body-patterns-editor__actions">
                    <button
                      className="body-patterns-editor__remove-btn"
                      onClick={(): void =>
                        serviceStore_serviceRequestPattern_deleteBodyPatterns(
                          serviceRequestPattern,
                          bodyPattern,
                        )
                      }
                      tabIndex={-1}
                      title={'Remove'}
                    >
                      <TimesIcon />
                    </button>
                  </div>
                </div>
                <div className="body-patterns-editor__content__group">
                  <div className="body-patterns-editor__expected-value">
                    <StudioTextInputEditor
                      language={
                        bodyPattern instanceof EqualToJsonPattern
                          ? EDITOR_LANGUAGE.JSON
                          : EDITOR_LANGUAGE.PURE
                      }
                      inputValue={bodyPattern.expectedValue}
                      updateInput={(val: string): void =>
                        serviceStore_stringValuePattern_setExpectedValue(
                          bodyPattern,
                          val,
                        )
                      }
                      hideGutter={true}
                    />
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    );
  },
);

export const ServiceRequestPatternEditor = observer(
  (props: {
    serviceStubMappingState: ServiceStubMappingState;
    serviceRequestPattern: ServiceRequestPattern;
    isReadOnly: boolean;
  }) => {
    const { serviceStubMappingState, serviceRequestPattern, isReadOnly } =
      props;
    const httpMethodOptions = Object.values(HTTP_METHOD).map(
      (method) => method,
    );
    const onHttpMethodChange = (val: HTTP_METHOD): void =>
      serviceStore_serviceRequestPattern_setMethod(serviceRequestPattern, val);
    const selectedTab =
      serviceStubMappingState.selectedServiceRequestPatternTab;
    const changeTab =
      (tab: SERVICE_REQUEST_PATTERN_TAB_TYPE): (() => void) =>
      (): void =>
        serviceStubMappingState.setSelectedServiceRequestPatternTab(tab);
    const changeToggleOn = (): void => {
      serviceStubMappingState.setToggleOn();
      serviceStubMappingState.toggleOn
        ? serviceStubMappingState.setUrlValue(serviceRequestPattern.url ?? '')
        : serviceStubMappingState.setUrlValue(
            serviceRequestPattern.urlPath ?? '',
          );
    };
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const stringValue = event.target.value;
      const updatedValue = stringValue ? stringValue : undefined;
      serviceStubMappingState.toggleOn
        ? serviceStore_serviceRequestPattern_setUrl(
            serviceRequestPattern,
            updatedValue,
          )
        : serviceStore_serviceRequestPattern_setUrlPath(
            serviceRequestPattern,
            updatedValue,
          );
      serviceStubMappingState.setUrlValue(stringValue);
    };

    return (
      <div className="panel service-request-pattern-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={200} minSize={15}>
            <div className="service-request-pattern-editor__header">
              <div className="service-request-pattern-editor__header__title">
                {isReadOnly && (
                  <div className="service-request-pattern-editor__header__lock">
                    <LockIcon />
                  </div>
                )}
                <div className="service-request-pattern-editor__header__title__label">
                  ServiceRequestPattern
                </div>
              </div>
              <div className="service-request-pattern-editor__header__actions">
                <DropdownMenu
                  disabled={isReadOnly}
                  content={
                    <MenuContent className="service-request-pattern-editor__dropdown">
                      {httpMethodOptions.map((httpMethod) => (
                        <MenuContentItem
                          key={httpMethod}
                          className="service-request-pattern-editor__option"
                          onClick={(): void => onHttpMethodChange(httpMethod)}
                        >
                          {httpMethod}
                        </MenuContentItem>
                      ))}
                    </MenuContent>
                  }
                  menuProps={{
                    anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                    transformOrigin: { vertical: 'top', horizontal: 'right' },
                  }}
                >
                  <div className="service-request-pattern-editor__type">
                    <div className="service-request-pattern-editor__type__label">
                      {serviceRequestPattern.method}
                    </div>
                    <div className="service-request-pattern-editor__type__icon">
                      <CaretDownIcon />
                    </div>
                  </div>
                </DropdownMenu>
              </div>
            </div>
            <div className="service-request-pattern-editor__content">
              <div className="panel__content service-request-pattern-editor__url">
                <div className="panel__content__form__section">
                  <div className="panel__content__form__section__header__label">
                    Url
                    <button
                      className="url-editor__action"
                      onClick={changeToggleOn}
                      disabled={isReadOnly}
                      tabIndex={-1}
                      title={'Toggle'}
                    >
                      {serviceStubMappingState.toggleOn ? (
                        <ToggleOnIcon className="url-editor__icon" />
                      ) : (
                        <ToggleOffIcon className="url-editor__icon" />
                      )}
                    </button>
                  </div>
                  <div className="panel__content__form__section__header__prompt">
                    Toggles between Url and UrlPath
                  </div>
                  <input
                    className="panel__content__form__section__input"
                    spellCheck={false}
                    disabled={isReadOnly}
                    value={serviceStubMappingState.urlValue}
                    onChange={changeValue}
                  />
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel>
            <div className="service-request-pattern-editor__tabs">
              {(serviceRequestPattern.method === HTTP_METHOD.GET
                ? Object.values(SERVICE_REQUEST_PATTERN_TAB_TYPE).filter(
                    (tab) =>
                      tab !== SERVICE_REQUEST_PATTERN_TAB_TYPE.BODY_PATTERNS,
                  )
                : Object.values(SERVICE_REQUEST_PATTERN_TAB_TYPE)
              ).map((tab) => (
                <div
                  key={tab}
                  onClick={changeTab(tab)}
                  className={clsx('service-request-pattern-editor__tab', {
                    'service-request-pattern-editor__tab--active':
                      tab === selectedTab,
                  })}
                >
                  {prettyCONSTName(tab)}
                </div>
              ))}
            </div>
            <div className="service-request-pattern-editor__content">
              {selectedTab === SERVICE_REQUEST_PATTERN_TAB_TYPE.BODY_PATTERNS &&
                serviceRequestPattern.method === HTTP_METHOD.POST && (
                  <BodyPatternsEditor
                    serviceRequestPattern={serviceRequestPattern}
                    isReadOnly={isReadOnly}
                  />
                )}
              {selectedTab ===
                SERVICE_REQUEST_PATTERN_TAB_TYPE.HEADER_PARAMS && (
                <HeaderParamsEditor
                  serviceRequestPattern={serviceRequestPattern}
                  isReadOnly={isReadOnly}
                />
              )}
              {selectedTab ===
                SERVICE_REQUEST_PATTERN_TAB_TYPE.QUERY_PARAMS && (
                <QueryParamsEditor
                  serviceRequestPattern={serviceRequestPattern}
                  isReadOnly={isReadOnly}
                />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

export const ServiceStubMappingEditor = observer(
  (props: {
    serviceStubMappingState: ServiceStubMappingState;
    isReadOnly: boolean;
  }) => {
    const { serviceStubMappingState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const selectedTab = serviceStubMappingState.selectedTab;
    const changeTab =
      (tab: SERVICE_STUB_MAPPING_TAB_TYPE): (() => void) =>
      (): void =>
        serviceStubMappingState.setSelectedTab(tab);
    return (
      <div className="service-stub-mapping-editor">
        <div className="service-stub-mapping-editor__tabs">
          {Object.values(SERVICE_STUB_MAPPING_TAB_TYPE).map((tab) => (
            <div
              key={tab}
              onClick={changeTab(tab)}
              className={clsx('service-stub-mapping-editor__tab', {
                'service-stub-mapping-editor__tab--active': tab === selectedTab,
              })}
            >
              {prettyCONSTName(tab)}
            </div>
          ))}
        </div>
        <div className="service-stub-mapping-editor__content">
          {selectedTab ===
            SERVICE_STUB_MAPPING_TAB_TYPE.SERVICE_RESPONSE_DEFINITION &&
            serviceStubMappingState.serviceStubMapping && (
              <ExternalFormatDataEditor
                externalFormatDataState={
                  new ExternalFormatDataState(
                    editorStore,
                    serviceStubMappingState.serviceStubMapping.responseDefinition.body,
                  )
                }
                isReadOnly={isReadOnly}
              />
            )}
          {selectedTab ===
            SERVICE_STUB_MAPPING_TAB_TYPE.SERVICE_REQUEST_PATTERN &&
            serviceStubMappingState.serviceStubMapping && (
              <ServiceRequestPatternEditor
                serviceStubMappingState={serviceStubMappingState}
                serviceRequestPattern={
                  serviceStubMappingState.serviceStubMapping.requestPattern
                }
                isReadOnly={isReadOnly}
              />
            )}
        </div>
      </div>
    );
  },
);

export const ServiceStoreEmbeddedDataEditor = observer(
  (props: {
    serviceStoreEmbeddedDataState: ServiceStoreEmbeddedDataState;
    isReadOnly: boolean;
  }) => {
    const { serviceStoreEmbeddedDataState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const currentServiceStubMapping =
      serviceStoreEmbeddedDataState.currentServiceStubMappingState
        ?.serviceStubMapping;
    const changeState =
      (val: ServiceStubMapping): (() => void) =>
      (): void => {
        serviceStoreEmbeddedDataState.setCurrentServiceStubMappingState(
          new ServiceStubMappingState(editorStore, val),
        );
      };
    const addServiceStubMapping = (): void => {
      if (!isReadOnly) {
        const serviceStubMapping = new ServiceStubMapping();
        const responseDefinition = new ServiceResponseDefinition();
        const externalFormatData = new ExternalFormatData();
        externalFormatData_setData(externalFormatData, '');
        externalFormatData_setContentType(
          externalFormatData,
          guaranteeNonEmptyString(
            editorStore.graphState.graphGenerationState.externalFormatState
              .formatContentTypes[0],
          ),
        );
        serviceStore_serviceResponseDefinition_setBody(
          responseDefinition,
          externalFormatData,
        );
        serviceStore_serviceStubMapping_setServiceResponseDefinition(
          serviceStubMapping,
          responseDefinition,
        );
        const requestPattern = new ServiceRequestPattern();
        serviceStore_serviceRequestPattern_setMethod(
          requestPattern,
          HTTP_METHOD.GET,
        );
        serviceStore_serviceStubMapping_setServiceRequestPattern(
          serviceStubMapping,
          requestPattern,
        );
        serviceStore_embeddedData_addServiceStubMapping(
          serviceStoreEmbeddedDataState.embeddedData,
          serviceStubMapping,
        );
        serviceStoreEmbeddedDataState.setCurrentServiceStubMappingState(
          new ServiceStubMappingState(editorStore, serviceStubMapping),
        );
      }
    };
    const deleteServiceStubMapping =
      (val: ServiceStubMapping): (() => void) =>
      (): void => {
        serviceStore_embeddedData_deleteServiceStubMapping(
          serviceStoreEmbeddedDataState.embeddedData,
          val,
        );
        if (
          serviceStoreEmbeddedDataState.embeddedData.serviceStubMappings
            .length !== 0
        ) {
          serviceStoreEmbeddedDataState.setCurrentServiceStubMappingState(
            new ServiceStubMappingState(
              editorStore,
              serviceStoreEmbeddedDataState.embeddedData.serviceStubMappings[
                serviceStoreEmbeddedDataState.embeddedData.serviceStubMappings
                  .length - 1
              ],
            ),
          );
        }
        if (
          serviceStoreEmbeddedDataState.embeddedData.serviceStubMappings
            .length === 0
        ) {
          serviceStoreEmbeddedDataState.setCurrentServiceStubMappingState(
            undefined,
          );
        }
      };
    const getIndex = (value: ServiceStubMapping): number =>
      guaranteeNonNullable(
        serviceStoreEmbeddedDataState.embeddedData.serviceStubMappings.findIndex(
          (serviceStubMapping: ServiceStubMapping) =>
            value === serviceStubMapping,
        ),
        `Can't find service stub mapping '${value}' in service store embedded data`,
      );

    return (
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel minSize={30} size={300}>
          <div className="service-store-embedded-data-editor">
            <div className="service-store-embedded-data-editor__header">
              <div className="service-store-embedded-data-editor__header__title">
                <div className="service-store-embedded-data-editor__header__title__label">
                  ServiceStubMapping
                </div>
              </div>
              <div className="service-store-embedded-data-editor__header__actions">
                <button
                  className="service-store-embedded-data-editor__header__action"
                  onClick={addServiceStubMapping}
                  disabled={isReadOnly}
                  tabIndex={-1}
                  title={'Add ServiceStubMapping'}
                >
                  <PlusIcon />
                </button>
              </div>
            </div>
            <ContextMenu
              className="service-store-embedded-data-editor__content"
              disabled={isReadOnly}
              content={
                !isReadOnly &&
                currentServiceStubMapping !== undefined && (
                  <div
                    className="service-store-embedded-data-editor__context-menu"
                    onClick={deleteServiceStubMapping(
                      currentServiceStubMapping,
                    )}
                  >
                    Delete
                  </div>
                )
              }
              menuProps={{ elevation: 7 }}
            >
              <div className="service-store-embedded-data-editor__content__lists">
                <MenuContent className="service-store-embedded-data-editor__dropdown">
                  {serviceStoreEmbeddedDataState.embeddedData.serviceStubMappings.map(
                    (serviceStubMapping: ServiceStubMapping, index: number) => (
                      <MenuContentItem
                        key={serviceStubMapping._UUID}
                        className={
                          currentServiceStubMapping === serviceStubMapping
                            ? 'service-store-embedded-data-editor__option service-store-embedded-data-editor__option__active'
                            : 'service-store-embedded-data-editor__option'
                        }
                        onClick={changeState(serviceStubMapping)}
                      >
                        ServiceStubMapping{index + 1}
                      </MenuContentItem>
                    ),
                  )}
                </MenuContent>
              </div>
            </ContextMenu>
          </div>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel>
          <div className="service-store-embedded-data-editor">
            <div className="service-store-embedded-data-editor__header">
              <div className="service-store-embedded-data-editor__header__title">
                {isReadOnly && (
                  <div className="service-store-embedded-data-editor__header__lock">
                    <LockIcon />
                  </div>
                )}
                <div className="service-store-embedded-data-editor__header__title__content">
                  {currentServiceStubMapping !== undefined
                    ? `ServiceStubMapping${
                        getIndex(currentServiceStubMapping) + 1
                      }`
                    : ''}
                </div>
              </div>
            </div>
            <div className="service-store-embedded-data-editor__content">
              <div className="service-store-embedded-data-editor__content__lists">
                {serviceStoreEmbeddedDataState.currentServiceStubMappingState &&
                  currentServiceStubMapping !== undefined && (
                    <ServiceStubMappingEditor
                      serviceStubMappingState={
                        serviceStoreEmbeddedDataState.currentServiceStubMappingState
                      }
                      isReadOnly={isReadOnly}
                    />
                  )}
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);
