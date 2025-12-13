const API_URL = 'http://localhost:3000';

const reviewsSource = new EventSource(`${API_URL}/events/reviews`);
const aggregatesSource = new EventSource(`${API_URL}/events/aggregates`);

reviewsSource.onmessage = (e) => {
  const review = JSON.parse(e.data);
  addReview(review);
};

aggregatesSource.onmessage = (e) => {
  const aggregate = JSON.parse(e.data);
  updateChart(aggregate);
  updateStats(aggregate);
};