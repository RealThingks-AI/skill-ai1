export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

export const formatChange = (current: number, previous: number): string => {
  const difference = current - previous;
  const sign = difference > 0 ? '+' : '';
  return `${sign}${difference}`;
};

export const getStatTrend = (current: number, previous: number): 'up' | 'down' | 'neutral' => {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'neutral';
};