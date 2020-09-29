/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { returnUndefOnError } from 'Utilities/GeneralUtil';
import { ConfigurationProperty as MM_ConfigurationProperty } from 'MM/model/packageableElements/fileGeneration/ConfigurationProperty';
import { PackageableElement as MM_PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { PackageableElementReference as MM_PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';
import { GraphBuilderContext } from './GraphBuilderContext';
import { ConfigurationProperty } from 'V1/model/packageableElements/fileGeneration/ConfigurationProperty';

export const processConfigurationProperty = (propSpec: ConfigurationProperty): MM_ConfigurationProperty => new MM_ConfigurationProperty(propSpec.name, propSpec.value);

// NOTE: we allow the scope element to be a string so that file generation can compile if it has scope elements depending on generated models.
// This is allowed because file generation is the LAST step of generation.
export const processScopeElement = (path: string, context: GraphBuilderContext): MM_PackageableElementReference<MM_PackageableElement> | string => returnUndefOnError(() => context.resolveElement(path, true)) ?? path;
