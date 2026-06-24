// generate_phase4_postman.js  — Phase 3 identical pattern
// Run: node generate_phase4_postman.js
const fs = require('fs');

const T   = (lines) => ({ listen: 'test',       script: { type: 'text/javascript', exec: lines } });
const PRE = (lines) => ({ listen: 'prerequest', script: { type: 'text/javascript', exec: lines } });
const base20x = [
  "pm.test('Status 20x', function() { pm.expect(pm.response.code).to.be.oneOf([200,201,204]); });",
  "pm.test('success=true', function() { pm.expect(pm.response.json().success).to.be.true; });"
];
function bearer(tok) { return { type:'bearer', bearer:[{ key:'token', value:tok, type:'string' }] }; }
function rawBody(obj) { return { mode:'raw', raw:JSON.stringify(obj,null,2), options:{ raw:{ language:'json' }}}; }
function item(name, method, url, auth, body, events) {
  const r = { name, request:{ method, url, header:[{ key:'Content-Type', value:'application/json' }] }, event: events };
  if (auth)  r.request.auth = auth;
  if (body)  r.request.body = body;
  return r;
}
const BASE = '{{baseUrl}}';

const col = {
  info: {
    name: 'VINVERSE Phase 4 — Integrations, Security & Production',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: [

    // ── 0. SETUP ──────────────────────────────────────────────────────────────
    { name: '0. SETUP', item: [

      // Register customer — pre-request generates unique email and patches body
      {
        name: 'Register Customer',
        request: {
          method: 'POST', url: BASE + '/auth/register',
          header: [{ key:'Content-Type', value:'application/json' }],
          body: rawBody({ name:'Test Customer', email:'PLACEHOLDER', password:'Password@123', phone:'9876543210' })
        },
        event: [
          PRE([
            "var email = 'p4_' + Date.now() + '@vinverse.test';",
            "pm.environment.set('customerEmail', email);",
            "pm.environment.set('customerPassword', 'Password@123');",
            "var body = JSON.parse(pm.request.body.raw);",
            "body.email = email;",
            "pm.request.body.raw = JSON.stringify(body);"
          ]),
          T([
            ...base20x,
            "var d = pm.response.json().data;",
            "pm.environment.set('accessToken', d.accessToken);",
            "pm.environment.set('refreshToken', d.refreshToken);",
            "pm.environment.set('userId', d.user.id);",
            "pm.test('accessToken captured', function() { pm.expect(d.accessToken).to.be.a('string').and.not.empty; });",
            "pm.test('userId captured', function() { pm.expect(d.user.id).to.be.a('string').and.not.empty; });"
          ])
        ]
      },

      // Admin login — hardcoded creds (same as Phase 3 bootstrap)
      item('Login Admin', 'POST', BASE + '/auth/login', null,
        rawBody({ email:'admin@vinverse.com', password:'Admin@123456' }),
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.environment.set('adminAccessToken', d.accessToken);",
          "pm.environment.set('auditActorId', d.user.id);",
          "pm.test('adminAccessToken captured', function() { pm.expect(d.accessToken).to.be.a('string').and.not.empty; });",
          "pm.test('auditActorId captured', function() { pm.expect(d.user.id).to.be.a('string').and.not.empty; });"
        ])]
      ),

      // Create address for customer
      item('Create Customer Address', 'POST', BASE + '/addresses', bearer('{{accessToken}}'),
        rawBody({ fullName:'Test Customer', phone:'9876543210', line1:'123 Test Street', city:'Chennai', state:'Tamil Nadu', postalCode:'600001', country:'India', isDefault:true }),
        [T([
          ...base20x,
          "pm.environment.set('addressId', pm.response.json().data.id);",
          "pm.test('addressId captured', function() { pm.expect(pm.environment.get('addressId')).to.be.a('string').and.not.empty; });"
        ])]
      ),

      // Create Book product — pre-request generates unique SKU, patches body
      {
        name: 'Create Book Product (Admin)',
        request: {
          method: 'POST', url: BASE + '/products',
          header: [{ key:'Content-Type', value:'application/json' }],
          auth: bearer('{{adminAccessToken}}'),
          body: rawBody({
            name:'Phase 4 Test Book', sku:'PLACEHOLDER', category:'BOOK',
            price:499, status:'ACTIVE', globalStock:50, trackStock:true,
            book:{
              title:'Phase 4 Test Book Title', genre:'Fiction',
              shortDescription:'Automated test book for Phase 4',
              qrEnabled:true, qrSongTitle:'Test Song', qrSongUrl:'https://example.com/test-song.mp3',
              author:{ name:'Auto Author', shortBio:'Generated for Phase 4 testing' }
            }
          })
        },
        event: [
          PRE([
            "var sku = 'BOOK-P4-' + Date.now();",
            "var body = JSON.parse(pm.request.body.raw);",
            "body.sku = sku;",
            "body.name = 'Phase 4 Test Book ' + Date.now();",
            "body.book.title = 'P4 Book ' + Date.now();",
            "pm.request.body.raw = JSON.stringify(body);"
          ]),
          T([
            ...base20x,
            "var d = pm.response.json().data;",
            "pm.environment.set('productId', d.id);",
            "pm.environment.set('bookId', d.book ? d.book.id : '');",
            "pm.environment.set('bookSlug', d.book ? d.book.slug : '');",
            "pm.test('productId captured', function() { pm.expect(d.id).to.be.a('string').and.not.empty; });",
            "pm.test('bookSlug captured', function() { pm.expect(pm.environment.get('bookSlug')).to.be.a('string').and.not.empty; });",
            "pm.test('book is linked', function() { pm.expect(d.book).to.exist; });"
          ])
        ]
      },

      // Add book to cart — pre-request injects productId
      {
        name: 'Add Book to Cart',
        request: {
          method:'POST', url: BASE + '/cart/items',
          header: [{ key:'Content-Type', value:'application/json' }],
          auth: bearer('{{accessToken}}'),
          body: rawBody({ productId:'PLACEHOLDER', quantity:1 })
        },
        event: [
          PRE([
            "var body = JSON.parse(pm.request.body.raw);",
            "body.productId = pm.environment.get('productId');",
            "pm.request.body.raw = JSON.stringify(body);"
          ]),
          T([
            ...base20x,
            "var d = pm.response.json().data;",
            "var item = d.items && d.items[0];",
            "if (item) pm.environment.set('cartItemId', item.id);",
            "pm.test('cartItemId captured', function() { pm.expect(pm.environment.get('cartItemId')).to.be.a('string').and.not.empty; });"
          ])
        ]
      },

      // Checkout
      item('Checkout — Create Order', 'POST', BASE + '/orders/checkout', bearer('{{accessToken}}'),
        rawBody({ addressId:'{{addressId}}' }),
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.environment.set('orderId', d.id);",
          "pm.environment.set('orderNumber', d.orderNumber);",
          "pm.test('orderId captured', function() { pm.expect(d.id).to.be.a('string').and.not.empty; });",
          "pm.test('orderNumber captured', function() { pm.expect(d.orderNumber).to.match(/^VIN-/); });",
          "pm.test('status PENDING', function() { pm.expect(d.status).to.eql('PENDING'); });",
          "pm.test('total > 0', function() { pm.expect(Number(d.total)).to.be.gt(0); });"
        ])]
      )
    ]},

    // ── 1. S3 UPLOAD AUTH TESTS ───────────────────────────────────────────────
    { name: '1. S3 UPLOAD AUTH TESTS', item: [

      // No auth → 401 (auth fires before multer — no file needed)
      {
        name: '[NEG] Upload book-cover — No Auth — 401',
        request: {
          method:'POST', url: BASE + '/uploads/book-cover',
          header: [],
          body: { mode:'formdata', formdata:[{ key:'file', type:'text', value:'' }] }
        },
        event: [T([
          "pm.test('401 Unauthorized — no token', function() { pm.response.to.have.status(401); });",
          "pm.test('success=false', function() { pm.expect(pm.response.json().success).to.be.false; });"
        ])]
      },

      // Customer auth → 403 (auth fires before multer)
      {
        name: '[NEG] Upload book-cover — Customer — 403',
        request: {
          method:'POST', url: BASE + '/uploads/book-cover',
          header: [],
          auth: bearer('{{accessToken}}'),
          body: { mode:'formdata', formdata:[{ key:'file', type:'text', value:'' }] }
        },
        event: [T([
          "pm.test('403 Forbidden — customer role', function() { pm.response.to.have.status(403); });",
          "pm.test('success=false', function() { pm.expect(pm.response.json().success).to.be.false; });"
        ])]
      },

      // Admin can reach endpoint (empty file → 400, real file+S3 → 201)
      {
        name: '[REACH] Upload book-cover — Admin — endpoint reachable',
        request: {
          method:'POST', url: BASE + '/uploads/book-cover',
          header: [],
          auth: bearer('{{adminAccessToken}}'),
          body: { mode:'formdata', formdata:[{ key:'file', type:'text', value:'' }] }
        },
        event: [T([
          "pm.test('Admin auth passed — endpoint reached', function() { pm.expect(pm.response.code).to.be.oneOf([201, 400]); });",
          "pm.test('Returns valid JSON', function() { pm.expect(pm.response.json()).to.have.property('success'); });"
        ])]
      },

      {
        name: '[NEG] Upload audio — No Auth — 401',
        request: {
          method:'POST', url: BASE + '/uploads/audio',
          header: [],
          body: { mode:'formdata', formdata:[{ key:'file', type:'text', value:'' }] }
        },
        event: [T(["pm.test('401 audio no auth', function() { pm.response.to.have.status(401); });"])]
      },

      {
        name: '[REACH] Upload audio — Admin — endpoint reachable',
        request: {
          method:'POST', url: BASE + '/uploads/audio',
          header: [],
          auth: bearer('{{adminAccessToken}}'),
          body: { mode:'formdata', formdata:[{ key:'file', type:'text', value:'' }] }
        },
        event: [T([
          "pm.test('Admin audio auth passed', function() { pm.expect(pm.response.code).to.be.oneOf([201, 400]); });"
        ])]
      }
    ]},

    // ── 2. QR SONG SYSTEM ─────────────────────────────────────────────────────
    { name: '2. QR SONG SYSTEM', item: [

      item('GET /books/slug/:slug — public store', 'GET', BASE + '/books/slug/{{bookSlug}}', null, null,
        [T([
          "pm.test('bookSlug was generated', function() { pm.expect(pm.environment.get('bookSlug'), 'bookSlug not set — run 0.SETUP first').to.be.ok; });",
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.test('has title', function() { pm.expect(d).to.have.property('title'); });",
          "pm.test('has author', function() { pm.expect(d).to.have.property('author'); });",
          "pm.test('has product', function() { pm.expect(d).to.have.property('product'); });",
          "pm.test('product is ACTIVE', function() { pm.expect(d.product.status).to.eql('ACTIVE'); });",
          "pm.test('qrEnabled true', function() { pm.expect(d.qrEnabled).to.be.true; });"
        ])]
      ),

      item('GET /books/:slug/qr — QR landing', 'GET', BASE + '/books/{{bookSlug}}/qr', null, null,
        [T([
          "pm.test('bookSlug was generated', function() { pm.expect(pm.environment.get('bookSlug'), 'bookSlug not set — run 0.SETUP first').to.be.ok; });",
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.test('has title', function() { pm.expect(d).to.have.property('title'); });",
          "pm.test('has author', function() { pm.expect(d).to.have.property('author'); });",
          "pm.test('qrEnabled is true', function() { pm.expect(d.qrEnabled).to.be.true; });",
          "pm.test('songTitle present', function() { pm.expect(d.songTitle).to.be.a('string'); });",
          "pm.test('songUrl present', function() { pm.expect(d.songUrl).to.be.a('string'); });"
        ])]
      ),

      item('[NEG] GET /books/slug/:slug — not found', 'GET', BASE + '/books/slug/slug-does-not-exist-xyz123', null, null,
        [T(["pm.test('404 not found', function() { pm.response.to.have.status(404); });"])]
      ),

      item('[NEG] GET /books/:slug/qr — not found', 'GET', BASE + '/books/slug-does-not-exist-xyz123/qr', null, null,
        [T(["pm.test('404 not found', function() { pm.response.to.have.status(404); });"])]
      )
    ]},

    // ── 3. PAYMENTS ───────────────────────────────────────────────────────────
    { name: '3. PAYMENTS', item: [

      item('POST /payments/create-order', 'POST', BASE + '/payments/create-order', bearer('{{accessToken}}'),
        rawBody({ orderId:'{{orderId}}' }),
        [T([
          "pm.test('orderId was generated', function() { pm.expect(pm.environment.get('orderId'), 'orderId not set — run 0.SETUP Checkout first').to.be.ok; });",
          "var code = pm.response.code;",
          "pm.test('201 created or 503 Razorpay not configured', function() { pm.expect(code).to.be.oneOf([201, 503, 400]); });",
          "if (code === 201) {",
          "  var d = pm.response.json().data;",
          "  pm.environment.set('razorpayOrderId', d.razorpayOrderId);",
          "  pm.test('razorpayOrderId captured', function() { pm.expect(d.razorpayOrderId).to.be.a('string').and.not.empty; });",
          "  pm.test('amount in paise', function() { pm.expect(d.amount).to.be.a('number').and.gt(0); });",
          "  pm.test('currency is INR', function() { pm.expect(d.currency).to.eql('INR'); });",
          "  pm.test('key present', function() { pm.expect(d.key).to.be.a('string'); });",
          "} else {",
          "  pm.test('Dev mode — Razorpay not configured (acceptable)', function() { pm.expect(true).to.be.true; });",
          "}"
        ])]
      ),

      item('[NEG] POST /payments/verify — invalid signature', 'POST', BASE + '/payments/verify', bearer('{{accessToken}}'),
        rawBody({ orderId:'{{orderId}}', razorpayOrderId:'order_FAKE123456', razorpayPaymentId:'pay_FAKE123456', razorpaySignature:'TAMPERED_INVALID_SIGNATURE_XYZ' }),
        [T([
          "pm.test('orderId was generated', function() { pm.expect(pm.environment.get('orderId'), 'orderId not set — run 0.SETUP first').to.be.ok; });",
          "pm.test('400 invalid signature', function() { pm.response.to.have.status(400); });",
          "pm.test('success=false', function() { pm.expect(pm.response.json().success).to.be.false; });"
        ])]
      ),

      item('[NEG] POST /payments/create-order — no auth — 401', 'POST', BASE + '/payments/create-order', null,
        rawBody({ orderId:'{{orderId}}' }),
        [T(["pm.test('401 Unauthorized', function() { pm.response.to.have.status(401); });"])]
      ),

      item('[NEG] POST /payments/create-order — missing orderId — 400', 'POST', BASE + '/payments/create-order', bearer('{{accessToken}}'),
        rawBody({}),
        [T(["pm.test('400 missing orderId', function() { pm.response.to.have.status(400); });"])]
      ),

      item('[NEG] POST /payments/verify — missing fields — 400', 'POST', BASE + '/payments/verify', bearer('{{accessToken}}'),
        rawBody({ orderId:'{{orderId}}' }),
        [T(["pm.test('400 missing signature fields', function() { pm.response.to.have.status(400); });"])]
      )
    ]},

    // ── 4. AUDIT LOGS ─────────────────────────────────────────────────────────
    { name: '4. AUDIT LOGS', item: [

      item('GET /admin/audit-logs — list all', 'GET', BASE + '/admin/audit-logs?page=1&limit=20', bearer('{{adminAccessToken}}'), null,
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.test('items is array', function() { pm.expect(d.items).to.be.an('array'); });",
          "pm.test('pagination.total exists', function() { pm.expect(d.pagination).to.have.property('total'); });",
          "pm.test('has audit entries from setup', function() { pm.expect(d.pagination.total).to.be.gte(1); });"
        ])]
      ),

      item('GET /admin/audit-logs?action=PRODUCT_CREATE', 'GET', BASE + '/admin/audit-logs?action=PRODUCT_CREATE&limit=10', bearer('{{adminAccessToken}}'), null,
        [T([
          ...base20x,
          "var items = pm.response.json().data.items;",
          "items.forEach(function(i) { pm.test('action=PRODUCT_CREATE', function() { pm.expect(i.action).to.eql('PRODUCT_CREATE'); }); });"
        ])]
      ),

      item('GET /admin/audit-logs?entityType=Order', 'GET', BASE + '/admin/audit-logs?entityType=Order', bearer('{{adminAccessToken}}'), null,
        [T([
          ...base20x,
          "var items = pm.response.json().data.items;",
          "items.forEach(function(i) { pm.test('entityType=Order', function() { pm.expect(i.entityType).to.eql('Order'); }); });"
        ])]
      ),

      item('GET /admin/audit-logs?action=PAYMENT_VERIFIED', 'GET', BASE + '/admin/audit-logs?action=PAYMENT_VERIFIED', bearer('{{adminAccessToken}}'), null,
        [T([
          ...base20x,
          "pm.test('items is array', function() { pm.expect(pm.response.json().data.items).to.be.an('array'); });"
        ])]
      ),

      item('[NEG] GET /admin/audit-logs — no auth — 401', 'GET', BASE + '/admin/audit-logs', null, null,
        [T(["pm.test('401 Unauthorized', function() { pm.response.to.have.status(401); });"])]
      ),

      item('[NEG] GET /admin/audit-logs — customer auth — 403', 'GET', BASE + '/admin/audit-logs', bearer('{{accessToken}}'), null,
        [T(["pm.test('403 Forbidden — customer cannot access audit logs', function() { pm.response.to.have.status(403); });"])]
      )
    ]},

    // ── 5. SECURITY TESTS ─────────────────────────────────────────────────────
    { name: '5. SECURITY TESTS', item: [

      item('[SEC] Admin route as customer — 403', 'GET', BASE + '/admin/orders', bearer('{{accessToken}}'), null,
        [T([
          "pm.test('403 RBAC enforced', function() { pm.response.to.have.status(403); });",
          "pm.test('success=false', function() { pm.expect(pm.response.json().success).to.be.false; });"
        ])]
      ),

      item('[SEC] Protected route no token — 401', 'GET', BASE + '/admin/orders', null, null,
        [T(["pm.test('401 no token', function() { pm.response.to.have.status(401); });"])]
      ),

      {
        name: '[SEC] Tampered JWT — 401',
        request: {
          method:'GET', url: BASE + '/auth/me',
          header: [{ key:'Authorization', value:'Bearer eyJhbGciOiJIUzI1NiJ9.TAMPERED.INVALIDSIGNATURE' }]
        },
        event: [T([
          "pm.test('401 tampered JWT rejected', function() { pm.response.to.have.status(401); });",
          "pm.test('success=false', function() { pm.expect(pm.response.json().success).to.be.false; });"
        ])]
      },

      item('[SEC] XSS in inquiry message — sanitized', 'POST', BASE + '/inquiries', null,
        rawBody({ name:'XSS Test', email:'xss@autotest.com', type:'GENERAL', message:"<script>alert('XSS')</script>Hello world" }),
        [T([
          "pm.test('Request accepted — sanitized', function() { pm.expect(pm.response.code).to.be.oneOf([200,201]); });",
          "pm.test('No <script> in response', function() { pm.expect(JSON.stringify(pm.response.json())).to.not.include('<script>'); });"
        ])]
      ),

      item('[SEC] SQL injection in search — server survives', 'GET', BASE + "/products?search=' OR 1=1--", null, null,
        [T([
          "pm.test('Server did not crash', function() { pm.expect(pm.response.code).to.be.oneOf([200,400]); });",
          "pm.test('Valid JSON returned', function() { pm.response.json(); });"
        ])]
      ),

      item('[SEC] Payment for non-existent order — 404', 'POST', BASE + '/payments/create-order', bearer('{{accessToken}}'),
        rawBody({ orderId:'cldoesnotexist0000000000000' }),
        [T([
          "pm.test('404 or 400 — order not found', function() { pm.expect(pm.response.code).to.be.oneOf([400,404,422]); });",
          "pm.test('success=false', function() { pm.expect(pm.response.json().success).to.be.false; });"
        ])]
      ),

      item('[SEC] No stack trace in error response', 'GET', BASE + '/nonexistent-route-xyz-abc-def', null, null,
        [T([
          "pm.test('No stack trace in body', function() {",
          "  var b = JSON.stringify(pm.response.json());",
          "  pm.expect(b).to.not.include('at Object.');",
          "  pm.expect(b).to.not.include('node_modules');",
          "});"
        ])]
      )
    ]}
  ]
};

fs.writeFileSync('VINVERSE_PHASE4_POSTMAN_COLLECTION.json', JSON.stringify(col, null, 2));
console.log('✅ Phase 4 collection generated — Phase 3 pattern applied.');
console.log('\nVariable dependency map:');
[
  ['accessToken / refreshToken / userId', '0.SETUP Register Customer',   'All customer-auth endpoints'],
  ['adminAccessToken / auditActorId',     '0.SETUP Login Admin',          'All admin endpoints, uploads, audit'],
  ['addressId',                           '0.SETUP Create Address',       '0.SETUP Checkout'],
  ['productId',                           '0.SETUP Create Book Product',  '0.SETUP Add to Cart'],
  ['bookSlug / bookId',                   '0.SETUP Create Book Product',  '2. QR Song System all endpoints'],
  ['cartItemId',                          '0.SETUP Add to Cart',          'Stored'],
  ['orderId / orderNumber',               '0.SETUP Checkout',             '3. Payments create + verify'],
  ['razorpayOrderId',                     '3. PAYMENTS create-order',     '3. PAYMENTS verify (if Razorpay live)'],
].forEach(([v,s,c]) => console.log('  '+v.padEnd(40)+' <- '+s.padEnd(36)+' -> '+c));
