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

// TODO: remove when we remove demo mode
import { PACKAGEABLE_ELEMENT_TYPE } from 'MM/model/packageableElements/PackageableElement';

export const EXPLORER_TREE_LEGAL_ROOT_PACKAGE_LABEL = 'legal';

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
export const isElementTypeSupported = (type: PACKAGEABLE_ELEMENT_TYPE, isInDemo: boolean): boolean => !isInDemo || [
  PACKAGEABLE_ELEMENT_TYPE.PACKAGE,
  PACKAGEABLE_ELEMENT_TYPE.CLASS,
  PACKAGEABLE_ELEMENT_TYPE.ENUMERATION,
  PACKAGEABLE_ELEMENT_TYPE.PROFILE,
  PACKAGEABLE_ELEMENT_TYPE.FUNCTION,
  PACKAGEABLE_ELEMENT_TYPE.DIAGRAM,
  PACKAGEABLE_ELEMENT_TYPE.MAPPING,
  PACKAGEABLE_ELEMENT_TYPE.TEXT,
].includes(type);
