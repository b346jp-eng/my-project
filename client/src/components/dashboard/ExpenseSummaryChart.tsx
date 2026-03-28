import { useEffect, useState } from 'react';
import { Card, Spin, Empty } from 'antd';
import ReactECharts from 'echarts-for-react';
import api from '../../api/client';
import { SummaryItem } from '../../types';
import { fenToYuan, CATEGORY_COLORS } from '../../utils/formatters';

export default function ExpenseSummaryChart() {
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/expenses/summary')
      .then((data: unknown) => setSummary(data as SummaryItem[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pieData = summary
    .filter(s => s.total_fen > 0)
    .map(s => ({
      name: s.category_label,
      value: fenToYuan(s.total_fen),
      itemStyle: { color: CATEGORY_COLORS[s.category] || '#aaa' },
    }));

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: 'bold' },
        },
        data: pieData,
      },
    ],
  };

  return (
    <Card
      title="支出分类占比"
      bordered={false}
      style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', height: '100%' }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : pieData.length === 0 ? (
        <Empty description="暂无支出数据" />
      ) : (
        <ReactECharts option={option} style={{ height: 300 }} />
      )}
    </Card>
  );
}
