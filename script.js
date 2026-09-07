'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
  remove(key) { try { localStorage.removeItem(key); } catch {} }
};
const session = {
  get(key, fallback = null) { try { return sessionStorage.getItem(key) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { sessionStorage.setItem(key, String(value)); } catch {} },
  remove(key) { try { sessionStorage.removeItem(key); } catch {} }
};

const defaultProducts = [
  {id:'frame-1',category:'Frames',name:'Classic Photo Frame',price:1650,discount:20,stock:true,image:'product-placeholder.svg'},
  {id:'frame-2',category:'Frames',name:'Premium Black Frame',price:2200,discount:20,stock:true,image:'product-placeholder.svg'},
  {id:'frame-3',category:'Frames',name:'Elegant Wooden Frame',price:2800,discount:20,stock:true,image:'product-placeholder.svg'},
  {id:'frame-4',category:'Frames',name:'Gallery Frame 12 × 18',price:4500,discount:20,stock:false,image:'product-placeholder.svg'},
  {id:'frame-5',category:'Frames',name:'Modern White Frame',price:3200,discount:20,stock:true,image:'product-placeholder.svg'},
  {id:'frame-6',category:'Frames',name:'Luxury Gold Frame',price:5200,discount:20,stock:true,image:'product-placeholder.svg'},
  {id:'frame-7',category:'Frames',name:'Family Collage Frame',price:6000,discount:20,stock:true,image:'product-placeholder.svg'},
  {id:'frame-8',category:'Frames',name:'Large Wall Frame',price:8500,discount:20,stock:false,image:'product-placeholder.svg'},
  {id:'mug-1',category:'Mugs',name:'Classic Photo Mug',price:900,discount:20,stock:true,image:'product-placeholder.svg'},
  {id:'mug-2',category:'Mugs',name:'Magic Photo Mug',price:1200,discount:20,stock:true,image:'product-placeholder.svg'},
  {id:'mug-3',category:'Mugs',name:'Couple Photo Mug',price:1100,discount:20,stock:true,image:'product-placeholder.svg'},
  {id:'mug-4',category:'Mugs',name:'Custom Birthday Mug',price:1250,discount:20,stock:false,image:'product-placeholder.svg'},
  {id:'mug-5',category:'Mugs',name:'Family Photo Mug',price:1300,discount:20,stock:true,image:'product-placeholder.svg'},
  {id:'mug-6',category:'Mugs',name:'Premium Gift Mug',price:1500,discount:20,stock:true,image:'product-placeholder.svg'},
  {id:'mug-7',category:'Mugs',name:'Name & Photo Mug',price:1000,discount:20,stock:true,image:'product-placeholder.svg'},
  {id:'mug-8',category:'Mugs',name:'Two-Side Print Mug',price:1400,discount:20,stock:false,image:'product-placeholder.svg'}
];
const defaultDealerAccounts = [{username:'dealer1',password:'Dealer@2026',name:'Demo Dealer',active:true}];
const defaultItemTypes = ['Frames','Mugs'];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function formatMoney(amount) { return `Rs. ${Number(amount || 0).toLocaleString('en-LK')}`; }
function getProducts() {
  const saved = store.get('seethaProducts', null);
  return Array.isArray(saved) ? saved : defaultProducts.map(product => ({...product}));
}
function saveProducts(products) { store.set('seethaProducts', products); }
function getItemTypes() {
  const saved = store.get('seethaItemTypes', null);
  if (Array.isArray(saved)) return [...new Set(saved.map(String).map(v => v.trim()).filter(Boolean))];
  return [...defaultItemTypes];
}
function saveItemTypes(types) { store.set('seethaItemTypes', [...new Set(types.map(String).map(v => v.trim()).filter(Boolean))]); }
function getDealerAccounts() {
  const saved = store.get('seethaDealerAccounts', null);
  return Array.isArray(saved) ? saved : defaultDealerAccounts.map(account => ({...account}));
}
function saveDealerAccounts(accounts) { store.set('seethaDealerAccounts', accounts); }
function dealerPrice(product) {
  const price = Number(product.price || 0);
  const discount = Math.min(100, Math.max(0, Number(product.discount ?? 20)));
  return Math.round(price * (1 - discount / 100));
}

let cart = store.get('seethaCart', []);
if (!Array.isArray(cart)) cart = [];
function saveCart() { store.set('seethaCart', cart); }
function cartCount() { return cart.reduce((sum, item) => sum + Math.max(1, Number(item.qty || 1)), 0); }
function updateWhatsAppCartAction() {
  const button = $('#waUseCart');
  if (!button) return;
  const hasItems = cart.length > 0;
  button.hidden = !hasItems;
  button.disabled = !hasItems;
}
function updateCartBadge(animate = false) {
  $$('.cart-count').forEach(el => {
    el.textContent = cartCount();
    el.setAttribute('aria-label', `${cartCount()} item${cartCount() === 1 ? '' : 's'} in cart`);
    if (animate) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  });
  const orderButton = $('#orderCartButton');
  if (orderButton) orderButton.disabled = cart.length === 0;
  updateWhatsAppCartAction();
  if (animate) {
    $$('.cart-button').forEach(el => {
      el.classList.remove('cart-pulse');
      void el.offsetWidth;
      el.classList.add('cart-pulse');
    });
  }
}
function buttonFeedback(button, state = 'done') {
  if (!button) return;
  button.classList.remove('action-pop', 'action-success');
  void button.offsetWidth;
  button.classList.add('action-pop');
  if (state === 'added') button.classList.add('action-success');
  setTimeout(() => button.classList.remove('action-pop', 'action-success'), 520);
}
window.buttonFeedback = buttonFeedback;
function addProductById(id, mode = 'regular', goToCart = false, button = null) {
  const product = getProducts().find(p => p.id === id);
  if (!product || !product.stock) return;
  if (mode === 'dealer' && !currentDealer()) return;
  const price = mode === 'dealer' ? dealerPrice(product) : Number(product.price || 0);
  const key = `${mode}:${product.id}`;
  const existing = cart.find(item => item.key === key);
  if (existing) existing.qty = Number(existing.qty || 1) + 1;
  else cart.push({key, productId:product.id, name:product.name, category:product.category, price, qty:1, dealer:mode === 'dealer'});
  saveCart();
  updateCartBadge(true);
  buttonFeedback(button, 'added');
  if (goToCart) setTimeout(() => { location.href = 'cart.html'; }, 230);
}
function removeFromCart(key) {
  cart = cart.filter(item => item.key !== key);
  saveCart(); updateCartBadge(); renderCartPage();
}
function changeQty(key, delta) {
  const item = cart.find(entry => entry.key === key);
  if (!item) return;
  item.qty = Math.max(1, Number(item.qty || 1) + Number(delta || 0));
  saveCart(); updateCartBadge(); renderCartPage();
}
window.addProductById = addProductById;
window.removeFromCart = removeFromCart;
window.changeQty = changeQty;

function productCard(product, dealer = false) {
  const mode = dealer ? 'dealer' : 'regular';
  const price = dealer ? dealerPrice(product) : Number(product.price || 0);
  return `<article class="product-card ${product.stock ? '' : 'sold-out'}">
    <div class="product-image"><img src="${escapeHtml(product.image || 'product-placeholder.svg')}" alt="${escapeHtml(product.name)}" onerror="this.src='product-placeholder.svg'"><span class="stock ${product.stock ? 'stock-in' : 'stock-out'}">${product.stock ? 'In Stock' : 'Out of Stock'}</span></div>
    <div class="product-info"><span class="product-type">${escapeHtml(product.category)}</span><h3>${escapeHtml(product.name)}</h3>
      <div class="product-price">${dealer ? `<small>Dealer price</small>` : ''}<strong>${formatMoney(price)}</strong>${dealer ? `<del>${formatMoney(product.price)}</del>` : ''}</div>
      <div class="product-actions">
        <button class="btn btn-ghost btn-small icon-action-btn" title="Add to cart" aria-label="Add ${escapeHtml(product.name)} to cart" ${product.stock ? '' : 'disabled'} onclick="addProductById('${product.id}','${mode}',false,this)"><span class="product-cart-icon" aria-hidden="true">🛒</span></button>
        <button class="btn btn-primary btn-small" ${product.stock ? '' : 'disabled'} onclick="addProductById('${product.id}','${mode}',true,this)">Order Now</button>
      </div>
    </div></article>`;
}
function renderShowcase(category) {
  const grid = $(`[data-showcase="${CSS.escape(category)}"]`);
  if (!grid) return;
  const products = getProducts().filter(p => p.category === category);
  const expanded = grid.dataset.expanded === 'true';
  const visible = expanded ? products : products.slice(0, 4);
  grid.innerHTML = visible.length ? visible.map(p => productCard(p)).join('') : '<div class="empty-state">No products in this category yet.</div>';
  const more = $(`[data-more="${CSS.escape(category)}"]`);
  if (more) {
    more.hidden = products.length <= 4;
    more.textContent = expanded ? 'Show Less' : 'Show More';
  }
}
function toggleShowcase(category) {
  const grid = $(`[data-showcase="${CSS.escape(category)}"]`);
  if (!grid) return;
  grid.dataset.expanded = grid.dataset.expanded === 'true' ? 'false' : 'true';
  renderShowcase(category);
}
window.toggleShowcase = toggleShowcase;

function renderCartPage() {
  const list = $('#fullCartItems');
  const totalEl = $('#cartTotal');
  if (!list || !totalEl) return;
  if (!cart.length) {
    list.innerHTML = '<div class="cart-empty"><span>0</span><h2>Your cart is empty.</h2><p>Browse the catalogue and add a frame or gift.</p><a class="btn btn-primary" href="pricing.html">Browse Products</a></div>';
    totalEl.textContent = formatMoney(0);
    return;
  }
  let total = 0;
  list.innerHTML = cart.map(item => {
    const qty = Math.max(1, Number(item.qty || 1));
    const line = Number(item.price || 0) * qty;
    total += line;
    const safeKey = escapeHtml(item.key || `${item.dealer ? 'dealer' : 'regular'}:${item.productId}`);
    return `<div class="cart-item-row"><div class="cart-item-main"><span class="cart-item-type">${escapeHtml(item.category)}${item.dealer ? ' • Dealer' : ''}</span><strong>${escapeHtml(item.name)}</strong><small>${formatMoney(item.price)} each</small></div><div class="qty-control"><button onclick="changeQty('${safeKey}',-1)" aria-label="Decrease">−</button><span>${qty}</span><button onclick="changeQty('${safeKey}',1)" aria-label="Increase">+</button></div><strong class="line-total">${formatMoney(line)}</strong><button class="remove-line" onclick="removeFromCart('${safeKey}')" aria-label="Remove">×</button></div>`;
  }).join('');
  totalEl.textContent = formatMoney(total);
}
function orderCartWhatsApp() {
  if (!cart.length) return;
  const lines = cart.map(item => `${item.name} x${item.qty || 1} - ${formatMoney(Number(item.price || 0) * Number(item.qty || 1))}${item.dealer ? ' (Dealer)' : ''}`);
  const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  const text = `Hello New Seetha Studio, I would like to place an order:\n\n${lines.join('\n')}\n\nTotal: ${formatMoney(total)}`;
  window.open(`https://wa.me/94711968786?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}
window.orderCartWhatsApp = orderCartWhatsApp;

function renderDynamicProductPricing() {
  const tabs = $('#pricingTypeTabs');
  const results = $('#dynamicProductPricing');
  if (!tabs || !results) return;
  const types = getItemTypes();
  let current = types[0] || '';
  function draw() {
    tabs.innerHTML = types.map(type => `<button class="pricing-tab ${type === current ? 'active' : ''}" data-type="${escapeHtml(type)}"><span>${escapeHtml(type)}</span><b>→</b></button>`).join('');
    $$('.pricing-tab', tabs).forEach(btn => btn.addEventListener('click', () => { current = btn.dataset.type; draw(); }));
    const items = getProducts().filter(p => p.category === current);
    results.innerHTML = `<div class="results-head"><div><span class="kicker">${escapeHtml(current || 'CATALOGUE')}</span><h2>${current ? `${escapeHtml(current)} collection` : 'No categories yet'}</h2></div><span>${items.length} item${items.length === 1 ? '' : 's'}</span></div>${items.length ? `<div class="product-grid">${items.map(p => productCard(p)).join('')}</div>` : '<div class="empty-state large">No products in this category yet.</div>'}`;
  }
  draw();
}

function setupTheme() {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch {}
  const theme = saved === 'light' || saved === 'dark' ? saved : 'dark';
  const btn = $('#themeToggle');

  function updateThemeLogos(currentTheme) {
    const pageLogo = currentTheme === 'light' ? 'logo-light.png' : 'logo.png';
    $$('.brand img, .auth-brand img').forEach(img => {
      if (img.getAttribute('src') !== pageLogo) img.setAttribute('src', pageLogo);
    });
    // The footer always has a dark background, so keep the light-on-dark logo there.
    $$('.footer-brand img').forEach(img => {
      if (img.getAttribute('src') !== 'logo.png') img.setAttribute('src', 'logo.png');
    });
  }

  function applyTheme(currentTheme) {
    root.dataset.theme = currentTheme;
    updateThemeLogos(currentTheme);
    if (btn) {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      btn.textContent = currentTheme === 'dark' ? '☀' : '☾';
      btn.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
      btn.setAttribute('title', `Switch to ${nextTheme} mode`);
    }
  }

  applyTheme(theme);
  if (!btn) return;

  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch {}
  });
}
function setupNavigation() {
  const toggle = $('#menuToggle');
  const nav = $('#mainNav');
  const setNavOpen = open => {
    if (!toggle || !nav) return;
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '×' : '☰';
  };
  if (toggle && nav) toggle.addEventListener('click', () => setNavOpen(!nav.classList.contains('open')));

  const dropBtn = $('.nav-drop-btn');
  const drop = $('.nav-drop');
  const setDrop = open => {
    if (!drop || !dropBtn) return;
    drop.classList.toggle('open', open);
    dropBtn.setAttribute('aria-expanded', String(open));
  };
  if (dropBtn && drop) {
    dropBtn.addEventListener('click', e => {
      e.stopPropagation();
      setDrop(!drop.classList.contains('open'));
    });
    dropBtn.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setDrop(true); drop.querySelector('a')?.focus(); }
      if (e.key === 'Escape') setDrop(false);
    });
    drop.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setDrop(false)));
  }
  document.addEventListener('click', e => {
    if (drop && !drop.contains(e.target)) setDrop(false);
    if (nav && toggle && nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) setNavOpen(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      setDrop(false);
      setNavOpen(false);
    }
  });
  $$('.main-nav a').forEach(a => a.addEventListener('click', () => setNavOpen(false)));

  const page = location.pathname.split('/').pop() || 'index.html';
  $$('.main-nav a').forEach(a => { if (a.getAttribute('href') === page) a.classList.add('active'); });
  const servicePages = ['shoots.html','framing.html','mugs.html'];
  if (servicePages.includes(page)) dropBtn?.classList.add('active');
}
function setupWhatsApp() {
  const agent = $('.wa-agent');
  if (!agent) return;

  const whatsappIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 2a9.8 9.8 0 0 0-8.36 14.92L2.4 21.6l4.8-1.26A9.96 9.96 0 1 0 12 2Zm0 17.96a7.9 7.9 0 0 1-4.03-1.1l-.29-.17-2.85.75.76-2.77-.19-.3A7.95 7.95 0 1 1 12 19.96Zm4.37-5.95c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.64-1.19-1.42-1.33-1.66-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"/>
    </svg>`;

  const quickQuestions = [
    ['Price list', 'Hello, please send me your current price list.'],
    ['Availability', 'Hello, I would like to check availability.'],
    ['Location', 'Hello, please send me your studio location.'],
    ['Delivery', 'Hello, do you offer delivery or collection?']
  ];

  agent.innerHTML = `
    <button id="waToggle" class="wa-fab" aria-label="Open WhatsApp" aria-expanded="false">${whatsappIcon}</button>
    <div id="waPanel" class="wa-panel wa-panel-mini" role="dialog" aria-label="WhatsApp message">
      <div class="wa-panel-head wa-mini-head">
        <div class="wa-mini-title">${whatsappIcon}<strong>WhatsApp</strong></div>
        <button id="waClose" class="wa-close" aria-label="Close">×</button>
      </div>
      <span class="wa-question-label">Quick question</span>
      <div class="wa-simple-questions">
        ${quickQuestions.map(([label,text]) => `<button type="button" class="wa-simple-question" data-message="${text}">${label}</button>`).join('')}
      </div>
      <div class="wa-or">or</div>
      <textarea id="waMessage" rows="2" placeholder="Write a message"></textarea>
      <div class="wa-mini-actions">
        <button type="button" id="waUseCart" class="wa-cart-fill">Use cart</button>
        <button type="button" id="waSend" class="wa-send-mini">Send</button>
      </div>
    </div>`;

  const toggle = $('#waToggle');
  const panel = $('#waPanel');
  const message = $('#waMessage');
  const close = $('#waClose');
  const sendBtn = $('#waSend');
  updateWhatsAppCartAction();

  const openWhatsApp = text => {
    window.open(`https://wa.me/94711968786?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const setOpen = open => {
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle?.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  close?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  $$('.wa-simple-question').forEach(btn => btn.addEventListener('click', () => {
    buttonFeedback(btn);
    openWhatsApp(btn.dataset.message || 'Hello');
  }));

  $('#waUseCart')?.addEventListener('click', () => {
    const lines = cart.map(item => `${item.name} x${item.qty || 1}`);
    message.value = `Hello, I would like to order:\n${lines.join('\n')}`;
    message.focus();
  });

  const send = () => {
    const text = message?.value.trim() || 'Hello, I have a question.';
    buttonFeedback(sendBtn);
    openWhatsApp(text);
  };

  sendBtn?.addEventListener('click', send);
  message?.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send();
  });
}

function setupGallery() {
  const stage = $('#galleryStage');
  if (!stage) return;

  const images = Array.from({length:8}, (_, i) => `assets/gallery/gallery-${String(i + 1).padStart(2, '0')}.jpeg`);
  const counter = $('#galleryCounter');
  const progress = $('#galleryProgress');
  const prevButton = $('#galleryPrev');
  const nextButton = $('#galleryNext');
  const seeAllButton = $('#gallerySeeAllBtn');
  const seeAllWrap = $('#gallerySeeAllWrap');
  const seeAllGrid = $('#gallerySeeAllGrid');
  const hideButton = $('#galleryHideBtn');
  const stageShell = document.querySelector('.gallery-stage-shell');
  if (!counter || !progress || !prevButton || !nextButton || !seeAllButton || !seeAllWrap || !seeAllGrid || !hideButton || !stageShell) return;

  let index = 0;
  let timer = null;
  let touchStartX = null;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const stageCards = images.map((src, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gallery-stage-card pos-hidden';
    card.setAttribute('aria-label', `Open gallery photo ${i + 1}`);
    card.innerHTML = `<img src="${src}" alt="New Seetha Studio gallery photo ${i + 1}">`;
    card.addEventListener('click', () => openLightbox(i));
    stage.appendChild(card);
    return card;
  });

  images.forEach((src, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gallery-seeall-card';
    card.setAttribute('aria-label', `Open gallery photo ${i + 1}`);
    card.innerHTML = `<img src="${src}" alt="New Seetha Studio gallery grid photo ${i + 1}">`;
    card.addEventListener('click', () => openLightbox(i));
    seeAllGrid.appendChild(card);
  });

  function updateStage(nextIndex) {
    index = (nextIndex + images.length) % images.length;
    const total = images.length;
    stageCards.forEach((card, i) => {
      let diff = (i - index + total) % total;
      if (diff > total / 2) diff -= total;
      let cls = 'pos-hidden';
      if (diff === 0) cls = 'pos-center';
      else if (diff === -1) cls = 'pos-left';
      else if (diff === 1) cls = 'pos-right';
      else if (diff === -2) cls = 'pos-far-left';
      else if (diff === 2) cls = 'pos-far-right';
      card.className = `gallery-stage-card ${cls}`;
      card.setAttribute('tabindex', diff === 0 ? '0' : '-1');
    });
    counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    progress.style.width = `${((index + 1) / total) * 100}%`;
  }

  function next(userAction = true) {
    updateStage(index + 1);
    if (userAction) restartAuto();
  }
  function previous(userAction = true) {
    updateStage(index - 1);
    if (userAction) restartAuto();
  }

  prevButton.addEventListener('click', () => previous(true));
  nextButton.addEventListener('click', () => next(true));

  stageShell.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); previous(true); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(true); }
  });

  stage.addEventListener('touchstart', e => {
    touchStartX = e.touches[0]?.clientX ?? null;
  }, {passive:true});
  stage.addEventListener('touchend', e => {
    if (touchStartX == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX;
    const delta = endX - touchStartX;
    touchStartX = null;
    if (Math.abs(delta) < 40) return;
    delta > 0 ? previous(true) : next(true);
  }, {passive:true});

  function setSeeAll(open, scrollTarget = null) {
    seeAllWrap.classList.toggle('open', open);
    seeAllButton.setAttribute('aria-expanded', String(open));
    if (open) {
      stopAuto();
    } else {
      startAuto();
      if (scrollTarget === 'stage') stageShell.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block:'center'});
    }
  }

  seeAllButton.addEventListener('click', () => {
    const isOpen = !seeAllWrap.classList.contains('open');
    setSeeAll(isOpen);
  });
  hideButton.addEventListener('click', () => setSeeAll(false, 'stage'));

  const lightbox = document.createElement('div');
  lightbox.className = 'gallery-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Gallery photo viewer');
  lightbox.innerHTML = '<button class="gallery-lightbox-close" aria-label="Close photo">×</button><button class="gallery-lightbox-nav gallery-lightbox-prev" aria-label="Previous photo">‹</button><img alt="Expanded gallery photo"><button class="gallery-lightbox-nav gallery-lightbox-next" aria-label="Next photo">›</button>';
  document.body.appendChild(lightbox);
  const lightboxImage = lightbox.querySelector('img');

  const syncLightbox = () => {
    lightboxImage.src = images[index];
    lightboxImage.alt = `New Seetha Studio gallery photo ${index + 1}`;
  };
  const closeLightbox = () => {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    stage.querySelector('.pos-center')?.focus();
    if (!seeAllWrap.classList.contains('open')) startAuto();
  };
  const openLightbox = (targetIndex = index) => {
    stopAuto();
    updateStage(targetIndex);
    syncLightbox();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lightbox.querySelector('.gallery-lightbox-close')?.focus();
  };

  lightbox.querySelector('.gallery-lightbox-close')?.addEventListener('click', closeLightbox);
  lightbox.querySelector('.gallery-lightbox-prev')?.addEventListener('click', () => { previous(false); syncLightbox(); });
  lightbox.querySelector('.gallery-lightbox-next')?.addEventListener('click', () => { next(false); syncLightbox(); });
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') { previous(false); syncLightbox(); }
    if (e.key === 'ArrowRight') { next(false); syncLightbox(); }
  });

  function stopAuto() {
    if (timer) { clearInterval(timer); timer = null; }
  }
  function startAuto() {
    if (reduceMotion || lightbox.classList.contains('open') || seeAllWrap.classList.contains('open')) return;
    stopAuto();
    timer = setInterval(() => updateStage(index + 1), 4200);
  }
  function restartAuto() { stopAuto(); startAuto(); }

  stageShell.addEventListener('mouseenter', stopAuto);
  stageShell.addEventListener('mouseleave', startAuto);
  stageShell.addEventListener('focusin', stopAuto);
  stageShell.addEventListener('focusout', e => {
    if (!stageShell.contains(e.relatedTarget) && !lightbox.classList.contains('open') && !seeAllWrap.classList.contains('open')) startAuto();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAuto();
    else startAuto();
  });

  updateStage(0);
  startAuto();
}

function setupPasswordToggles() {
  $$('.show-pass').forEach(btn => btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? 'Show' : 'Hide';
  }));
}
function setupLoginForms() {
  setupPasswordToggles();
  const adminForm = $('#adminLoginForm');
  if (adminForm) {
    const user = $('#adminUsername'), pass = $('#adminPassword'), remember = $('#rememberLogin'), error = $('#loginError');
    const saved = store.get('seethaRememberAdmin', null);
    if (saved && user && remember) { user.value = saved.username || ''; remember.checked = Boolean(saved.username); }
    [user, pass].forEach(input => input?.addEventListener('input', () => { if (error) error.textContent = ''; }));
    adminForm.addEventListener('submit', e => {
      e.preventDefault();
      if (user.value.trim() === 'admin' && pass.value === 'Seetha@2026') {
        if (remember.checked) store.set('seethaRememberAdmin', {username:user.value.trim()}); else store.remove('seethaRememberAdmin');
        session.set('seethaAdmin', '1');
        location.href = 'product-management.html';
      } else error.textContent = 'Incorrect admin username or password.';
    });
  }
  const dealerForm = $('#dealerLoginForm');
  if (dealerForm) {
    const user = $('#dealerUsername'), pass = $('#dealerPassword'), remember = $('#rememberLogin'), error = $('#dealerLoginError');
    const saved = store.get('seethaRememberDealer', null);
    if (saved && user && remember) { user.value = saved.username || ''; remember.checked = Boolean(saved.username); }
    [user, pass].forEach(input => input?.addEventListener('input', () => { if (error) error.textContent = ''; }));
    dealerForm.addEventListener('submit', e => {
      e.preventDefault();
      const account = getDealerAccounts().find(a => a.username === user.value.trim() && a.password === pass.value && a.active !== false);
      if (account) {
        if (remember.checked) store.set('seethaRememberDealer', {username:user.value.trim()}); else store.remove('seethaRememberDealer');
        session.set('seethaDealer', account.username);
        location.href = 'dealer.html';
      } else error.textContent = 'Incorrect dealer username or password.';
    });
  }
}

function requireAdmin(gateId, panelId) {
  const gate = document.getElementById(gateId), panel = document.getElementById(panelId);
  if (!gate || !panel) return false;
  const ok = session.get('seethaAdmin') === '1';
  gate.hidden = ok; panel.hidden = !ok;
  return ok;
}
function adminLogout() { session.remove('seethaAdmin'); location.href = 'admin-login.html'; }
window.adminLogout = adminLogout;

let editingProductId = null;
function renderItemTypeOptions() {
  const types = getItemTypes();
  const filter = $('#productTypeFilter');
  if (filter) {
    const current = filter.value || 'All';
    filter.innerHTML = `<option value="All">All item types</option>${types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}`;
    filter.value = current === 'All' || types.includes(current) ? current : 'All';
  }
  const category = $('#pmCategory');
  if (category) {
    const current = category.value;
    category.innerHTML = types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    category.value = types.includes(current) ? current : (types[0] || '');
  }
}
function openItemTypeForm() { const form = $('#itemTypeForm'); if (!form) return; form.hidden = false; $('#newItemTypeName').value = ''; $('#newItemTypeName').focus(); }
function closeItemTypeForm() { const form = $('#itemTypeForm'); if (form) form.hidden = true; }
function saveItemType() {
  const input = $('#newItemTypeName');
  const name = input?.value.trim();
  if (!name) return alert('Enter an item type name.');
  const types = getItemTypes();
  if (types.some(t => t.toLowerCase() === name.toLowerCase())) return alert('This item type already exists.');
  types.push(name); saveItemTypes(types); closeItemTypeForm(); renderItemTypeOptions(); renderProductManagement();
}
window.openItemTypeForm = openItemTypeForm;
window.closeItemTypeForm = closeItemTypeForm;
window.saveItemType = saveItemType;

function openProductForm(productId = null) {
  renderItemTypeOptions();
  const form = $('#productForm');
  if (!form) return;
  editingProductId = productId;
  const product = productId ? getProducts().find(p => p.id === productId) : null;
  $('#productFormTitle').textContent = product ? 'Edit Product' : 'Add Product';
  $('#pmCategory').value = product?.category || getItemTypes()[0] || '';
  $('#pmName').value = product?.name || '';
  $('#pmPrice').value = product?.price ?? '';
  $('#pmDiscount').value = product?.discount ?? 20;
  $('#pmStock').value = String(product?.stock ?? true);
  $('#pmImage').value = product?.image || 'product-placeholder.svg';
  form.hidden = false;
  form.scrollIntoView({behavior:'smooth', block:'start'});
}
function closeProductForm() { const form = $('#productForm'); if (form) form.hidden = true; editingProductId = null; }
function saveProductForm() {
  const category = $('#pmCategory').value;
  const name = $('#pmName').value.trim();
  const price = Number($('#pmPrice').value);
  const discount = Number($('#pmDiscount').value);
  if (!category || !name || !Number.isFinite(price) || price < 0 || !Number.isFinite(discount) || discount < 0 || discount > 100) return alert('Enter a valid name, price and discount from 0 to 100.');
  const products = getProducts();
  let product = editingProductId ? products.find(p => p.id === editingProductId) : null;
  if (!product) {
    const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
    product = {id:`${slug}-${Date.now()}`}; products.push(product);
  }
  Object.assign(product, {category,name,price,discount,stock:$('#pmStock').value === 'true',image:$('#pmImage').value.trim() || 'product-placeholder.svg'});
  saveProducts(products); closeProductForm(); renderProductManagement();
}
function deleteProduct(id) {
  if (!confirm('Remove this product?')) return;
  saveProducts(getProducts().filter(p => p.id !== id));
  renderProductManagement();
}
function renderProductManagement() {
  const rows = $('#productManagementRows');
  if (!rows) return;
  renderItemTypeOptions();
  const filter = $('#productTypeFilter')?.value || 'All';
  const products = getProducts().filter(p => filter === 'All' || p.category === filter);
  rows.innerHTML = products.length ? products.map(p => `<tr><td><strong>${escapeHtml(p.name)}</strong></td><td>${escapeHtml(p.category)}</td><td>${formatMoney(p.price)}</td><td>${Number(p.discount ?? 20)}%</td><td>${formatMoney(dealerPrice(p))}</td><td><span class="stock ${p.stock ? 'stock-in' : 'stock-out'}">${p.stock ? 'In Stock' : 'Out of Stock'}</span></td><td><div class="table-actions"><button class="table-btn" data-edit-product="${escapeHtml(p.id)}">Edit</button><button class="table-btn danger" data-delete-product="${escapeHtml(p.id)}">Remove</button></div></td></tr>`).join('') : '<tr><td colspan="7"><div class="empty-state">No products found.</div></td></tr>';
  $$('[data-edit-product]', rows).forEach(btn => btn.addEventListener('click', () => openProductForm(btn.dataset.editProduct)));
  $$('[data-delete-product]', rows).forEach(btn => btn.addEventListener('click', () => deleteProduct(btn.dataset.deleteProduct)));
}
window.openProductForm = openProductForm;
window.closeProductForm = closeProductForm;
window.saveProductForm = saveProductForm;
window.renderProductManagement = renderProductManagement;

let editingDealerUsername = null;
function renderDealerManagement() {
  const rows = $('#dealerManagementRows');
  if (!rows) return;
  const accounts = getDealerAccounts();
  rows.innerHTML = accounts.length ? accounts.map(a => `<tr><td><strong>${escapeHtml(a.name || a.username)}</strong></td><td>${escapeHtml(a.username)}</td><td>••••••••</td><td><span class="stock ${a.active !== false ? 'stock-in' : 'stock-out'}">${a.active !== false ? 'Active' : 'Disabled'}</span></td><td><div class="table-actions"><button class="table-btn" data-edit-dealer="${escapeHtml(a.username)}">Edit</button><button class="table-btn danger" data-delete-dealer="${escapeHtml(a.username)}">Remove</button></div></td></tr>`).join('') : '<tr><td colspan="5"><div class="empty-state">No dealer accounts.</div></td></tr>';
  $$('[data-edit-dealer]', rows).forEach(btn => btn.addEventListener('click', () => editDealer(btn.dataset.editDealer)));
  $$('[data-delete-dealer]', rows).forEach(btn => btn.addEventListener('click', () => removeDealer(btn.dataset.deleteDealer)));
}
function editDealer(username) {
  const account = getDealerAccounts().find(a => a.username === username);
  if (!account) return;
  editingDealerUsername = username;
  $('#dealerFormTitle').textContent = 'Edit Dealer Account';
  $('#dmName').value = account.name || '';
  $('#dmUsername').value = account.username;
  $('#dmPassword').value = account.password;
  $('#dmActive').value = String(account.active !== false);
  $('.dealer-edit')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function saveDealerForm() {
  const name = $('#dmName').value.trim(), username = $('#dmUsername').value.trim(), password = $('#dmPassword').value;
  if (!name || !username || !password) return alert('Complete all dealer account fields.');
  const accounts = getDealerAccounts();
  if (editingDealerUsername) {
    const account = accounts.find(a => a.username === editingDealerUsername);
    if (!account) return;
    if (username !== editingDealerUsername && accounts.some(a => a.username === username)) return alert('Username already exists.');
    Object.assign(account, {name,username,password,active:$('#dmActive').value === 'true'});
  } else {
    if (accounts.some(a => a.username === username)) return alert('Username already exists.');
    accounts.push({name,username,password,active:$('#dmActive').value === 'true'});
  }
  saveDealerAccounts(accounts);
  editingDealerUsername = null;
  $('#dealerFormTitle').textContent = 'Add Dealer Account';
  $('#dmName').value = ''; $('#dmUsername').value = ''; $('#dmPassword').value = ''; $('#dmActive').value = 'true';
  renderDealerManagement();
}
function removeDealer(username) {
  const accounts = getDealerAccounts();
  if (accounts.length <= 1) return alert('Keep at least one dealer account.');
  if (!confirm('Remove this dealer account?')) return;
  saveDealerAccounts(accounts.filter(a => a.username !== username));
  renderDealerManagement();
}
window.saveDealerForm = saveDealerForm;

function currentDealer() {
  const username = session.get('seethaDealer');
  return username ? getDealerAccounts().find(a => a.username === username && a.active !== false) || null : null;
}
function dealerLogout() { session.remove('seethaDealer'); location.href = 'dealer-login.html'; }
window.dealerLogout = dealerLogout;
function renderDealerPortal() {
  const gate = $('#dealerGate'), portal = $('#dealerPortal');
  if (!gate || !portal) return;
  const dealer = currentDealer();
  gate.hidden = Boolean(dealer); portal.hidden = !dealer;
  if (!dealer) return;
  $('#dealerName').textContent = dealer.name || dealer.username;
  $$('[data-dealer-showcase]').forEach(grid => {
    const category = grid.dataset.dealerShowcase;
    const products = getProducts().filter(p => p.category === category);
    grid.innerHTML = products.length ? products.map(p => productCard(p, true)).join('') : '<div class="empty-state">No products in this category.</div>';
  });
}

function setupManagementPages() {
  if (requireAdmin('productAuthGate','productManager')) renderProductManagement();
  if (requireAdmin('dealerMgmtGate','dealerManager')) renderDealerManagement();
  renderDealerPortal();
}

function init() {
  setupTheme();
  setupNavigation();
  setupWhatsApp();
  setupGallery();
  setupLoginForms();
  updateCartBadge();
  renderCartPage();
  renderDynamicProductPricing();
  $$('[data-showcase]').forEach(grid => renderShowcase(grid.dataset.showcase));
  setupManagementPages();
}
document.addEventListener('DOMContentLoaded', init);
