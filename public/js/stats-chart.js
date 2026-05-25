/**
 * Task distribution charts (bar + pie) using Chart.js
 */

const CHART_COLORS = [
  "#5b8def",
  "#7c5cff",
  "#3dd68c",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#a78bfa",
  "#fb7185",
  "#38bdf8",
  "#f97316",
  "#14b8a6",
  "#eab308",
  "#8b5cf6",
  "#22d3ee",
  "#4ade80",
  "#f472b6",
  "#60a5fa",
  "#c084fc",
];

export function initStatsCharts(apps, canvasBar, canvasPie) {
  const labels = apps.map((a) => a.appDisplay);
  const counts = apps.map((a) => a.taskCount);
  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#5a6b85", font: { size: 11 } },
      },
    },
  };

  const barChart = new Chart(canvasBar, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Tasks",
          data: counts,
          backgroundColor: colors.map((c) => c + "cc"),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      ...commonOptions,
      indexAxis: "y",
      plugins: {
        ...commonOptions.plugins,
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#5a6b85" },
          grid: { color: "rgba(26,36,56,0.08)" },
        },
        y: {
          ticks: { color: "#1a2438", font: { size: 11 } },
          grid: { display: false },
        },
      },
    },
  });

  const pieChart = new Chart(canvasPie, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: counts,
          backgroundColor: colors,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        legend: { position: "right" },
      },
    },
  });

  return { barChart, pieChart };
}
