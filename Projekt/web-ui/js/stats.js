const productStats = {};

function updateStats(agg) {
  const productId = agg.PRODUCT_ID_VALUE || 'Unknown';
  
  productStats[productId] = {
    count: (productStats[productId]?.count || 0) + agg.REVIEW_COUNT,
    avg: agg.AVG_RATING
  };
  
  renderStats();
}

function renderStats() {
  const container = document.getElementById('stats');
  
  container.innerHTML = Object.entries(productStats).map(([id, stats]) => `
    <div class="bg-gray-700 rounded p-4 text-center">
      <div class="text-lg font-bold">${id}</div>
      <div class="text-2xl text-blue-400">${stats.avg.toFixed(1)} ★</div>
      <div class="text-sm text-gray-400">${stats.count} reviews</div>
    </div>
  `).join('');
}