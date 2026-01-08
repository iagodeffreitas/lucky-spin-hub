# 🔗 Integração com Sistemas de Pagamento

## Como integrar a roleta com seu sistema de pagamentos

### 1. **Mercado Pago**

```javascript
// Após confirmação do pagamento, chame a função do Supabase
const { data, error } = await supabase.rpc('create_purchase_with_token', {
  p_user_email: 'cliente@email.com',
  p_user_name: 'Nome do Cliente',
  p_external_id: 'MP_' + payment_id, // ID único do Mercado Pago
  p_payment_platform: 'mercado_pago',
  p_amount: 97.00
});

if (data.success) {
  // Redirecionar cliente para a roleta
  window.location.href = data.wheel_url;
  
  // Ou enviar por email
  sendEmailWithWheelAccess(data.user_email, data.wheel_url);
}
```

### 2. **Kiwify**

```javascript
// Webhook do Kiwify
app.post('/webhook/kiwify', async (req, res) => {
  const { order_status, Customer, order_id } = req.body;
  
  if (order_status === 'paid') {
    const { data } = await supabase.rpc('create_purchase_with_token', {
      p_user_email: Customer.email,
      p_user_name: Customer.full_name,
      p_external_id: 'KIWIFY_' + order_id,
      p_payment_platform: 'kiwify',
      p_amount: parseFloat(req.body.order_total)
    });
    
    if (data.success) {
      // Enviar email com acesso
      await sendWheelAccessEmail(Customer.email, data.wheel_url);
    }
  }
  
  res.status(200).send('OK');
});
```

### 3. **PagSeguro**

```javascript
// Notificação do PagSeguro
app.post('/webhook/pagseguro', async (req, res) => {
  const notificationCode = req.body.notificationCode;
  
  // Consultar transação no PagSeguro
  const transaction = await consultPagSeguroTransaction(notificationCode);
  
  if (transaction.status === '3') { // Paga
    const { data } = await supabase.rpc('create_purchase_with_token', {
      p_user_email: transaction.sender.email,
      p_user_name: transaction.sender.name,
      p_external_id: 'PS_' + transaction.code,
      p_payment_platform: 'pagseguro',
      p_amount: parseFloat(transaction.grossAmount)
    });
    
    if (data.success) {
      await sendWheelAccessEmail(transaction.sender.email, data.wheel_url);
    }
  }
  
  res.status(200).send('OK');
});
```

### 4. **Hotmart**

```javascript
// Webhook do Hotmart
app.post('/webhook/hotmart', async (req, res) => {
  const { event, data: hotmartData } = req.body;
  
  if (event === 'PURCHASE_APPROVED') {
    const { data } = await supabase.rpc('create_purchase_with_token', {
      p_user_email: hotmartData.buyer.email,
      p_user_name: hotmartData.buyer.name,
      p_external_id: 'HM_' + hotmartData.purchase.transaction,
      p_payment_platform: 'hotmart',
      p_amount: parseFloat(hotmartData.purchase.price.value)
    });
    
    if (data.success) {
      await sendWheelAccessEmail(hotmartData.buyer.email, data.wheel_url);
    }
  }
  
  res.status(200).send('OK');
});
```

## 📧 Template de Email

```javascript
async function sendWheelAccessEmail(email, wheelUrl) {
  const emailTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
        <h1>🎉 Parabéns pela Compra!</h1>
        <p>Obrigado por adquirir nossos indicadores MT5!</p>
      </div>
      
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #333;">🎰 Você ganhou 5 giros na Roleta de Prêmios!</h2>
        
        <p>Como agradecimento pela sua compra, você tem direito a girar nossa roleta exclusiva e concorrer a prêmios incríveis!</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${wheelUrl}" 
             style="background: linear-gradient(45deg, #ff6b6b, #ee5a24); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold;
                    display: inline-block;">
            🎰 GIRAR ROLETA AGORA
          </a>
        </div>
        
        <p><strong>Seus prêmios podem incluir:</strong></p>
        <ul>
          <li>💰 Mesa proprietária de $30.000</li>
          <li>🎁 Bônus em créditos</li>
          <li>📚 Mentoria VIP exclusiva</li>
          <li>📈 E-books de estratégias avançadas</li>
        </ul>
        
        <p><small>Este link é exclusivo para você. Você tem 5 tentativas para ganhar prêmios!</small></p>
      </div>
    </div>
  `;
  
  // Enviar email usando seu provedor preferido
  await sendEmail({
    to: email,
    subject: '🎰 Parabéns! Você ganhou acesso à Roleta de Prêmios!',
    html: emailTemplate
  });
}
```

## 🔧 Configuração das URLs

Configure seus webhooks para apontar para:

- **Mercado Pago**: `https://seudominio.com/webhook/mercadopago`
- **Kiwify**: `https://seudominio.com/webhook/kiwify`  
- **PagSeguro**: `https://seudominio.com/webhook/pagseguro`
- **Hotmart**: `https://seudominio.com/webhook/hotmart`

## 🎯 Fluxo Completo

1. **Cliente compra** seu indicador MT5
2. **Sistema de pagamento** confirma a compra
3. **Webhook** chama `create_purchase_with_token`
4. **Token único** é gerado para o cliente
5. **Email** é enviado com link da roleta
6. **Cliente acessa** a roleta com 5 giros
7. **Resultados** são salvos no banco de dados

## 🔒 Segurança

- Cada token é único e válido apenas para um cliente
- Tokens não expiram (cliente pode voltar depois)
- Controle rigoroso de tentativas (máximo 5 giros)
- Logs completos de todas as ações