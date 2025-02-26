/*
 * Tencent is pleased to support the open source community by making TMagicEditor available.
 *
 * Copyright (C) 2023 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { cloneDeep } from 'lodash-es';

import type { MApp } from '@tmagic/schema';
import { getDepNodeIds, getNodes, replaceChildNode } from '@tmagic/utils';

import DataSourceManager from './DataSourceManager';
import type { HttpDataSourceOptions } from './types';

/**
 * 创建数据源管理器
 * @param dsl DSL
 * @param httpDataSourceOptions http 数据源配置
 * @returns DataSourceManager
 */
export const createDataSourceManager = (
  dsl: MApp,
  platform: string,
  httpDataSourceOptions?: Partial<HttpDataSourceOptions>,
) => {
  if (!dsl?.dataSources) return;

  const dataSourceManager = new DataSourceManager({
    dataSourceConfigs: dsl.dataSources,
    dataSourceDeps: dsl.dataSourceDeps,
    dataSourceCondDeps: dsl.dataSourceCondDeps,
    httpDataSourceOptions,
  });

  if (dsl.dataSources && dsl.dataSourceCondDeps && platform !== 'editor') {
    getNodes(getDepNodeIds(dsl.dataSourceCondDeps), dsl.items).forEach((node) => {
      node.condResult = dataSourceManager.compliedConds(node);
      replaceChildNode(node, dsl!.items);
    });
  }

  if (dsl.dataSources && dsl.dataSourceDeps) {
    getNodes(getDepNodeIds(dsl.dataSourceDeps), dsl.items).forEach((node) => {
      replaceChildNode(dataSourceManager.compiledNode(node), dsl!.items);
    });
  }

  dataSourceManager.on('change', (sourceId: string) => {
    const dep = dsl.dataSourceDeps?.[sourceId];
    const condDep = dsl.dataSourceCondDeps?.[sourceId];

    if (condDep) {
      dataSourceManager.emit(
        'update-data',
        getNodes(Object.keys(condDep), dsl.items).map((node) => {
          const newNode = cloneDeep(node);
          newNode.condResult = dataSourceManager.compliedConds(node);
          return newNode;
        }),
        sourceId,
      );
    }

    if (dep) {
      dataSourceManager.emit(
        'update-data',
        getNodes(Object.keys(dep), dsl.items).map((node) => dataSourceManager.compiledNode(node)),
        sourceId,
      );
    }
  });

  return dataSourceManager;
};
