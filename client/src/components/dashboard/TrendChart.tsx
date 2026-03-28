import { useEffect, useState } from 'react';
import { Card, DatePicker, Spin, Empty } from 'antd';
import ReactECharts from 'echarts-for-react';
import dayjs, { Dayjs } from 'dayjs';
import api from '../../api/client';
import { BalanceSnapshot } from '../../types';
import { fenToYuan } from '../../utils/formatters';

const { RangePicker } = DatePicker;

export default function TrendChart() {
  const [snapshots, setSnapshots] = useState<BalanceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);

  useEffect(() => {
    setLoading(true);
    api.get('/balance/history', {
      params: {
        from: dateRange[0].format('YYYY-MM-DD'),
        to: dateRange[1].format('YYYY-MM-DD'),
      },
    })
      .then((data: unknown) => setSnapshots(data as BalanceSnapshot[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dateRange]);

  const dates = snapshots.map(s => s.snapshot_date);
  const cashValues = snapshots.map(s => fenToYuan(s.cash_fen));
  const payablesValues = snapshots.map(s => fenToYuan(s.payables_fen));

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: { name: string; seriesName: string; value: number }[]) => {
        return `${params[0].name}<br/>${params.map(p =>
          `${p.seriesName}: ¥${p.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
        ).join('<br/>')}`;
      },
    },
    legend: {
      data: ['现金余额', '应付货款'],
      bottom: 0,
    },
    grid: { left: '3%', right: '4%', bottom: '40px', containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (v: number) => {
          if (Math.abs(v) >= 10000) return `¥${(v / 10000).toFixed(1)}万`;
          return `¥${v}`;
        },
      },
    },
    series: [
      {
        name: '现金余额',
        type: 'line',
        data: cashValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color: '#52c41a', width: 2 },
        itemStyle: { color: '#52c41a' },
        areaStyle: { color: 'rgba(82,196,26,0.08)' },
      },
      {
        name: '应付货款',
        type: 'line',
        data: payablesValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color: '#fa8c16', width: 2 },
        itemStyle: { color: '#fa8c16' },
        areaStyle: { color: 'rgba(250,140,22,0.08)' },
      },
    ],
  };

  return (
    <Card
      title="余额趋势"
      bordered={false}
      style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      extra={
        <RangePicker
          value={dateRange}
          onChange={v => { if (v?.[0] && v?.[1]) setDateRange([v[0], v[1]]); }}
          format="YYYY-MM-DD"
          allowClear={false}
        />
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : snapshots.length === 0 ? (
        <Empty description="暂无数据，请先导入钉钉OA数据" />
      ) : (
        <ReactECharts option={option} style={{ height: 300 }} />
      )}
    </Card>
  );
}
