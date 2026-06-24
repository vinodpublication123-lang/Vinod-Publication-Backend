const fs = require('fs');
const c = JSON.parse(fs.readFileSync('VINVERSE_PHASE4_POSTMAN_COLLECTION.json','utf8'));

const payments = c.item.find(f => f.name === '3. PAYMENTS');
const createOrder = payments.item.find(i => i.name === 'POST /payments/create-order');

createOrder.event[0].script.exec = [
  "pm.test('orderId was generated', function() { pm.expect(pm.environment.get('orderId'), 'orderId not set — run 0.SETUP first').to.be.ok; });",
  "var code = pm.response.code;",
  "pm.test('201 created or 503 not configured — never 500', function() { pm.expect(code).to.be.oneOf([201, 503]); });",
  "if (code === 201) {",
  "  var d = pm.response.json().data;",
  "  pm.environment.set('razorpayOrderId', d.razorpayOrderId);",
  "  pm.test('razorpayOrderId captured', function() { pm.expect(d.razorpayOrderId).to.be.a('string').and.not.empty; });",
  "  pm.test('amount in paise', function() { pm.expect(d.amount).to.be.a('number').and.gt(0); });",
  "  pm.test('currency is INR', function() { pm.expect(d.currency).to.eql('INR'); });",
  "} else {",
  "  pm.test('503 Razorpay not configured — structured error', function() { pm.response.to.have.status(503); });",
  "  pm.test('error message is string', function() { pm.expect(pm.response.json().message).to.be.a('string'); });",
  "  pm.test('success=false', function() { pm.expect(pm.response.json().success).to.be.false; });",
  "}"
];

fs.writeFileSync('VINVERSE_PHASE4_POSTMAN_COLLECTION.json', JSON.stringify(c, null, 2));
console.log('✅ Collection updated — payment test now expects 201|503, never 500.');
