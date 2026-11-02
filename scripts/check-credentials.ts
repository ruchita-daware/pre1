import { db } from '../src/lib/db'
import { EncryptionService } from '../src/lib/security/encryption-service'

async function check() {
  const configs = await db.schoolConfig.findMany({
    where: { domain: 'FINANCE' },
  })
  console.log('Finance configs count:', configs.length)
  for (const c of configs) {
    const data = c.data as any
    if (data?.paymentGateway) {
      const gw = data.paymentGateway
      let decryptedKeySecret = false
      if (gw.keySecret) {
        try {
          const dec = EncryptionService.decrypt(gw.keySecret, c.tenantId)
          if (dec && dec.length > 3) decryptedKeySecret = true
        } catch {}
      }
      console.log({
        tenantId: c.tenantId,
        provider: gw.provider,
        mode: gw.mode,
        enabled: gw.enabled,
        keyId: gw.keyId ? gw.keyId.slice(0, 10) + '...' : 'none',
        hasDecryptedSecret: decryptedKeySecret,
      })
    }
  }

  console.log('ENV keys:')
  console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'SET' : 'NOT SET')
  console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'NOT SET')
  console.log('CASHFREE_APP_ID / KEY_ID:', process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID ? 'SET' : 'NOT SET')
  console.log('PAYU_KEY / MERCHANT_KEY:', process.env.PAYU_KEY || process.env.PAYU_MERCHANT_KEY ? 'SET' : 'NOT SET')
}

check()
  .catch(console.error)
  .finally(() => db.$disconnect())
