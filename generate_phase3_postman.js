const fs = require('fs');

const T = (lines) => ({ listen: "test", script: { type: "text/javascript", exec: lines } });
const PRE = (lines) => ({ listen: "prerequest", script: { type: "text/javascript", exec: lines } });

const base20x = [
  "pm.test('Status 20x', function() { pm.expect(pm.response.code).to.be.oneOf([200,201,204]); });",
  "pm.test('success=true', function() { pm.expect(pm.response.json().success).to.be.true; });"
];

function bearer(token) {
  return { type: "bearer", bearer: [{ key: "token", value: token, type: "string" }] };
}

function rawBody(obj) {
  return { mode: "raw", raw: JSON.stringify(obj, null, 2), options: { raw: { language: "json" } } };
}

function item(name, method, url, auth, body, events) {
  const r = {
    name,
    request: {
      method,
      url,
      header: [{ key: "Content-Type", value: "application/json" }]
    },
    event: events
  };
  if (auth) r.request.auth = auth;
  if (body) r.request.body = body;
  return r;
}

const BASE = "{{baseUrl}}";

const col = {
  info: {
    name: "VINVERSE Phase 3 — Commerce Engine",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [

    // ── 0. SETUP ─────────────────────────────────────────────────────────────
    { name: "0. SETUP", item: [

      // Register — pre-request sets a unique email AND updates request body dynamically
      {
        name: "Register Customer",
        request: {
          method: "POST",
          url: BASE + "/auth/register",
          header: [{ key: "Content-Type", value: "application/json" }],
          body: rawBody({ name: "Test Customer", email: "PLACEHOLDER", password: "Password@123", phone: "9876543210" })
        },
        event: [
          PRE([
            "var email = 'customer_' + Date.now() + '@vinverse.test';",
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
            "pm.test('accessToken captured', function() { pm.expect(d.accessToken).to.be.a('string').and.not.empty; });",
            "pm.test('refreshToken captured', function() { pm.expect(d.refreshToken).to.be.a('string').and.not.empty; });"
          ])
        ]
      },

      item("Login Admin", "POST", BASE + "/auth/login", null,
        rawBody({ email: "admin@vinverse.com", password: "Admin@123456" }),
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.environment.set('adminAccessToken', d.accessToken);",
          "pm.environment.set('adminRefreshToken', d.refreshToken);",
          "pm.test('adminAccessToken captured', function() { pm.expect(d.accessToken).to.be.a('string').and.not.empty; });"
        ])]
      ),

      item("Create Address", "POST", BASE + "/addresses", bearer("{{accessToken}}"),
        rawBody({ fullName: "Test Customer", phone: "9876543210", line1: "123 Test Street", city: "Chennai", state: "Tamil Nadu", postalCode: "600001", country: "India" }),
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.environment.set('addressId', d.id);",
          "pm.test('addressId captured', function() { pm.expect(d.id).to.be.a('string').and.not.empty; });"
        ])]
      ),

      // Create Apparel — build body in prerequest script to avoid unresolved {{apparelSku}}
      {
        name: "Create Apparel Product",
        request: {
          method: "POST",
          url: BASE + "/products",
          header: [{ key: "Content-Type", value: "application/json" }],
          auth: bearer("{{adminAccessToken}}"),
          body: rawBody({ name: "VINVERSE T-Shirt", sku: "PLACEHOLDER", category: "APPAREL", price: 29.99, status: "ACTIVE", sizes: [{ label: "SMALL", stock: 10 }, { label: "MEDIUM", stock: 15 }, { label: "LARGE", stock: 5 }] })
        },
        event: [
          PRE([
            "var sku = 'TSHIRT-P3-' + Date.now();",
            "pm.environment.set('apparelSku', sku);",
            "var body = JSON.parse(pm.request.body.raw);",
            "body.sku = sku;",
            "pm.request.body.raw = JSON.stringify(body);"
          ]),
          T([
            ...base20x,
            "var d = pm.response.json().data;",
            "pm.environment.set('apparelProductId', d.id);",
            "pm.test('apparelProductId captured', function() { pm.expect(d.id).to.be.a('string').and.not.empty; });",
            "pm.test('Apparel has 3 sizes', function() { pm.expect(d.sizes.length).to.eql(3); });"
          ])
        ]
      },

      // Create Merchandise — same pattern
      {
        name: "Create Merchandise Product",
        request: {
          method: "POST",
          url: BASE + "/products",
          header: [{ key: "Content-Type", value: "application/json" }],
          auth: bearer("{{adminAccessToken}}"),
          body: rawBody({ name: "VINVERSE Mug", sku: "PLACEHOLDER", category: "MERCHANDISE", price: 14.99, status: "ACTIVE", globalStock: 50 })
        },
        event: [
          PRE([
            "var sku = 'MUG-P3-' + Date.now();",
            "pm.environment.set('merchSku', sku);",
            "var body = JSON.parse(pm.request.body.raw);",
            "body.sku = sku;",
            "pm.request.body.raw = JSON.stringify(body);"
          ]),
          T([
            ...base20x,
            "var d = pm.response.json().data;",
            "pm.environment.set('merchProductId', d.id);",
            "pm.test('merchProductId captured', function() { pm.expect(d.id).to.be.a('string').and.not.empty; });"
          ])
        ]
      }
    ]},

    // ── 1. CART ───────────────────────────────────────────────────────────────
    { name: "1. CART", item: [

      item("GET /cart — starts empty", "GET", BASE + "/cart", bearer("{{accessToken}}"), null,
        [T([
          ...base20x,
          "pm.test('cart starts empty', function() { pm.expect(pm.response.json().data.items.length).to.eql(0); });"
        ])]
      ),

      // Add apparel — body built in prerequest so productId is resolved
      {
        name: "POST /cart/items — Add Apparel SMALL x2",
        request: {
          method: "POST",
          url: BASE + "/cart/items",
          header: [{ key: "Content-Type", value: "application/json" }],
          auth: bearer("{{accessToken}}"),
          body: rawBody({ productId: "PLACEHOLDER", sizeLabel: "SMALL", quantity: 2 })
        },
        event: [
          PRE([
            "var body = JSON.parse(pm.request.body.raw);",
            "body.productId = pm.environment.get('apparelProductId');",
            "pm.request.body.raw = JSON.stringify(body);"
          ]),
          T([
            ...base20x,
            "var d = pm.response.json().data;",
            "pm.test('1 item in cart', function() { pm.expect(d.items.length).to.eql(1); });",
            "pm.environment.set('cartItemId', d.items[0].id);",
            "pm.test('cartItemId captured', function() { pm.expect(pm.environment.get('cartItemId')).to.be.a('string'); });",
            "pm.test('subtotal > 0', function() { pm.expect(d.subtotal).to.be.gt(0); });"
          ])
        ]
      },

      {
        name: "POST /cart/items — Add Merchandise x1",
        request: {
          method: "POST",
          url: BASE + "/cart/items",
          header: [{ key: "Content-Type", value: "application/json" }],
          auth: bearer("{{accessToken}}"),
          body: rawBody({ productId: "PLACEHOLDER", quantity: 1 })
        },
        event: [
          PRE([
            "var body = JSON.parse(pm.request.body.raw);",
            "body.productId = pm.environment.get('merchProductId');",
            "pm.request.body.raw = JSON.stringify(body);"
          ]),
          T([
            ...base20x,
            "pm.test('2 items in cart', function() { pm.expect(pm.response.json().data.items.length).to.eql(2); });"
          ])
        ]
      },

      {
        name: "POST /cart/items — Merge: Add SMALL Apparel x1 (total=3)",
        request: {
          method: "POST",
          url: BASE + "/cart/items",
          header: [{ key: "Content-Type", value: "application/json" }],
          auth: bearer("{{accessToken}}"),
          body: rawBody({ productId: "PLACEHOLDER", sizeLabel: "SMALL", quantity: 1 })
        },
        event: [
          PRE([
            "var body = JSON.parse(pm.request.body.raw);",
            "body.productId = pm.environment.get('apparelProductId');",
            "pm.request.body.raw = JSON.stringify(body);"
          ]),
          T([
            ...base20x,
            "var items = pm.response.json().data.items;",
            "pm.test('[MERGE] Still 2 items', function() { pm.expect(items.length).to.eql(2); });",
            "var apparel = items.find(function(i) { return i.sizeLabel === 'SMALL'; });",
            "pm.test('[MERGE] Qty merged to 3', function() { pm.expect(apparel.quantity).to.eql(3); });"
          ])
        ]
      },

      item("GET /cart — view cart with totals", "GET", BASE + "/cart", bearer("{{accessToken}}"), null,
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.test('has 2 items', function() { pm.expect(d.items.length).to.eql(2); });",
          "pm.test('subtotal > 0', function() { pm.expect(d.subtotal).to.be.gt(0); });",
          "pm.test('itemCount is 2', function() { pm.expect(d.itemCount).to.eql(2); });"
        ])]
      ),

      item("PATCH /cart/items/:id — Update quantity to 1", "PATCH", BASE + "/cart/items/{{cartItemId}}", bearer("{{accessToken}}"),
        rawBody({ quantity: 1 }),
        [T([
          ...base20x,
          "var items = pm.response.json().data.items;",
          "var updated = items.find(function(i) { return i.id === pm.environment.get('cartItemId'); });",
          "pm.test('quantity updated to 1', function() { pm.expect(updated.quantity).to.eql(1); });"
        ])]
      ),

      item("DELETE /cart/items/:id — Remove one item", "DELETE", BASE + "/cart/items/{{cartItemId}}", bearer("{{accessToken}}"), null,
        [T([
          ...base20x,
          "pm.test('1 item remains', function() { pm.expect(pm.response.json().data.items.length).to.eql(1); });"
        ])]
      ),

      // Re-add MEDIUM apparel for checkout (merch is still in cart)
      {
        name: "POST /cart/items — Add Apparel MEDIUM (for checkout)",
        request: {
          method: "POST",
          url: BASE + "/cart/items",
          header: [{ key: "Content-Type", value: "application/json" }],
          auth: bearer("{{accessToken}}"),
          body: rawBody({ productId: "PLACEHOLDER", sizeLabel: "MEDIUM", quantity: 1 })
        },
        event: [
          PRE([
            "var body = JSON.parse(pm.request.body.raw);",
            "body.productId = pm.environment.get('apparelProductId');",
            "pm.request.body.raw = JSON.stringify(body);"
          ]),
          T([
            ...base20x,
            "pm.test('2 items ready for checkout', function() { pm.expect(pm.response.json().data.items.length).to.eql(2); });"
          ])
        ]
      }
    ]},

    // ── 2. CHECKOUT ───────────────────────────────────────────────────────────
    { name: "2. CHECKOUT", item: [

      item("POST /orders/checkout", "POST", BASE + "/orders/checkout", bearer("{{accessToken}}"),
        rawBody({ addressId: "{{addressId}}" }),
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.environment.set('orderId', d.id);",
          "pm.environment.set('orderNumber', d.orderNumber);",
          "pm.test('orderId captured', function() { pm.expect(d.id).to.be.a('string'); });",
          "pm.test('VIN- order number', function() { pm.expect(d.orderNumber).to.match(/^VIN-/); });",
          "pm.test('status PENDING', function() { pm.expect(d.status).to.eql('PENDING'); });",
          "pm.test('tracking created', function() { pm.expect(d.tracking).to.exist; });",
          "pm.test('tracking NOT_DISPATCHED', function() { pm.expect(d.tracking.status).to.eql('NOT_DISPATCHED'); });",
          "pm.test('has order items', function() { pm.expect(d.items.length).to.be.gte(1); });",
          "pm.test('total > 0', function() { pm.expect(Number(d.total)).to.be.gt(0); });"
        ])]
      ),

      item("GET /cart — empty after checkout", "GET", BASE + "/cart", bearer("{{accessToken}}"), null,
        [T([
          ...base20x,
          "pm.test('[BIZ] Cart cleared after checkout', function() { pm.expect(pm.response.json().data.items.length).to.eql(0); });"
        ])]
      )
    ]},

    // ── 3. CUSTOMER ORDERS ────────────────────────────────────────────────────
    { name: "3. CUSTOMER ORDERS", item: [

      item("GET /orders — list own orders", "GET", BASE + "/orders", bearer("{{accessToken}}"), null,
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.test('is array', function() { pm.expect(d.items).to.be.an('array'); });",
          "pm.test('has pagination', function() { pm.expect(d.pagination).to.exist; });",
          "pm.test('at least 1 order', function() { pm.expect(d.items.length).to.be.gte(1); });"
        ])]
      ),

      item("GET /orders/:id — own order detail", "GET", BASE + "/orders/{{orderId}}", bearer("{{accessToken}}"), null,
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.test('id matches', function() { pm.expect(d.id).to.eql(pm.environment.get('orderId')); });",
          "pm.test('has items', function() { pm.expect(d.items).to.be.an('array').and.not.empty; });",
          "pm.test('has tracking', function() { pm.expect(d.tracking).to.exist; });",
          "pm.test('has address', function() { pm.expect(d.address).to.exist; });"
        ])]
      ),

      item("GET /orders/:orderId/tracking", "GET", BASE + "/orders/{{orderId}}/tracking", bearer("{{accessToken}}"), null,
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.test('orderId matches', function() { pm.expect(d.orderId).to.eql(pm.environment.get('orderId')); });",
          "pm.test('status NOT_DISPATCHED', function() { pm.expect(d.status).to.eql('NOT_DISPATCHED'); });"
        ])]
      )
    ]},

    // ── 4. ADMIN ORDERS ───────────────────────────────────────────────────────
    { name: "4. ADMIN ORDERS", item: [

      item("GET /admin/orders — all orders", "GET", BASE + "/admin/orders", bearer("{{adminAccessToken}}"), null,
        [T([
          ...base20x,
          "pm.test('has items', function() { pm.expect(pm.response.json().data.items).to.be.an('array'); });",
          "pm.test('has pagination', function() { pm.expect(pm.response.json().data.pagination).to.exist; });"
        ])]
      ),

      item("GET /admin/orders?status=PENDING", "GET", BASE + "/admin/orders?status=PENDING", bearer("{{adminAccessToken}}"), null,
        [T([
          ...base20x,
          "pm.response.json().data.items.forEach(function(o) { pm.test('status=PENDING', function() { pm.expect(o.status).to.eql('PENDING'); }); });"
        ])]
      ),

      item("GET /admin/orders/analytics", "GET", BASE + "/admin/orders/analytics", bearer("{{adminAccessToken}}"), null,
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.test('totalOrders >= 1', function() { pm.expect(d.totalOrders).to.be.gte(1); });",
          "pm.test('revenue >= 0', function() { pm.expect(d.revenue).to.be.gte(0); });",
          "pm.test('has topProducts array', function() { pm.expect(d.topProducts).to.be.an('array'); });",
          "pm.test('has recentOrders array', function() { pm.expect(d.recentOrders).to.be.an('array'); });",
          "pm.test('averageOrderValue >= 0', function() { pm.expect(d.averageOrderValue).to.be.gte(0); });"
        ])]
      ),

      item("GET /admin/orders/:id — full detail", "GET", BASE + "/admin/orders/{{orderId}}", bearer("{{adminAccessToken}}"), null,
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.test('has user', function() { pm.expect(d.user).to.exist; });",
          "pm.test('has items', function() { pm.expect(d.items).to.be.an('array'); });",
          "pm.test('has tracking', function() { pm.expect(d.tracking).to.exist; });"
        ])]
      ),

      item("PATCH /admin/orders/:id/status — CONFIRMED", "PATCH", BASE + "/admin/orders/{{orderId}}/status", bearer("{{adminAccessToken}}"),
        rawBody({ status: "CONFIRMED" }),
        [T([
          ...base20x,
          "pm.test('status=CONFIRMED', function() { pm.expect(pm.response.json().data.status).to.eql('CONFIRMED'); });"
        ])]
      ),

      item("PATCH /admin/orders/:id/status — PROCESSING", "PATCH", BASE + "/admin/orders/{{orderId}}/status", bearer("{{adminAccessToken}}"),
        rawBody({ status: "PROCESSING" }),
        [T([
          ...base20x,
          "pm.test('status=PROCESSING', function() { pm.expect(pm.response.json().data.status).to.eql('PROCESSING'); });"
        ])]
      )
    ]},

    // ── 5. TRACKING ───────────────────────────────────────────────────────────
    { name: "5. TRACKING", item: [

      item("GET /admin/tracking/:orderId", "GET", BASE + "/admin/tracking/{{orderId}}", bearer("{{adminAccessToken}}"), null,
        [T([
          ...base20x,
          "pm.test('tracking exists for order', function() { pm.expect(pm.response.json().data.orderId).to.eql(pm.environment.get('orderId')); });"
        ])]
      ),

      item("PATCH /admin/tracking/:orderId — DISPATCHED", "PATCH", BASE + "/admin/tracking/{{orderId}}", bearer("{{adminAccessToken}}"),
        rawBody({ status: "DISPATCHED", carrier: "FedEx", trackingNumber: "FX1234567890", trackingUrl: "https://fedex.com/track/FX1234567890", notes: "Handed to courier" }),
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.test('status=DISPATCHED', function() { pm.expect(d.status).to.eql('DISPATCHED'); });",
          "pm.test('carrier saved', function() { pm.expect(d.carrier).to.eql('FedEx'); });",
          "pm.test('trackingNumber saved', function() { pm.expect(d.trackingNumber).to.eql('FX1234567890'); });",
          "pm.test('[AUTO] shippedAt set', function() { pm.expect(d.shippedAt).to.not.be.null; });"
        ])]
      ),

      item("PATCH /admin/tracking/:orderId — DELIVERED", "PATCH", BASE + "/admin/tracking/{{orderId}}", bearer("{{adminAccessToken}}"),
        rawBody({ status: "DELIVERED" }),
        [T([
          ...base20x,
          "var d = pm.response.json().data;",
          "pm.test('status=DELIVERED', function() { pm.expect(d.status).to.eql('DELIVERED'); });",
          "pm.test('[AUTO] deliveredAt set', function() { pm.expect(d.deliveredAt).to.not.be.null; });"
        ])]
      )
    ]},

    // ── 6. CANCELLATION ───────────────────────────────────────────────────────
    { name: "6. CANCELLATION", item: [

      // Add fresh item to cart
      {
        name: "SETUP — Add LARGE Apparel for cancel test",
        request: {
          method: "POST",
          url: BASE + "/cart/items",
          header: [{ key: "Content-Type", value: "application/json" }],
          auth: bearer("{{accessToken}}"),
          body: rawBody({ productId: "PLACEHOLDER", sizeLabel: "LARGE", quantity: 1 })
        },
        event: [
          PRE([
            "var body = JSON.parse(pm.request.body.raw);",
            "body.productId = pm.environment.get('apparelProductId');",
            "pm.request.body.raw = JSON.stringify(body);"
          ]),
          T([...base20x])
        ]
      },

      item("SETUP — Checkout for cancel test", "POST", BASE + "/orders/checkout", bearer("{{accessToken}}"),
        rawBody({ addressId: "{{addressId}}" }),
        [T([
          ...base20x,
          "pm.environment.set('cancelOrderId', pm.response.json().data.id);",
          "pm.test('cancelOrderId captured', function() { pm.expect(pm.environment.get('cancelOrderId')).to.be.a('string'); });"
        ])]
      ),

      item("PATCH /orders/:id/cancel — cancel PENDING", "PATCH", BASE + "/orders/{{cancelOrderId}}/cancel", bearer("{{accessToken}}"), null,
        [T([
          ...base20x,
          "pm.test('status=CANCELLED', function() { pm.expect(pm.response.json().data.status).to.eql('CANCELLED'); });"
        ])]
      )
    ]},

    // ── 7. NEGATIVE TESTS ─────────────────────────────────────────────────────
    { name: "7. NEGATIVE TESTS", item: [

      item("[NEG] GET /cart no token — 401", "GET", BASE + "/cart", null, null,
        [T(["pm.test('401 Unauthorized', function() { pm.response.to.have.status(401); });"])]
      ),

      {
        name: "[NEG] POST /cart/items — no sizeLabel for APPAREL — 422",
        request: {
          method: "POST", url: BASE + "/cart/items",
          header: [{ key: "Content-Type", value: "application/json" }],
          auth: bearer("{{accessToken}}"),
          body: rawBody({ productId: "PLACEHOLDER", quantity: 1 })
        },
        event: [
          PRE(["var b = JSON.parse(pm.request.body.raw); b.productId = pm.environment.get('apparelProductId'); pm.request.body.raw = JSON.stringify(b);"]),
          T(["pm.test('422 sizeLabel required', function() { pm.response.to.have.status(422); });"])
        ]
      },

      item("[NEG] POST /cart/items — quantity=0 — 422", "POST", BASE + "/cart/items", bearer("{{accessToken}}"),
        rawBody({ productId: "cm000000000000000000000000", sizeLabel: "SMALL", quantity: 0 }),
        [T(["pm.test('422 quantity>=1 required', function() { pm.response.to.have.status(422); });"])]
      ),

      item("[NEG] POST /orders/checkout — empty cart — 422", "POST", BASE + "/orders/checkout", bearer("{{accessToken}}"),
        rawBody({ addressId: "{{addressId}}" }),
        [T(["pm.test('422 empty cart', function() { pm.response.to.have.status(422); });"])]
      ),

      item("[NEG] Customer access /admin/orders — 403", "GET", BASE + "/admin/orders", bearer("{{accessToken}}"), null,
        [T(["pm.test('403 Forbidden', function() { pm.response.to.have.status(403); });"])]
      ),

      item("[NEG] Invalid status transition — 409", "PATCH", BASE + "/admin/orders/{{orderId}}/status", bearer("{{adminAccessToken}}"),
        rawBody({ status: "PENDING" }),
        [T(["pm.test('409 invalid transition', function() { pm.response.to.have.status(409); });"])]
      ),

      item("[NEG] Cancel already-PROCESSING order — 409", "PATCH", BASE + "/orders/{{orderId}}/cancel", bearer("{{accessToken}}"), null,
        [T(["pm.test('409 cannot cancel PROCESSING', function() { pm.response.to.have.status(409); });"])]
      ),

      item("[NEG] GET nonexistent order — 404", "GET", BASE + "/orders/cm000000000000000000000002", bearer("{{accessToken}}"), null,
        [T(["pm.test('404 not found', function() { pm.response.to.have.status(404); });"])]
      )
    ]}
  ]
};

fs.writeFileSync('VINVERSE_PHASE3_POSTMAN_COLLECTION.json', JSON.stringify(col, null, 2));
console.log('✅ Phase 3 collection generated.');
