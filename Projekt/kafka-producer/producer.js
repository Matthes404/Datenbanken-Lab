const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'amzn-producer',
  brokers: ['kafka:9092']
});

const producer = kafka.producer();

// Fake product IDs
const productIds = ['B001', 'B002', 'B003', 'B004', 'B005'];

// Sample review texts (some with bad words to test filtering)
const reviewTexts = [
  'Great product, love it!',
  'Terrible quality, fuck this',
  'Average, nothing special',
  'This is shit, waste of money',
  'Excellent value for the price',
  'Would recommend to friends',
  'Broke after one week',
  'Best purchase ever!'
];

function randomReview() {
  return {
    product_id: productIds[Math.floor(Math.random() * productIds.length)],
    rating: Math.floor(Math.random() * 5) + 1,
    review_text: reviewTexts[Math.floor(Math.random() * reviewTexts.length)],
    timestamp: new Date().toISOString()
  };
}

async function run() {
  await producer.connect();
  console.log('Producer connected to Kafka');

  const rate = parseInt(process.env.RATE) || 1; // reviews per second
  const intervalMs = 1000 / rate;

  setInterval(async () => {
    const review = randomReview();
    await producer.send({
      topic: 'raw-reviews',
      messages: [{ value: JSON.stringify(review) }]
    });
    console.log('Sent:', review);
  }, intervalMs);
}

run().catch(console.error);