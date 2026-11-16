import type { Metric } from 'web-vitals';

export interface WebVitalPayload {
  metric: 'CLS' | 'INP' | 'LCP';
  metric_value: number;
  metric_delta: number;
  metric_rating: 'good' | 'needs-improvement' | 'poor';
  navigation_type: string;
}

/** Convert browser floats to stable GA4 integers without changing thresholds. */
export function webVitalPayload(metric: Metric): WebVitalPayload | null {
  if (!['CLS', 'INP', 'LCP'].includes(metric.name)) return null;
  if (!Number.isFinite(metric.value) || !Number.isFinite(metric.delta)) return null;

  const scale = metric.name === 'CLS' ? 1000 : 1;
  return {
    metric: metric.name as WebVitalPayload['metric'],
    metric_value: Math.round(metric.value * scale),
    metric_delta: Math.round(metric.delta * scale),
    metric_rating: metric.rating,
    navigation_type: metric.navigationType,
  };
}
