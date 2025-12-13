const ctx = document.getElementById('chart').getContext('2d');

const chart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: 'Avg Rating',
      data: [],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: true, max: 5 }
    }
  }
});

function updateChart(agg) {
  const time = new Date(agg.WINDOW_END).toLocaleTimeString();
  const productId = agg.PRODUCT_ID_VALUE || 'Unknown';
  const label = `${productId} (${time})`;
  
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(agg.AVG_RATING);
  
  if (chart.data.labels.length > 10) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  
  chart.update();
}