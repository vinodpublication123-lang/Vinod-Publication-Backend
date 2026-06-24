// Part 1 – helpers + auth + data-setup
'use strict';
const E = pm => `pm.environment`;  // unused – just a note

function ev(lines){ return { listen:'test', script:{ type:'text/javascript', exec: Array.isArray(lines)?lines:[lines] }}; }
function pre(lines){ return { listen:'prerequest', script:{ type:'text/javascript', exec: Array.isArray(lines)?lines:[lines] }}; }
function url(path){ return { raw:`{{baseUrl}}${path}`, host:['{{baseUrl}}'], path:path.replace(/^\//,'').split('/') }; }
function hdr(auth){
  const h=[{key:'Content-Type',value:'application/json'}];
  if(auth) h.push({key:'Authorization',value:`Bearer {{${auth}}}`});
  return h;
}
function guard(vars){
  return vars.map(v=>`pm.test("ENV: ${v} is set", ()=>{ pm.expect(pm.environment.get("${v}"), "${v} was not generated yet – run Setup folders first").to.be.ok; });`);
}
function jsonBody(obj){ return { mode:'raw', raw:JSON.stringify(obj,null,2) }; }
function req(name,method,path,body,auth,events){
  const item={name,request:{method,header:hdr(auth),url:url(path)},event:[]};
  if(body) item.request.body=jsonBody(body);
  if(events) item.event=Array.isArray(events)?events:[events];
  return item;
}
function folder(name,items){ return {name,item:items}; }

const TS = ()=> `Date.now()`;

// ── FOLDER 0: Environment Validation ─────────────────────────────
const f0 = folder('00 – Environment Validation',[
  {
    name:'Validate baseUrl is set',
    event:[ev([
      `pm.test("baseUrl is configured", ()=>{ pm.expect(pm.environment.get("baseUrl")||pm.collectionVariables.get("baseUrl"), "Set baseUrl in environment before running").to.be.ok; });`,
      `pm.test("baseUrl points to server", ()=>{ pm.expect(pm.response.code).to.be.oneOf([200,404]); });`,
    ])],
    request:{ method:'GET', header:[], url:url('/') }
  }
]);

// ── FOLDER 1: Auth Setup ──────────────────────────────────────────
const custEmail = `"test_"+Date.now()+"@vinverse-auto.com"`;
const f1 = folder('01 – Auth Setup',[
  {
    name:'[SETUP] Register Customer',
    event:[
      pre([`pm.environment.set("_custEmail","test_"+Date.now()+"@vinverse-auto.com");`]),
      ev([
        `pm.test("Register 201", ()=>pm.response.to.have.status(201));`,
        `const d=pm.response.json().data;`,
        `if(d&&d.accessToken){`,
        `  pm.environment.set("accessToken",d.accessToken);`,
        `  pm.environment.set("refreshToken",d.refreshToken||"");`,
        `  pm.environment.set("userId",d.user&&d.user.id||"");`,
        `  pm.test("accessToken saved", ()=>pm.expect(d.accessToken).to.be.a("string"));`,
        `  pm.test("userId saved", ()=>pm.expect(d.user.id).to.be.a("string"));`,
        `}`
      ])
    ],
    request:{
      method:'POST', header:hdr(null), url:url('/auth/register'),
      body:{ mode:'raw', raw:`{"name":"Auto Test User","email":"{{_custEmail}}","password":"AutoTest@123!"}` }
    }
  },
  {
    name:'[SETUP] Admin Login',
    event:[ev([
      `pm.test("Admin login 200", ()=>pm.response.to.have.status(200));`,
      `const d=pm.response.json().data;`,
      `if(d&&d.accessToken){`,
      `  pm.environment.set("adminAccessToken",d.accessToken);`,
      `  pm.environment.set("auditActorId",d.user&&d.user.id||"");`,
      `  pm.test("adminAccessToken saved", ()=>pm.expect(d.accessToken).to.be.a("string"));`,
      `  pm.test("auditActorId saved", ()=>pm.expect(d.user.id).to.be.a("string"));`,
      `}`
    ])],
    request:{
      method:'POST', header:hdr(null), url:url('/auth/login'),
      body:jsonBody({ email:'{{adminEmail}}', password:'{{adminPassword}}' })
    }
  },
  req('[VERIFY] Get Me – Customer','GET','/auth/me',null,'accessToken',[ev([
    `pm.test("Me 200", ()=>pm.response.to.have.status(200));`,
    `pm.test("Role is CUSTOMER", ()=>pm.expect(pm.response.json().data.role).to.equal("CUSTOMER"));`,
  ])]),
  req('[VERIFY] Get Me – Admin','GET','/auth/me',null,'adminAccessToken',[ev([
    `pm.test("Me 200", ()=>pm.response.to.have.status(200));`,
    `pm.test("Role is ADMIN", ()=>pm.expect(pm.response.json().data.role).to.equal("ADMIN"));`,
  ])]),
]);

// ── FOLDER 2: Data Setup (Admin) ─────────────────────────────────
const f2 = folder('02 – Data Setup (Admin)',[
  {
    name:'[SETUP] Create Book Product',
    event:[ev([
      ...guard(['adminAccessToken']),
      `pm.test("Create product 201", ()=>pm.response.to.have.status(201));`,
      `const d=pm.response.json().data;`,
      `if(d){`,
      `  pm.environment.set("productId",d.id||"");`,
      `  const book=d.book||{};`,
      `  pm.environment.set("bookId",book.id||"");`,
      `  pm.environment.set("bookSlug",book.slug||"");`,
      `  pm.test("productId saved", ()=>pm.expect(d.id).to.be.a("string"));`,
      `  pm.test("bookSlug saved", ()=>pm.expect(book.slug).to.be.a("string").and.not.empty);`,
      `}`
    ])],
    request:{
      method:'POST', header:hdr('adminAccessToken'), url:url('/products'),
      body:jsonBody({
        name:'Auto Test Book '+new Date().toISOString().slice(0,10),
        sku:'AUTO-TST-'+Date.now().toString().slice(-6),
        category:'BOOK',
        price:499,
        status:'ACTIVE',
        globalStock:50,
        trackStock:true,
        book:{
          title:'Auto Test Book Title',
          genre:'Fiction',
          shortDescription:'Automated test book',
          qrEnabled:true,
          qrSongTitle:'Test Song',
          qrSongUrl:'https://example.com/song.mp3',
          author:{ name:'Auto Test Author', shortBio:'Test author bio' }
        }
      })
    }
  },
  {
    name:'[SETUP] Create Customer Address',
    event:[ev([
      ...guard(['accessToken','userId']),
      `pm.test("Address 201", ()=>pm.response.to.have.status(201));`,
      `const d=pm.response.json().data;`,
      `if(d&&d.id){ pm.environment.set("addressId",d.id); pm.test("addressId saved",()=>pm.expect(d.id).to.be.a("string")); }`
    ])],
    request:{
      method:'POST', header:hdr('accessToken'), url:url('/addresses'),
      body:jsonBody({ fullName:'Auto Test User', phone:'9999999999', line1:'123 Test Street', city:'Chennai', state:'Tamil Nadu', postalCode:'600001', country:'India', isDefault:true })
    }
  },
  {
    name:'[SETUP] Add Book to Cart',
    event:[ev([
      ...guard(['accessToken','productId']),
      `pm.test("Cart 200/201", ()=>pm.expect(pm.response.code).to.be.oneOf([200,201]));`,
      `const d=pm.response.json().data;`,
      `const item=(d&&d.items&&d.items[0])||d;`,
      `const itemId=item&&item.id||"";`,
      `if(itemId){ pm.environment.set("cartItemId",itemId); pm.test("cartItemId saved",()=>pm.expect(itemId).to.be.a("string")); }`
    ])],
    request:{
      method:'POST', header:hdr('accessToken'), url:url('/cart/items'),
      body:jsonBody({ productId:'{{productId}}', quantity:1 })
    }
  },
  {
    name:'[SETUP] Checkout – Create Order',
    event:[ev([
      ...guard(['accessToken','addressId']),
      `pm.test("Checkout 201", ()=>pm.response.to.have.status(201));`,
      `const d=pm.response.json().data;`,
      `if(d&&d.id){ pm.environment.set("orderId",d.id); pm.test("orderId saved",()=>pm.expect(d.id).to.be.a("string")); }`
    ])],
    request:{
      method:'POST', header:hdr('accessToken'), url:url('/orders/checkout'),
      body:jsonBody({ addressId:'{{addressId}}' })
    }
  },
]);

module.exports = { f0, f1, f2, ev, pre, url, hdr, guard, jsonBody, req, folder };
