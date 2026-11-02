import { db } from '../src/lib/db'
import { FeeService } from '../src/lib/fees/fee-service'

async function testRzp() {
  const tenantId = '002de364-5bb5-4200-83db-3021e748b659'
  const secrets = await FeeService.getDecryptedGatewaySecrets(tenantId)
  console.log('Provider:', secrets.provider)
  console.log('KeyId:', secrets.keyId ? `${secrets.keyId.slice(0, 10)}...` : 'N/A')
  console.log('Has KeySecret:', !!secrets.keySecret)

  if (secrets.keyId && secrets.keySecret) {
    const auth = Buffer.from(`${secrets.keyId}:${secrets.keySecret}`).toString('base64')
    try {
      const res = await fetch('https://api.razorpay.com/v1/orders?count=1', {
        headers: { Authorization: `Basic ${auth}` },
      })
      console.log('Razorpay Sandbox HTTP status:', res.status)
      const data = await res.json()
      console.log('Razorpay response summary:', data.entity ? 'valid entity' : data.error?.description || data)
    } catch (err: any) {
      console.error('Network fetch error:', err.message)
    }
  }
}

testRzp().finally(() => db.$disconnect())
