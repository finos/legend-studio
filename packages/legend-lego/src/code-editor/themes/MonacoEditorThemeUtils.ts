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

import {
  getNonNullableEntry,
  isNonNullable,
  isString,
} from '@finos/legend-shared';
import type { editor as monacoEditorAPI } from 'monaco-editor';

type VSCodeThemeData = {
  colors: Record<string, string | string[]>;
  tokenColors: {
    name?: string;
    scope?: string[] | string;
    settings?: {
      foreground?: string;
      background?: string;
      fontStyle?: string;
    };
  }[];
};

const parseVSCodeTheme = (
  rawData: VSCodeThemeData,
): monacoEditorAPI.IStandaloneThemeData => {
  const rules: monacoEditorAPI.ITokenThemeRule[] = [];

  rawData.tokenColors.forEach((tokenColor) => {
    if (!tokenColor.settings) {
      return;
    }

    let scopes: string[] = [];

    if (isString(tokenColor.scope)) {
      scopes = tokenColor.scope
        .replace(/^[,]+/, '')
        .replace(/[,]+$/, '')
        .split(',')
        .map((scope) => scope.trim());
    } else if (Array.isArray(tokenColor.scope)) {
      scopes = tokenColor.scope;
    } else {
      scopes = [''];
    }

    const baseRule: Omit<monacoEditorAPI.ITokenThemeRule, 'token'> = {};

    if (
      tokenColor.settings.foreground &&
      isString(tokenColor.settings.foreground)
    ) {
      baseRule.foreground = tokenColor.settings.foreground;
    }

    if (
      tokenColor.settings.background &&
      isString(tokenColor.settings.background)
    ) {
      baseRule.background = tokenColor.settings.background;
    }

    if (
      tokenColor.settings.fontStyle &&
      isString(tokenColor.settings.fontStyle)
    ) {
      baseRule.fontStyle = tokenColor.settings.fontStyle;
    }

    scopes.forEach((scope) => {
      if (isNonNullable(scope) || !Object.keys(baseRule).length) {
        return;
      }
      const rule = {
        ...baseRule,
        token: scope,
      };
      rules.push(rule);
    });
  });

  const colors: monacoEditorAPI.IColors = {};
  Object.entries(rawData.colors).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) {
        colors[key] = getNonNullableEntry(value, 0);
      }
    } else {
      colors[key] = value;
    }
  });

  return {
    base: 'vs-dark',
    inherit: true,
    rules: rules,
    colors,
  };
};

export const buildCodeEditorTheme = (
  vscodeThemeData: VSCodeThemeData,
  baseTheme: monacoEditorAPI.BuiltinTheme,
  colorsOverride: Record<string, string>,
  rulesOverride: monacoEditorAPI.ITokenThemeRule[],
): monacoEditorAPI.IStandaloneThemeData => {
  const baseThemeData = parseVSCodeTheme(vscodeThemeData);
  return {
    ...baseThemeData,
    base: baseTheme,
    colors: { ...baseThemeData.colors, ...colorsOverride },
    rules: [...baseThemeData.rules, ...rulesOverride],
  };
};
