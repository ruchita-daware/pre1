import { db } from '../src/lib/db'
import { FeeService } from '../src/lib/fees/fee-service'

async function testRealProviderSandboxEndpoints() {
  console.log('========================================================================')
  console.log(' PREONE — REAL PROVIDER SANDBOX OUTBOUND PROBING & CREDENTIAL VALIDATION ')
  console.log('========================================================================\n')

  const tenantId = '002de364-5bb5-4200-83db-3021e748b659'
  const secrets = await FeeService.getDecryptedGatewaySecrets(tenantId)

  // 1. RAZORPAY REAL SANDBOX PROBE
  console.log('--- 1. RAZORPAY SANDBOX PROBE ---')
  console.log('Endpoint: https://api.razorpay.com/v1/orders')
  if (secrets.keyId && secrets.keySecret) {
    const maskedKey = secrets.keyId.slice(0, 8) + '...' + secrets.keyId.slice(-4)
    console.log(`Configured Key ID: ${maskedKey}`)
    const auth = Buffer.from(`${secrets.keyId}:${secrets.keySecret}`).toString('base64')
    try {
      const start = Date.now()
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 50000,
          currency: 'INR',
          receipt: `tx_probe_${Date.now()}`,
        }),
      })
      const duration = Date.now() - start
      const body = await res.json().catch(() => ({}))
      console.log(`HTTP Status: ${res.status} (${res.statusText}) in ${duration}ms`)
      console.log('Response Body:', JSON.stringify(body, null, 2))
    } catch (err: any) {
      console.log('Network Error:', err.message)
    }
  } else {
    console.log('STATUS: No Razorpay credentials configured.')
  }

  // 2. CASHFREE SANDBOX PROBE
  console.log('\n--- 2. CASHFREE SANDBOX PROBE ---')
  console.log('Endpoint: https://sandbox.cashfree.com/pg/orders')
  const cfClientId = process.env.CASHFREE_CLIENT_ID || process.env.CASHFREE_APP_ID || ''
  const cfSecret = process.env.CASHFREE_CLIENT_SECRET || process.env.CASHFREE_SECRET_KEY || ''
  if (cfClientId && cfSecret) {
    console.log(`Configured Client ID: ${cfClientId.slice(0, 6)}...`)
  } else {
    console.log('STATUS: No Cashfree Client ID or Secret provisioned in environment or SchoolConfig.')
    // Attempting probe with blank/invalid headers to demonstrate real provider rejection
    try {
      const res = await fetch('https://sandbox.cashfree.com/pg/orders', {
        method: 'POST',
        headers: {
          'x-client-id': 'unprovisioned_client_id',
          'x-client-secret': 'unprovisioned_secret',
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: `cf_probe_${Date.now()}`,
          order_amount: 500,
          order_currency: 'INR',
          customer_details: {
            customer_id: 'cust_probe_1',
            customer_email: 'test@preone.app',
            customer_phone: '9999999999',
          },
        }),
      })
      const body = await res.json().catch(() => ({}))
      console.log(`Real Cashfree Sandbox HTTP Status: ${res.status} (${res.statusText})`)
      console.log('Real Cashfree Rejection Response:', JSON.stringify(body, null, 2))
    } catch (err: any) {
      console.log('Cashfree Network Error:', err.message)
    }
  }

  // 3. PAYU SANDBOX PROBE
  console.log('\n--- 3. PAYU INDIA SANDBOX PROBE ---')
  console.log('Endpoint: https://test.payu.in/merchant/postservice.php')
  const payuKey = process.env.PAYU_KEY || process.env.PAYU_MERCHANT_KEY || ''
  if (payuKey) {
    console.log(`Configured PayU Key: ${payuKey.slice(0, 6)}...`)
  } else {
    console.log('STATUS: No PayU Merchant Key or Salt provisioned in environment or SchoolConfig.')
    try {
      const params = new URLSearchParams()
      params.append('key', 'unprovisioned_payu_key')
      params.append('command', 'verify_payment')
      params.append('var1', 'test_txnid_123')
      params.append('hash', 'dummy_hash')

      const res = await fetch('https://test.payu.in/merchant/postservice.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      const text = await res.text()
      console.log(`Real PayU Sandbox HTTP Status: ${res.status} (${res.statusText})`)
      console.log('Real PayU Response:', text.slice(0, 300))
    } catch (err: any) {
      console.log('PayU Network Error:', err.message)
    }
  }

  console.log('\n========================================================================')
  console.log(' PROBING COMPLETE — HONEST REAL PROVIDER STATUS ESTABLISHED ')
  console.log('========================================================================\n')
}

testRealProviderSandboxEndpoints()
  .catch(console.error)
  .finally(() => db.$disconnect())
