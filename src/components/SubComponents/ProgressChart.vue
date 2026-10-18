<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'
import type { ProgressPoint } from '@/data/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const props = defineProps<{
  points: ProgressPoint[]
}>()

const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))

const chartData = computed<ChartData<'line'>>(() => ({
  labels: props.points.map((_, index) => `#${index + 1}`),
  datasets: [
    {
      label: 'Review score',
      data: props.points.map((point) => point.percentage),
      borderColor: '#54877B',
      backgroundColor: 'rgba(84, 135, 123, 0.12)',
      pointBackgroundColor: '#54877B',
      pointBorderColor: '#FFFFFF',
      pointRadius: 5,
      pointHoverRadius: 7,
      borderWidth: 3,
      tension: 0.25,
      fill: true,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,

  interaction: {
    mode: 'nearest',
    intersect: false,
  },

  plugins: {
    legend: {
      display: false,
    },

    tooltip: {
      callbacks: {
        title: (items) => {
          const point = props.points[items[0]?.dataIndex ?? 0]
          return point ? formatDate(point.startedAt) : ''
        },

        label: (item) => {
          const point = props.points[item.dataIndex]

          if (!point) return ''

          return `${point.percentage.toFixed(1)}% (${point.score}/${point.totalPoints})`
        },
      },
    },
  },

  scales: {
    x: {
      title: {
        display: true,
        text: 'Review attempt (earliest to latest)',
      },

      grid: {
        display: false,
      },

      ticks: {
        autoSkip: true,
        maxTicksLimit: 10,
      },
    },

    y: {
      min: 0,
      max: 100,

      title: {
        display: true,
        text: 'Score (%)',
      },

      ticks: {
        stepSize: 20,
        callback: (value) => `${value}%`,
      },
    },
  },
}))
</script>

<template>
  <div
    class="progress-chart"
    role="img"
    :aria-label="`Line chart showing ${points.length} review scores in chronological order`"
  >
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.progress-chart {
  position: relative;
  width: 100%;
  height: 360px;
  font-family: var(--font-ui);
}

@media (max-width: 600px) {
  .progress-chart {
    height: 280px;
  }
}
</style>
