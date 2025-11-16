#!/usr/bin/env bash
set -euo pipefail

API_URL=${API_URL:-http://localhost:3000/orders}
COUNT=${COUNT:-2}
MODE=${MODE:-both} # both | parallel | sequential
CUSTOMER_ID=${CUSTOMER_ID:-1}
PRODUCT_ID=${PRODUCT_ID:-zfdoss}
QUANTITY=${QUANTITY:-1}
BUYING_PRICE=${BUYING_PRICE:-19.99}

usage() {
  cat <<'USAGE'
Usage: scripts/parallel-order-test.sh [options]

Options:
  -a, --api-url <url>        Override target endpoint (default: http://localhost:3000/orders)
  -c, --count <n>            Number of POST requests to fire (default: 2)
  -m, --mode <mode>          Mode: parallel, sequential, or both (default: both)
      --customer-id <id>     Customer id to use in payload (default: 1)
      --product-id <id>      Product id to reference (default: 1)
      --quantity <qty>       Quantity per order position (default: 1)
      --buying-price <val>   Buying price per position (default: 19.99)
  -h, --help                 Show this help.

Environment variables with the same names can also be used.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -a|--api-url) API_URL=$2; shift 2 ;;
    -c|--count) COUNT=$2; shift 2 ;;
    -m|--mode) MODE=$2; shift 2 ;;
    --customer-id) CUSTOMER_ID=$2; shift 2 ;;
    --product-id) PRODUCT_ID=$2; shift 2 ;;
    --quantity) QUANTITY=$2; shift 2 ;;
    --buying-price) BUYING_PRICE=$2; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

build_payload() {
  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
  cat <<JSON
{
  "orderDate": "$now",
  "customerId": $CUSTOMER_ID,
  "positions": [
    {
      "productId": "$PRODUCT_ID",
      "quantity": $QUANTITY,
      "buyingPrice": $BUYING_PRICE
    }
  ]
}
JSON
}

send_request() {
  local payload
  payload=$(build_payload)
  curl --fail-with-body -sS \
    -H 'Content-Type: application/json' \
    -X POST "$API_URL" \
    --data "$payload" \
    >/dev/null
}

run_mode() {
  local mode=$1
  echo ""
  echo "Running $mode test with $COUNT request(s) → $API_URL"
  local start_ms end_ms duration
  start_ms=$(date +%s%3N)

  if [[ "$mode" == "parallel" ]]; then
    for ((i=0; i<COUNT; i++)); do
      send_request &
    done
    wait
  else
    for ((i=0; i<COUNT; i++)); do
      send_request
    done
  fi

  end_ms=$(date +%s%3N)
  duration=$((end_ms - start_ms))
  echo "$mode test finished in ${duration} ms"
}

case "$MODE" in
  both)
    run_mode sequential
    run_mode parallel
    ;;
  sequential)
    run_mode sequential
    ;;
  parallel)
    run_mode parallel
    ;;
  *)
    echo "Unsupported MODE value: $MODE" >&2
    usage
    exit 1
    ;;
esac
