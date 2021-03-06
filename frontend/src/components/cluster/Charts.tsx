import { useTheme } from '@material-ui/core/styles';
import _ from 'lodash';
import React from 'react';
import { KubeObject } from '../../lib/k8s/cluster';
import { parseCpu, parseRam, TO_GB, TO_ONE_CPU } from '../../lib/units';
import { HeaderLabel } from '../common';
import { PercentageCircle, PercentageCircleProps } from '../common/Chart';

interface ResourceCircularChartProps extends Omit<PercentageCircleProps, 'data'> {
  items: KubeObject[] | null;
  itemsMetrics: any;
  noMetrics?: boolean;
  resourceUsedGetter?: (node: KubeObject) => number;
  resourceAvailableGetter?: (node: KubeObject) => number;
  getLegend?: (used: number, available: number) => string;
  tooltip?: string | null;
}

export function ResourceCircularChart(props: ResourceCircularChartProps) {
  const {
    items,
    itemsMetrics,
    noMetrics = false,
    resourceUsedGetter,
    resourceAvailableGetter,
    title,
    tooltip,
    ...others
  } = props;

  const [used, available] = getResourceUsage();

  function filterMetrics(items: KubeObject[], metrics: any[]) {
    if (!items || !metrics)
      return [];

    const names = items.map(({metadata}) => metadata.name);
    return metrics.filter(item => names.includes(item.metadata.name));
  }

  function getLabel() {
    if (available === 0) {
      return '…';
    }
    return `${(used / available * 100).toFixed(1)} %`;
  }

  function getResourceUsage() {
    if (!items)
      return [-1, -1];

    const nodeMetrics = filterMetrics(items, itemsMetrics);
    const usedValue = _.sumBy(nodeMetrics, resourceUsedGetter);
    const availableValue = _.sumBy(items, resourceAvailableGetter);

    return [usedValue, availableValue];
  }

  function makeData() {
    if (used === -1) {
      return [];
    }

    return [
      {
        name: 'used',
        value: used,
      }
    ];
  }

  return (noMetrics ?
    <HeaderLabel
      label={title || ''}
      value={props.getLegend!(used, available)}
      tooltip={'Install the metrics-server to get usage data.'}
    />
    :
    <PercentageCircle
      {...others}
      title={title}
      data={makeData()}
      total={available}
      label={getLabel()}
      legend={props.getLegend!(used, available)}
    />
  );
}

export function MemoryCircularChart(props: ResourceCircularChartProps) {
  const { noMetrics } = props;

  function memoryUsedGetter(item: KubeObject) {
    return parseRam(item.usage.memory) / TO_GB;
  }

  function memoryAvailableGetter(item: KubeObject) {
    return parseRam(item.status!.capacity.memory) / TO_GB;
  }

  function getLegend(used: number, available: number) {
    if (available === 0) {
      return '';
    }

    const availableLabel = `${available.toFixed(2)} GB`;
    if (noMetrics) {
      return availableLabel;
    }

    return `${used.toFixed(2)} / ${availableLabel}`;
  }

  return (
    <ResourceCircularChart
      getLegend={getLegend}
      resourceUsedGetter={memoryUsedGetter}
      resourceAvailableGetter={memoryAvailableGetter}
      title={noMetrics ? 'Memory' : 'Memory usage'}
      {...props}
    />
  );
}

export function CpuCircularChart(props: ResourceCircularChartProps) {
  const { noMetrics } = props;

  function cpuUsedGetter(item: KubeObject) {
    return parseCpu(item.usage.cpu) / TO_ONE_CPU;
  }

  function cpuAvailableGetter(item: KubeObject) {
    return parseCpu(item.status!.capacity.cpu) / TO_ONE_CPU;
  }

  function getLegend(used: number, available: number) {
    if (available === 0) {
      return '';
    }

    const availableLabel = `${available} units`;
    if (noMetrics) {
      return availableLabel;
    }

    return `${used.toFixed(2)} / ${availableLabel}`;
  }

  return (
    <ResourceCircularChart
      getLegend={getLegend}
      resourceUsedGetter={cpuUsedGetter}
      resourceAvailableGetter={cpuAvailableGetter}
      title={noMetrics ? 'CPU' : 'CPU usage'}
      {...props}
    />
  );
}

export function PodsStatusCircleChart(props: Pick<ResourceCircularChartProps, 'items'>) {
  const theme = useTheme();
  const { items } = props;

  const podsReady = (items || []).filter(pod => ['Running', 'Succeeded'].includes(pod.status!.phase));

  function getLegend() {
    if (items === null) {
      return null;
    }
    return `${podsReady.length} / ${items.length} Requested`;
  }

  function getLabel() {
    if (items === null) {
      return '…';
    }
    const percentage = (podsReady.length / items.length * 100).toFixed(1);
    return `${percentage} %`;
  }

  function getData() {
    if (items === null) {
      return [];
    }

    return [
      {
        name: 'ready',
        value: podsReady.length
      },
      {
        name: 'notReady',
        value: items.length - podsReady.length,
        fill: theme.palette.error.main
      }
    ];
  }

  return (
    <PercentageCircle
      data={getData()}
      total={items !== null ? items.length : -1}
      label={getLabel()}
      title="Pods"
      legend={getLegend()}
    />
  );
}
