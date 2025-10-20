import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

const KpiCard = ({ title, value, delta, deltaType = 'increase', sparklineData, note }) => {
  const deltaIcon =
    deltaType === 'increase' ? (
      <ArrowUp className="h-3 w-3 text-green-500" />
    ) : deltaType === 'decrease' ? (
      <ArrowDown className="h-3 w-3 text-red-500" />
    ) : (
      <Minus className="h-3 w-3 text-gray-500" />
    );

  const deltaColor =
    deltaType === 'increase'
      ? 'text-green-600 bg-green-100'
      : deltaType === 'decrease'
      ? 'text-red-600 bg-red-100'
      : 'text-gray-600 bg-gray-100';

  const renderValue = (rawValue) => {
    if (rawValue === null || rawValue === undefined) return '';
    const str = String(rawValue);
    const dotIndex = str.lastIndexOf('.');
    if (dotIndex > -1 && dotIndex < str.length - 1) {
      const main = str.slice(0, dotIndex);
      const decimals = str.slice(dotIndex); // includes the dot
      return (
        <>
          <span className="whitespace-nowrap">{main}</span>
          <span className="block text-sm sm:text-base font-semibold whitespace-nowrap">{decimals}</span>
        </>
      );
    }
    return str;
  };

  return (
    <Card variant="transparent" className="rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-bold text-gray-900 leading-tight [font-size:clamp(1.25rem,3.2vw,1.875rem)]" title={String(value)}>
          {renderValue(value)}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${deltaColor}`}>
                {deltaIcon}
                <span>{delta}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{note}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="mt-4 h-12 sm:h-16 w-full" aria-label={`Sparkline showing trend for ${title}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData.map(v => ({ value: v }))}>
              <defs>
                <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#sparkline-gradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default KpiCard;