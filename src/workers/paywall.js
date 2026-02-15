export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';
    
    if (userAgent.includes('GPTBot') || userAgent.includes('Google-Extended') || url.pathname.includes('/zh/')) {
      // AI or paywall path
      const paymentReq = {
        facilitator: 'https://facilitator.coinbase.com',  // CDP facilitator
        network: 'eip155:8453',  // Base
        amount: '0.001',
        currency: 'USDC'
      };
      
      return new Response('Payment Required for AI access', {
        status: 402,
        headers: {
          'Payment-Required': JSON.stringify(paymentReq),
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Proxy or normal
    // For full, fetch original content after verify Payment-Signature
    const originalUrl = `https://blog.juchunko.com${url.pathname}${url.search}`;
    const response = await fetch(originalUrl, request);
    return response;
  }
};