const MAX_REVIEWS = 20;
const reviews = [];

function addReview(review) {
  reviews.unshift(review);
  if (reviews.length > MAX_REVIEWS) {
    reviews.pop();
  }
  renderReviews();
}

function renderReviews() {
  const container = document.getElementById('reviews');
  
  container.innerHTML = reviews.map(r => {
    const productId = r.PRODUCT_ID || r.product_id;
    const rating = r.RATING || r.rating;
    const reviewText = r.REVIEW_TEXT || r.review_text;
    
    return `
      <div class="review-enter bg-gray-700 rounded p-3">
        <div class="flex justify-between">
          <span class="font-semibold">${productId}</span>
          <span class="text-yellow-400">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>
        </div>
        <p class="text-sm text-gray-300 mt-1">${reviewText}</p>
      </div>
    `;
  }).join('');
}