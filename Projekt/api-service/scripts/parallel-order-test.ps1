param(
  # Target endpoint for REST Route 2; defaults to local Nest instance.
  [string]$ApiUrl = $(if ($env:API_URL) { $env:API_URL } else { 'http://localhost:3000/orders' }),
  # Number of requests per run (both sequential and parallel).
  [int]$Count = $(if ($env:COUNT) { [int]$env:COUNT } else { 2 }),
  # Modes: sequential, parallel, or both (sequential then parallel).
  [string]$Mode = $(if ($env:MODE) { $env:MODE } else { 'both' }),
  # Foreign-key reference to an existing customer.
  [int]$CustomerId = $(if ($env:CUSTOMER_ID) { [int]$env:CUSTOMER_ID } else { 1 }),
  # Foreign-key reference to an existing product (string ID from products.csv).
  [string]$ProductId = $(if ($env:PRODUCT_ID) { $env:PRODUCT_ID } else { 'zfdoss' }),
  # Payload details for the order positions.
  [int]$Quantity = $(if ($env:QUANTITY) { [int]$env:QUANTITY } else { 1 }),
  [decimal]$BuyingPrice = $(if ($env:BUYING_PRICE) { [decimal]$env:BUYING_PRICE } else { 19.99 })
)

function Show-Usage {
  Write-Host @"
Usage: parallel-order-test.ps1 [-ApiUrl <url>] [-Count <n>] [-Mode <parallel|sequential|both>]
                               [-CustomerId <id>] [-ProductId <id>] [-Quantity <val>] [-BuyingPrice <val>]

You can also configure API_URL, COUNT, MODE, CUSTOMER_ID, PRODUCT_ID, QUANTITY, BUYING_PRICE environment variables.
"@
}

if ($PSBoundParameters.ContainsKey('Help') -or $Mode -eq '-h' -or $Mode -eq '--help') {
  Show-Usage
  exit 0
}

$Mode = $Mode.ToLowerInvariant()
if ($Mode -notin @('parallel', 'sequential', 'both')) {
  Write-Error "Unsupported mode '$Mode'. Use parallel, sequential or both."
  exit 1
}

function New-OrderPayload {
  # Build a minimal JSON payload that matches CreateOrderDto.
  return [pscustomobject]@{
    orderDate = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    customerId = $CustomerId
    positions = @(
      [pscustomobject]@{
        productId = $ProductId
        quantity = $Quantity
        buyingPrice = $BuyingPrice
      }
    )
  }
}

function Invoke-OrderRequest {
  param(
    [Parameter(Mandatory = $true)]
    [psobject]$Payload
  )

  # Fire a single POST /orders call and discard the response body.
  Invoke-RestMethod -Uri $ApiUrl -Method Post -ContentType 'application/json' `
    -Body ($Payload | ConvertTo-Json -Depth 4) | Out-Null
}

function Run-Test {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TestMode
  )

  Write-Host ""
  Write-Host "Running $TestMode test with $Count request(s) → $ApiUrl"
  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    if ($TestMode -eq 'sequential') {
      # Sequential: one request after the other, measuring total runtime.
      for ($i = 0; $i -lt $Count; $i++) {
        Invoke-OrderRequest -Payload (New-OrderPayload)
      }
    }
    else {
      # Parallel: Start-Job launches background jobs concurrently.
      $jobs = @()
      for ($i = 0; $i -lt $Count; $i++) {
        $payload = New-OrderPayload
        $jobs += Start-Job -ScriptBlock {
          param($InnerUrl, $InnerPayload)
          Invoke-RestMethod -Uri $InnerUrl -Method Post -ContentType 'application/json' `
            -Body ($InnerPayload | ConvertTo-Json -Depth 4) | Out-Null
        } -ArgumentList $ApiUrl, $payload
      }

      # Wait for all jobs to complete, collect errors, then clean them up.
      $completed = Wait-Job -Job $jobs
      $completed | Receive-Job | Out-Null
      $jobs | Remove-Job | Out-Null
    }
  }
  finally {
    $stopwatch.Stop()
  }

  $duration = "{0:N0}" -f $stopwatch.Elapsed.TotalMilliseconds
  Write-Host "$TestMode test finished in $duration ms"
}

switch ($Mode) {
  'sequential' { Run-Test -TestMode 'sequential' }
  'parallel' { Run-Test -TestMode 'parallel' }
  'both' {
    Run-Test -TestMode 'sequential'
    Run-Test -TestMode 'parallel'
  }
}
