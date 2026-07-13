document.addEventListener('DOMContentLoaded', () => {
  // --- APPLICATION STATE ---
  const state = {
    token: localStorage.getItem('surveystream_token') || '',
    username: localStorage.getItem('surveystream_username') || '',
    platforms: [],
    selectedPlatform: null,
    offers: [],
    cpiSettings: {}
  };

  // --- DOM ELEMENTS ---
  const views = {
    login: document.getElementById('view-login'),
    home: document.getElementById('view-home'),
    offers: document.getElementById('view-offers')
  };

  const tabs = {
    btnMember: document.getElementById('tab-btn-member'),
    btnToken: document.getElementById('tab-btn-token'),
    formMember: document.getElementById('form-login-member'),
    formToken: document.getElementById('form-login-token')
  };

  const loginInputUsername = document.getElementById('login-username');
  const loginInputToken = document.getElementById('login-token');
  const btnSeedDb = document.getElementById('btn-seed-db');
  
  const userDisplayNames = [
    document.getElementById('user-display-name'),
    document.getElementById('offers-display-name'),
    document.getElementById('hero-username')
  ];

  const userAvatarChars = [
    document.getElementById('user-avatar-char'),
    document.getElementById('offers-avatar-char')
  ];

  const btnLogout = document.getElementById('btn-logout');
  const btnBackPlatforms = document.getElementById('btn-back-platforms');
  const btnCopyWall = document.getElementById('btn-copy-wall');

  const platformsCount = document.getElementById('platforms-count');
  const platformsGrid = document.getElementById('platforms-grid');

  const offersContainer = document.getElementById('offers-container');
  const offersCountBadge = document.getElementById('offers-count-badge');
  const offersSearch = document.getElementById('offers-search');
  const offersSortSelect = document.getElementById('offers-sort-select');

  const offersPlatformTitle = document.getElementById('offers-platform-title');
  const bannerTitle = document.getElementById('banner-title');

  const quotaModal = document.getElementById('quota-modal');
  const quotaModalSurveyTitle = document.getElementById('quota-modal-survey-title');
  const quotaModalBody = document.getElementById('quota-modal-body');
  const btnCloseModal = document.getElementById('btn-close-modal');

  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // --- API HELPER METHOD ---
  async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    const config = {
      method,
      headers
    };
    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || `Server error: ${response.status}`);
      }
      return data;
    } catch (e) {
      console.error(`API Call failed to ${endpoint}:`, e.message);
      throw e;
    }
  }

  // --- VIEW TRANSITION CONTROLLER ---
  function showView(viewName) {
    Object.keys(views).forEach(key => {
      if (key === viewName) {
        views[key].classList.remove('hidden');
        views[key].classList.add('active', 'animate-fade-in');
      } else {
        views[key].classList.add('hidden');
        views[key].classList.remove('active', 'animate-fade-in');
      }
    });
  }

  // --- TOAST NOTIFICATIONS ---
  let toastTimeout = null;
  function showToast(message, isError = false) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastMessage.textContent = message;
    toast.className = 'toast'; // reset
    if (isError) toast.classList.add('error');
    toast.classList.remove('hidden');
    
    toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 4000);
  }

  // --- TABS LOGIC ---
  tabs.btnMember.addEventListener('click', () => {
    tabs.btnMember.classList.add('active');
    tabs.btnToken.classList.remove('active');
    tabs.formMember.classList.remove('hidden');
    tabs.formToken.classList.add('hidden');
  });

  tabs.btnToken.addEventListener('click', () => {
    tabs.btnToken.classList.add('active');
    tabs.btnMember.classList.remove('active');
    tabs.formToken.classList.remove('hidden');
    tabs.formMember.classList.add('hidden');
  });

  // --- INIT APPLICATION ---
  async function init() {
    if (!state.token) {
      showView('login');
      return;
    }

    // Set usernames and initials across header profiles
    const displayUser = state.username || 'Authorized Member';
    userDisplayNames.forEach(el => { if (el) el.textContent = displayUser; });
    userAvatarChars.forEach(el => { if (el) el.textContent = displayUser.charAt(0).toUpperCase(); });

    try {
      showView('home');
      await loadPlatforms();
    } catch (e) {
      // Token probably invalid/expired, reset token
      showToast('Session validation failed. Please log in again.', true);
      logout();
    }
  }

  // --- AUTHENTICATION FLOWS ---
  tabs.formMember.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = loginInputUsername.value.trim();
    if (!name) return;

    try {
      const res = await apiCall('/api/member/platform/login', 'POST', { username: name });
      if (res.code === 200 && res.data.token) {
        state.token = res.data.token;
        state.username = res.data.nickname;
        localStorage.setItem('surveystream_token', res.data.token);
        localStorage.setItem('surveystream_username', res.data.nickname);
        showToast('Login successful!');
        init();
      }
    } catch (err) {
      showToast(err.message, true);
    }
  });

  tabs.formToken.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tokenInput = loginInputToken.value.trim();
    if (!tokenInput) return;

    try {
      // Test verify token directly by making a platform call
      const headers = { 'Authorization': `Bearer ${tokenInput}` };
      const testRes = await fetch('/api/member/platform/list', { headers });
      const testData = await testRes.json();
      
      if (testRes.ok && testData.code === 200) {
        state.token = tokenInput;
        state.username = 'Authorized Key';
        localStorage.setItem('surveystream_token', tokenInput);
        localStorage.setItem('surveystream_username', 'Authorized Key');
        showToast('Token verified successfully!');
        init();
      } else {
        throw new Error(testData.msg || 'Verification failed');
      }
    } catch (err) {
      showToast(`Invalid token validation keys: ${err.message}`, true);
    }
  });

  function logout() {
    state.token = '';
    state.username = '';
    localStorage.removeItem('surveystream_token');
    localStorage.removeItem('surveystream_username');
    loginInputUsername.value = '';
    loginInputToken.value = '';
    showView('login');
  }

  btnLogout.addEventListener('click', logout);

  // --- SEED DATABASE EVENT ---
  btnSeedDb.addEventListener('click', async () => {
    btnSeedDb.disabled = true;
    const oldText = btnSeedDb.innerHTML;
    btnSeedDb.innerHTML = '<span>Seeding database...</span>';
    
    try {
      const res = await apiCall('/api/member/platform/seed-demo', 'POST');
      if (res.code === 200) {
        showToast('Demo Database populated successfully!');
        loginInputUsername.value = res.data.nickname;
        showToast('Click Login to enter as ' + res.data.nickname);
      }
    } catch (err) {
      showToast(`Database seed failed: ${err.message}`, true);
    } finally {
      btnSeedDb.disabled = false;
      btnSeedDb.innerHTML = oldText;
    }
  });

  // ==========================================
  // VIEW 2: HOMEPAGE PLATFORMS ENGINE
  // ==========================================
  async function loadPlatforms() {
    platformsGrid.innerHTML = `
      <div class="loading-spinner-wrapper">
        <div class="spinner"></div>
        <p>Retrieving platforms authorizations...</p>
      </div>`;

    try {
      const res = await apiCall('/api/member/platform/list');
      if (res.code === 200) {
        state.platforms = res.data;
        platformsCount.textContent = `${res.data.length} Loaded`;
        renderPlatforms(res.data);
      }
    } catch (err) {
      platformsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h4>Authorization Retrieval Failed</h4>
          <p>${err.message}</p>
        </div>`;
    }
  }

  function renderPlatforms(platformsList) {
    if (platformsList.length === 0) {
      platformsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h4>No Authorized Platforms</h4>
          <p>Your team has not been granted platform auth privileges. Try seeding the database above.</p>
        </div>`;
      return;
    }

    platformsGrid.innerHTML = '';
    platformsList.forEach(p => {
      const card = document.createElement('div');
      card.className = 'glass-card platform-card';
      
      // Inject left border color customization if configured
      if (p.platform_color) {
        card.style.setProperty('--accent-blue', p.platform_color);
      }

      // Collect features flags
      let features = '';
      if (p.is_list) features += `<span class="badge badge-accent">Surveys</span>`;
      if (p.is_wall) features += `<span class="badge badge-green">Wall</span>`;

      card.innerHTML = `
        <div class="platform-card-header">
          <img class="platform-logo-img" src="${p.platform_image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100'}" alt="${p.platform_name}">
          <span class="logo-icon">⚡</span>
        </div>
        <div class="platform-card-body">
          <h3>${p.platform_name}</h3>
          <div class="platform-type-tags">
            ${features}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        selectPlatform(p);
      });

      platformsGrid.appendChild(card);
    });
  }

  // ==========================================
  // VIEW 3: OFFERS/PROJECTS CATALOGUE ENGINE
  // ==========================================
  async function selectPlatform(platform) {
    state.selectedPlatform = platform;
    offersPlatformTitle.textContent = platform.platform_name;
    bannerTitle.textContent = platform.platform_name;

    // Check if platform supports offerwall copy
    if (platform.is_wall) {
      btnCopyWall.classList.remove('hidden');
    } else {
      btnCopyWall.classList.add('hidden');
    }

    showView('offers');
    offersSearch.value = '';
    await loadOffers();
  }

  async function loadOffers() {
    offersContainer.innerHTML = `
      <div class="loading-spinner-wrapper">
        <div class="spinner"></div>
        <p>Fetching active survey campaign payouts...</p>
      </div>`;

    try {
      const res = await apiCall(`/api/member/platform/offers?platform_id=${state.selectedPlatform.platform_id}`);
      if (res.code === 200) {
        state.offers = res.data.list;
        offersCountBadge.textContent = `${res.data.count} Found`;
        applyFiltersAndSort();
      }
    } catch (err) {
      offersContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h4>Inventory Load Failed</h4>
          <p>${err.message}</p>
        </div>`;
    }
  }

  // --- FILTERS & SORT IMPLEMENTATION ---
  function applyFiltersAndSort() {
    let filtered = [...state.offers];
    
    // Search filter
    const query = offersSearch.value.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(item => 
        (item.project_name && item.project_name.toLowerCase().includes(query)) ||
        (item.project_code && item.project_code.toLowerCase().includes(query)) ||
        (item.project_pno && item.project_pno.toLowerCase().includes(query))
      );
    }

    // Sort order
    const sortVal = offersSortSelect.value;
    if (sortVal === 'cpi-desc') {
      filtered.sort((a, b) => b.project_cpi - a.project_cpi);
    } else if (sortVal === 'cpi-asc') {
      filtered.sort((a, b) => a.project_cpi - b.project_cpi);
    } else if (sortVal === 'loi-asc') {
      filtered.sort((a, b) => (a.project_loi || 999) - (b.project_loi || 999));
    }

    renderOffers(filtered);
  }

  offersSearch.addEventListener('input', applyFiltersAndSort);
  offersSortSelect.addEventListener('change', applyFiltersAndSort);

  function renderOffers(offersList) {
    if (offersList.length === 0) {
      offersContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h4>No Matching Surveys Found</h4>
          <p>Try refining your search filter or checking back later.</p>
        </div>`;
      offersCountBadge.textContent = '0 Found';
      return;
    }

    offersCountBadge.textContent = `${offersList.length} Found`;
    offersContainer.innerHTML = '';

    offersList.forEach(offer => {
      const card = document.createElement('div');
      card.className = 'glass-card offer-card';

      // Duration & IR details
      const loiText = offer.project_loi ? `${offer.project_loi} Mins` : 'Variable';
      const irText = offer.project_ir ? `${offer.project_ir}% IR` : 'High';

      card.innerHTML = `
        <div class="offer-details">
          <div class="offer-title">${offer.project_name || 'Participate and Earn Coins'}</div>
          <div class="offer-specs-bar">
            <span class="spec-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${loiText}</span>
            </span>
            <span class="spec-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span>${irText}</span>
            </span>
            <span class="badge badge-accent">${offer.project_pno}</span>
          </div>
        </div>
        <div class="offer-payout-box">
          <div>
            <div class="payout-label">Payout Coins</div>
            <div class="payout-value-text">+${offer.project_cpi}</div>
          </div>
          <div class="offer-actions">
            <button class="btn btn-secondary btn-quota-check" data-pno="${offer.project_pno}">Live Specs</button>
            <button class="btn btn-primary btn-start-survey" data-pno="${offer.project_pno}">Start</button>
          </div>
        </div>
      `;

      // Live specs hook
      card.querySelector('.btn-quota-check').addEventListener('click', () => {
        openQuotaCheck(offer);
      });

      // Start survey hook
      card.querySelector('.btn-start-survey').addEventListener('click', () => {
        startSurveyRedirect(offer.project_pno);
      });

      offersContainer.appendChild(card);
    });
  }

  // --- COPY WALL REDIRECT ACTION ---
  btnCopyWall.addEventListener('click', async () => {
    try {
      const res = await apiCall(`/api/member/platform/wall_copy?platform_id=${state.selectedPlatform.platform_id}`);
      if (res.code === 200 && res.data) {
        await navigator.clipboard.writeText(res.data);
        showToast('Offerwall redirect link copied to clipboard!');
      }
    } catch (err) {
      showToast(`Copy link failed: ${err.message}`, true);
    }
  });

  // --- START SURVEY / LINK REDIRECTION ACTION ---
  async function startSurveyRedirect(pno) {
    try {
      const res = await apiCall(`/api/member/platform/copy?project_pno=${pno}`);
      if (res.code === 200 && res.data) {
        window.open(res.data, '_blank');
      }
    } catch (err) {
      showToast(`Survey launch failed: ${err.message}`, true);
    }
  }

  // ==========================================
  // VIEW 4: LIVE QUOTA SPECIFICATIONS MODAL
  // ==========================================
  async function openQuotaCheck(offer) {
    quotaModalSurveyTitle.textContent = offer.project_name;
    quotaModalBody.innerHTML = `
      <div class="loading-spinner-wrapper">
        <div class="spinner"></div>
        <p>Querying external platform live inventory specifications API...</p>
      </div>`;
    quotaModal.classList.remove('hidden');

    try {
      const res = await apiCall(`/api/member/platform/quota?project_pno=${offer.project_pno}`);
      if (res.code === 200 && res.data) {
        const item = res.data;
        if (item.type === 'link') {
          quotaModalBody.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">🔗</div>
              <h4>Direct Survey Reference URL</h4>
              <p style="margin-bottom: 20px;">This project redirects to a static redirect endpoint.</p>
              <a href="${item.content}" target="_blank" class="btn btn-primary">Open Static LiveLink</a>
            </div>`;
        } else if (item.type === 'content') {
          quotaModalBody.innerHTML = `<div class="quota-content-rendered">${item.content}</div>`;
        } else if (item.type === 'structured') {
          let qualHtml = '';
          if (item.qualData && item.qualData.result && item.qualData.result.data) {
            item.qualData.result.data.forEach(q => {
              qualHtml += `
                <div style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03);">
                  <strong style="color:var(--accent-cyan); display:block; margin-bottom:4px;">${q.QuestionText || q.QuestionID}</strong>
                  <div style="font-size:12px; color:var(--text-secondary);">${q.AnswerCodes ? q.AnswerCodes.join(', ') : 'Open specification'}</div>
                </div>`;
            });
          }

          quotaModalBody.innerHTML = `
            <div class="structured-quota-view">
              <div style="display:flex; gap:12px; margin-bottom:20px; font-size:13px;">
                <div style="flex:1; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.05); text-align:center;">
                  <div style="color:var(--text-secondary); margin-bottom:4px;">Quota Limits</div>
                  <strong style="font-size:18px;">${item.project?.project_quota || 'N/A'}</strong>
                </div>
                <div style="flex:1; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.05); text-align:center;">
                  <div style="color:var(--text-secondary); margin-bottom:4px;">Completes</div>
                  <strong style="font-size:18px; color:var(--accent-green);">${item.project?.project_complete || 0}</strong>
                </div>
              </div>
              <div style="font-weight:600; margin-bottom:10px; font-size:14px;">Live Targeting Rules:</div>
              <div class="qualifications-list" style="background:rgba(0,0,0,0.15); border-radius:10px; overflow:hidden;">
                ${qualHtml || '<p style="padding:20px; color:var(--text-secondary); text-align:center;">No targeting qualification lists mapped.</p>'}
              </div>
            </div>`;
        }
      }
    } catch (err) {
      quotaModalBody.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <h4>Live Pull Check Failed</h4>
          <p>${err.message}</p>
        </div>`;
    }
  }

  // --- CLOSE MODAL ACTION ---
  function closeModal() {
    quotaModal.classList.add('hidden');
    quotaModalBody.innerHTML = '';
  }

  btnCloseModal.addEventListener('click', closeModal);
  quotaModal.addEventListener('click', (e) => {
    if (e.target === quotaModal) closeModal();
  });

  // --- BACK BUTTON ACTION ---
  btnBackPlatforms.addEventListener('click', () => {
    showView('home');
    state.selectedPlatform = null;
    loadPlatforms();
  });

  // Run app init
  init();
});
