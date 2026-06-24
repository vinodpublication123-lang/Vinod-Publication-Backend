const fs = require('fs');

const T = (lines) => ({ listen: "test", script: { type: "text/javascript", exec: lines } });
const PRE = (lines) => ({ listen: "prerequest", script: { type: "text/javascript", exec: lines } });

const baseTests = [
  "pm.test('Status 20x', () => pm.expect(pm.response.code).to.be.oneOf([200,201,204]));",
  "pm.test('success=true', () => pm.expect(pm.response.json().success).to.be.true);"
];

function req(name, method, path, auth, body, events) {
  const r = {
    name,
    request: {
      method,
      url: "{{baseUrl}}" + path,
      header: [{ key: "Content-Type", value: "application/json" }]
    },
    event: events
  };
  if (auth) r.request.auth = { type: "bearer", bearer: [{ key: "token", value: auth, type: "string" }] };
  if (body) r.request.body = { mode: "raw", raw: JSON.stringify(body, null, 2), options: { raw: { language: "json" } } };
  return r;
}

const col = {
  info: {
    name: "VINVERSE Phase 2 — Fully Automated",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    // ─── 1. HEALTH ───────────────────────────────────────────────────────────
    { name: "1. HEALTH", item: [
      req("Health Check", "GET", "/health", null, null, [
        T([...baseTests,
          "pm.test('DB connected', () => pm.expect(pm.response.json().data.database).to.eql('connected'));"
        ])
      ])
    ]},

    // ─── 2. AUTH ─────────────────────────────────────────────────────────────
    { name: "2. AUTH", item: [
      // Register — unique email every run
      {
        name: "Register Customer",
        request: {
          method: "POST",
          url: "{{baseUrl}}/auth/register",
          header: [{ key: "Content-Type", value: "application/json" }],
          body: {
            mode: "raw",
            raw: '{\n  "name": "Test Customer",\n  "email": "{{customerEmail}}",\n  "password": "Password@123",\n  "phone": "9876543210"\n}',
            options: { raw: { language: "json" } }
          }
        },
        event: [
          PRE([
            "var ts = Date.now();",
            "pm.environment.set('customerEmail', 'customer_' + ts + '@vinverse.test');",
            "pm.environment.set('customerPassword', 'Password@123');"
          ]),
          T([...baseTests,
            "var d = pm.response.json().data;",
            "pm.environment.set('accessToken', d.accessToken);",
            "pm.environment.set('refreshToken', d.refreshToken);",
            "pm.test('accessToken captured', () => pm.expect(d.accessToken).to.be.a('string').and.not.empty);",
            "pm.test('refreshToken captured', () => pm.expect(d.refreshToken).to.be.a('string').and.not.empty);"
          ])
        ]
      },

      // Login Admin
      req("Login Admin", "POST", "/auth/login", null,
        { email: "admin@vinverse.com", password: "Admin@123456" },
        [T([...baseTests,
          "var d = pm.response.json().data;",
          "pm.environment.set('adminAccessToken', d.accessToken);",
          "pm.environment.set('adminRefreshToken', d.refreshToken);",
          "pm.test('adminAccessToken captured', () => pm.expect(d.accessToken).to.be.a('string').and.not.empty);"
        ])]
      ),

      // Refresh customer token
      req("Refresh Token", "POST", "/auth/refresh", null,
        { refreshToken: "{{refreshToken}}" },
        [T([...baseTests,
          "var d = pm.response.json().data;",
          "pm.environment.set('accessToken', d.accessToken);",
          "pm.test('new accessToken captured', () => pm.expect(d.accessToken).to.be.a('string').and.not.empty);"
        ])]
      ),

      // Get Me (customer)
      req("Get Me", "GET", "/auth/me", "{{accessToken}}", null,
        [T([...baseTests,
          "var d = pm.response.json().data;",
          "pm.test('has email', () => pm.expect(d.email).to.exist);",
          "pm.test('role is CUSTOMER', () => pm.expect(d.role).to.eql('CUSTOMER'));"
        ])]
      )
    ]},

    // ─── 3. USERS ─────────────────────────────────────────────────────────────
    { name: "3. USERS", item: [
      req("Get Profile", "GET", "/users/me", "{{accessToken}}", null,
        [T([...baseTests,
          "pm.test('has id', () => pm.expect(pm.response.json().data.id).to.exist);"
        ])]
      ),
      req("Update Profile", "PATCH", "/users/me", "{{accessToken}}",
        { name: "Updated Customer" },
        [T([...baseTests,
          "pm.test('name updated', () => pm.expect(pm.response.json().data.name).to.eql('Updated Customer'));"
        ])]
      ),
      req("Change Password", "PATCH", "/users/password", "{{accessToken}}",
        { currentPassword: "Password@123", newPassword: "NewPassword@123" },
        [T(baseTests)]
      )
    ]},

    // ─── 4. ADDRESSES ─────────────────────────────────────────────────────────
    { name: "4. ADDRESSES", item: [
      req("Create Address", "POST", "/addresses", "{{accessToken}}",
        { fullName: "John Doe", phone: "1234567890", line1: "123 Main St", city: "Chennai", state: "Tamil Nadu", postalCode: "600001", country: "India" },
        [T([...baseTests,
          "var d = pm.response.json().data;",
          "pm.environment.set('addressId', d.id);",
          "pm.test('addressId captured', () => pm.expect(d.id).to.be.a('string').and.not.empty);"
        ])]
      ),
      req("List Addresses", "GET", "/addresses", "{{accessToken}}", null,
        [T([...baseTests,
          "pm.test('is array', () => pm.expect(pm.response.json().data).to.be.an('array'));",
          "pm.test('has created address', () => pm.expect(pm.response.json().data.length).to.be.gte(1));"
        ])]
      ),
      req("Update Address", "PATCH", "/addresses/{{addressId}}", "{{accessToken}}",
        { line2: "Apt 4B" },
        [T([...baseTests,
          "pm.test('line2 updated', () => pm.expect(pm.response.json().data.line2).to.eql('Apt 4B'));"
        ])]
      ),
      req("Delete Address", "DELETE", "/addresses/{{addressId}}", "{{accessToken}}", null,
        [T(baseTests)]
      )
    ]},

    // ─── 5. PRODUCTS ──────────────────────────────────────────────────────────
    { name: "5. PRODUCTS", item: [
      // Create Apparel — uses unique SKU via pre-request
      {
        name: "Create Apparel Product",
        request: {
          method: "POST", url: "{{baseUrl}}/products",
          header: [{ key: "Content-Type", value: "application/json" }],
          auth: { type: "bearer", bearer: [{ key: "token", value: "{{adminAccessToken}}", type: "string" }] },
          body: {
            mode: "raw",
            raw: '{\n  "name": "VINVERSE T-Shirt",\n  "sku": "{{apparelSku}}",\n  "category": "APPAREL",\n  "price": 29.99,\n  "status": "ACTIVE",\n  "sizes": [\n    { "label": "SMALL", "stock": 10 },\n    { "label": "MEDIUM", "stock": 15 },\n    { "label": "LARGE", "stock": 5 }\n  ]\n}',
            options: { raw: { language: "json" } }
          }
        },
        event: [
          PRE(["pm.environment.set('apparelSku', 'TSHIRT-' + Date.now());"]),
          T([...baseTests,
            "var d = pm.response.json().data;",
            "pm.environment.set('apparelProductId', d.id);",
            "pm.test('apparelProductId captured', () => pm.expect(d.id).to.be.a('string').and.not.empty);",
            "pm.test('Apparel sizes persist', () => pm.expect(d.sizes.length).to.eql(3));",
            "pm.test('SMALL size stock=10', () => { var s = d.sizes.find(x => x.label==='SMALL'); pm.expect(s.stock).to.eql(10); });"
          ])
        ]
      },

      // Create Merchandise
      {
        name: "Create Merchandise Product",
        request: {
          method: "POST", url: "{{baseUrl}}/products",
          header: [{ key: "Content-Type", value: "application/json" }],
          auth: { type: "bearer", bearer: [{ key: "token", value: "{{adminAccessToken}}", type: "string" }] },
          body: {
            mode: "raw",
            raw: '{\n  "name": "VINVERSE Mug",\n  "sku": "{{merchSku}}",\n  "category": "MERCHANDISE",\n  "price": 14.99,\n  "status": "ACTIVE",\n  "globalStock": 50\n}',
            options: { raw: { language: "json" } }
          }
        },
        event: [
          PRE(["pm.environment.set('merchSku', 'MUG-' + Date.now());"]),
          T([...baseTests,
            "var d = pm.response.json().data;",
            "pm.environment.set('productId', d.id);",
            "pm.test('productId captured', () => pm.expect(d.id).to.be.a('string').and.not.empty);",
            "pm.test('globalStock=50', () => pm.expect(Number(d.globalStock)).to.eql(50));"
          ])
        ]
      },

      // Create Book Product — captures bookId, authorId
      {
        name: "Create Book Product",
        request: {
          method: "POST", url: "{{baseUrl}}/products",
          header: [{ key: "Content-Type", value: "application/json" }],
          auth: { type: "bearer", bearer: [{ key: "token", value: "{{adminAccessToken}}", type: "string" }] },
          body: {
            mode: "raw",
            raw: '{\n  "name": "The Quantum Enigma",\n  "sku": "{{bookSku}}",\n  "category": "BOOK",\n  "price": 19.99,\n  "status": "ACTIVE",\n  "book": {\n    "title": "The Quantum Enigma",\n    "genre": "Sci-Fi",\n    "shortDescription": "A journey through quantum worlds",\n    "author": {\n      "name": "Arthur C. Clarke",\n      "shortBio": "Legendary Sci-Fi author"\n    }\n  }\n}',
            options: { raw: { language: "json" } }
          }
        },
        event: [
          PRE(["pm.environment.set('bookSku', 'BOOK-' + Date.now());"]),
          T([...baseTests,
            "var d = pm.response.json().data;",
            "pm.environment.set('bookProductId', d.id);",
            "pm.environment.set('bookId', d.book.id);",
            "pm.environment.set('authorId', d.book.author.id);",
            "pm.test('bookProductId captured', () => pm.expect(d.id).to.be.a('string').and.not.empty);",
            "pm.test('bookId captured', () => pm.expect(d.book.id).to.be.a('string').and.not.empty);",
            "pm.test('authorId captured', () => pm.expect(d.book.author.id).to.be.a('string').and.not.empty);",
            "pm.test('[BIZ] Book created under Product', () => pm.expect(d.book).to.exist);",
            "pm.test('[BIZ] Author created under Book', () => pm.expect(d.book.author).to.exist);",
            "pm.test('[BIZ] Author name correct', () => pm.expect(d.book.author.name).to.eql('Arthur C. Clarke'));"
          ])
        ]
      },

      // Create Book Product again with SAME author — verifies author reuse
      {
        name: "[BIZ] Create Book — Reuse Existing Author",
        request: {
          method: "POST", url: "{{baseUrl}}/products",
          header: [{ key: "Content-Type", value: "application/json" }],
          auth: { type: "bearer", bearer: [{ key: "token", value: "{{adminAccessToken}}", type: "string" }] },
          body: {
            mode: "raw",
            raw: '{\n  "name": "Childhood\'s End",\n  "sku": "{{bookSku2}}",\n  "category": "BOOK",\n  "price": 17.99,\n  "status": "ACTIVE",\n  "book": {\n    "title": "Childhood\'s End",\n    "genre": "Sci-Fi",\n    "author": {\n      "name": "Arthur C. Clarke",\n      "shortBio": "Legendary Sci-Fi author"\n    }\n  }\n}',
            options: { raw: { language: "json" } }
          }
        },
        event: [
          PRE(["pm.environment.set('bookSku2', 'BOOK2-' + Date.now());"]),
          T([...baseTests,
            "var d = pm.response.json().data;",
            "pm.environment.set('bookProductId2', d.id);",
            "pm.test('[BIZ] Author reused — same authorId', () => pm.expect(d.book.author.id).to.eql(pm.environment.get('authorId')));",
            "pm.test('[BIZ] No duplicate author created', () => pm.expect(d.book.authorId).to.eql(pm.environment.get('authorId')));"
          ])
        ]
      },

      req("Get Products (public)", "GET", "/products", null, null,
        [T([...baseTests,
          "pm.test('has items', () => pm.expect(pm.response.json().data.items).to.be.an('array'));",
          "pm.test('has pagination', () => pm.expect(pm.response.json().data.pagination).to.exist);"
        ])]
      ),

      req("Get Products — filter BOOK", "GET", "/products?category=BOOK", null, null,
        [T([...baseTests,
          "pm.test('all items are BOOK', () => { pm.response.json().data.items.forEach(p => pm.expect(p.category).to.eql('BOOK')); });"
        ])]
      ),

      req("Get Single Product", "GET", "/products/{{productId}}", null, null,
        [T([...baseTests,
          "pm.test('id matches', () => pm.expect(pm.response.json().data.id).to.eql(pm.environment.get('productId')));"
        ])]
      ),

      req("Update Product", "PATCH", "/products/{{productId}}", "{{adminAccessToken}}",
        { price: 12.99, status: "ACTIVE" },
        [T([...baseTests,
          "pm.test('price updated', () => pm.expect(Number(pm.response.json().data.price)).to.eql(12.99));"
        ])]
      ),

      // Delete the merch product last — after single-get/update tests
      req("Delete Product (Merch)", "DELETE", "/products/{{productId}}", "{{adminAccessToken}}", null,
        [T(baseTests)]
      )
    ]},

    // ─── 6. BOOKS ─────────────────────────────────────────────────────────────
    { name: "6. BOOKS", item: [
      req("List Books", "GET", "/books", "{{adminAccessToken}}", null,
        [T([...baseTests,
          "pm.test('has items', () => pm.expect(pm.response.json().data.items).to.be.an('array'));",
          "pm.test('at least 1 book exists', () => pm.expect(pm.response.json().data.items.length).to.be.gte(1));"
        ])]
      ),
      req("Get Book", "GET", "/books/{{bookId}}", "{{adminAccessToken}}", null,
        [T([...baseTests,
          "pm.test('bookId matches', () => pm.expect(pm.response.json().data.id).to.eql(pm.environment.get('bookId')));",
          "pm.test('has author', () => pm.expect(pm.response.json().data.author).to.exist);"
        ])]
      ),
      req("Update Book", "PATCH", "/books/{{bookId}}", "{{adminAccessToken}}",
        { genre: "Hard Sci-Fi", shortDescription: "Updated description" },
        [T([...baseTests,
          "pm.test('genre updated', () => pm.expect(pm.response.json().data.genre).to.eql('Hard Sci-Fi'));"
        ])]
      )
      // NOTE: Delete Book is intentionally omitted here to keep authorId/bookId available for AUTHORS section
      // Book is deleted via Delete Book Product at end of cleanup
    ]},

    // ─── 7. AUTHORS ───────────────────────────────────────────────────────────
    { name: "7. AUTHORS", item: [
      req("List Authors", "GET", "/authors", "{{adminAccessToken}}", null,
        [T([...baseTests,
          "pm.test('has items', () => pm.expect(pm.response.json().data.items).to.be.an('array'));",
          "pm.test('at least 1 author exists', () => pm.expect(pm.response.json().data.items.length).to.be.gte(1));"
        ])]
      ),
      req("Get Author", "GET", "/authors/{{authorId}}", "{{adminAccessToken}}", null,
        [T([...baseTests,
          "pm.test('authorId matches', () => pm.expect(pm.response.json().data.id).to.eql(pm.environment.get('authorId')));",
          "pm.test('has books', () => pm.expect(pm.response.json().data.books).to.be.an('array'));"
        ])]
      ),
      req("Update Author", "PATCH", "/authors/{{authorId}}", "{{adminAccessToken}}",
        { shortBio: "Updated Bio", status: "ACTIVE" },
        [T([...baseTests,
          "pm.test('bio updated', () => pm.expect(pm.response.json().data.shortBio).to.eql('Updated Bio'));"
        ])]
      ),
      // Delete Author expects 409 because books still exist under this author
      req("Delete Author (expects 409 — books exist)", "DELETE", "/authors/{{authorId}}", "{{adminAccessToken}}", null,
        [T([
          "pm.test('Returns 409 — author has books', () => pm.response.to.have.status(409));"
        ])]
      )
    ]},

    // ─── 8. INQUIRIES ─────────────────────────────────────────────────────────
    { name: "8. INQUIRIES", item: [
      req("Create Inquiry (public)", "POST", "/inquiries", null,
        { name: "Test User", email: "test@vinverse.com", message: "I need help with my order", type: "GENERAL", subject: "Order Query" },
        [T([...baseTests,
          "var d = pm.response.json().data;",
          "pm.environment.set('inquiryId', d.id);",
          "pm.test('inquiryId captured', () => pm.expect(d.id).to.be.a('string').and.not.empty);"
        ])]
      ),
      req("List Inquiries", "GET", "/inquiries", "{{adminAccessToken}}", null,
        [T([...baseTests,
          "pm.test('has items', () => pm.expect(pm.response.json().data.items).to.be.an('array'));"
        ])]
      ),
      req("Get Inquiry", "GET", "/inquiries/{{inquiryId}}", "{{adminAccessToken}}", null,
        [T([...baseTests,
          "pm.test('inquiryId matches', () => pm.expect(pm.response.json().data.id).to.eql(pm.environment.get('inquiryId')));"
        ])]
      ),
      req("Update Inquiry Status", "PATCH", "/inquiries/{{inquiryId}}", "{{adminAccessToken}}",
        { status: "IN_REVIEW" },
        [T([...baseTests,
          "pm.test('status updated to IN_REVIEW', () => pm.expect(pm.response.json().data.status).to.eql('IN_REVIEW'));"
        ])]
      ),
      req("Update Inquiry Status — Resolve", "PATCH", "/inquiries/{{inquiryId}}", "{{adminAccessToken}}",
        { status: "RESOLVED" },
        [T([...baseTests,
          "pm.test('status updated to RESOLVED', () => pm.expect(pm.response.json().data.status).to.eql('RESOLVED'));"
        ])]
      )
    ]},

    // ─── 9. SETTINGS ──────────────────────────────────────────────────────────
    { name: "9. SETTINGS", item: [
      req("Get Settings (public)", "GET", "/settings", null, null,
        [T([...baseTests,
          "pm.test('has storeName', () => pm.expect(pm.response.json().data.storeName).to.exist);"
        ])]
      ),
      req("Update Settings", "PATCH", "/settings", "{{adminAccessToken}}",
        { storeName: "VINVERSE STORE", supportEmail: "support@vinverse.com", currency: "INR", taxEnabled: true },
        [T([...baseTests,
          "var d = pm.response.json().data;",
          "pm.test('[BIZ] storeName persists', () => pm.expect(d.storeName).to.eql('VINVERSE STORE'));",
          "pm.test('supportEmail saved', () => pm.expect(d.supportEmail).to.eql('support@vinverse.com'));",
          "pm.test('currency is INR', () => pm.expect(d.currency).to.eql('INR'));"
        ])]
      ),
      req("Get Settings — verify persistence", "GET", "/settings", null, null,
        [T([...baseTests,
          "pm.test('[BIZ] Settings update persists after re-fetch', () => pm.expect(pm.response.json().data.storeName).to.eql('VINVERSE STORE'));"
        ])]
      )
    ]},

    // ─── 10. NEGATIVE TESTS ───────────────────────────────────────────────────
    { name: "10. NEGATIVE TESTS", item: [
      req("[NEG] Missing Token — GET /users/me", "GET", "/users/me", null, null,
        [T(["pm.test('401 Unauthorized', () => pm.response.to.have.status(401));"])]
      ),
      req("[NEG] Wrong Role — Customer POST /products", "POST", "/products", "{{accessToken}}",
        { name: "Test", sku: "NEG-001", category: "MERCHANDISE", price: 10 },
        [T(["pm.test('403 Forbidden — customer cannot create product', () => pm.response.to.have.status(403));"])]
      ),
      req("[NEG] Invalid Payload — Register with bad email", "POST", "/auth/register", null,
        { email: "not-an-email", password: "short" },
        [T(["pm.test('422 Unprocessable — Zod validation failed', () => pm.response.to.have.status(422));"])]
      ),
      req("[NEG] Invalid ID — GET /products/badid", "GET", "/products/badid", null, null,
        [T(["pm.test('422 or 404', () => pm.expect(pm.response.code).to.be.oneOf([422, 404]));"])]
      ),
      req("[NEG] Missing Book Data — Create BOOK without book field", "POST", "/products", "{{adminAccessToken}}",
        { name: "Bad Book", sku: "BADBOOK-001", category: "BOOK", price: 10 },
        [T(["pm.test('422 — book data required (Zod)', () => pm.response.to.have.status(422));"])]
      ),
      req("[NEG] Admin route without token — GET /books", "GET", "/books", null, null,
        [T(["pm.test('401 Unauthorized', () => pm.response.to.have.status(401));"])]
      )
    ]},

    // ─── 11. CLEANUP ──────────────────────────────────────────────────────────
    { name: "11. CLEANUP", item: [
      req("Delete Book Product 1", "DELETE", "/products/{{bookProductId}}", "{{adminAccessToken}}", null,
        [T(["pm.test('book product 1 deleted', () => pm.expect(pm.response.code).to.be.oneOf([200,201,204]));"])]
      ),
      req("Delete Book Product 2", "DELETE", "/products/{{bookProductId2}}", "{{adminAccessToken}}", null,
        [T(["pm.test('book product 2 deleted', () => pm.expect(pm.response.code).to.be.oneOf([200,201,204]));"])]
      ),
      req("Delete Apparel Product", "DELETE", "/products/{{apparelProductId}}", "{{adminAccessToken}}", null,
        [T(["pm.test('apparel product deleted', () => pm.expect(pm.response.code).to.be.oneOf([200,201,204]));"])]
      ),
      // Now author has no books — delete should succeed
      req("Delete Author (now succeeds)", "DELETE", "/authors/{{authorId}}", "{{adminAccessToken}}", null,
        [T([...baseTests])]
      ),
      req("Logout Customer", "POST", "/auth/logout", null,
        { refreshToken: "{{refreshToken}}" },
        [T([...baseTests,
          "pm.environment.unset('accessToken');",
          "pm.environment.unset('refreshToken');"
        ])]
      )
    ]}
  ]
};

fs.writeFileSync('VINVERSE_Phase2.postman_collection.json', JSON.stringify(col, null, 2));
console.log('✅ Collection generated: VINVERSE_Phase2.postman_collection.json');
