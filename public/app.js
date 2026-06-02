// 1. Supabase Initialization
const SUPABASE_URL = 'https://ohfzdnxmbnjuyqnfnbqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wR36drwaeSv1_UrnPGwPhA_FSC_1rNE';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function initApp() {
  // 2. URL Routing
  const urlParams = new URLSearchParams(window.location.search);
  const claimToken = urlParams.get('claim');
  const redeemToken = urlParams.get('redeem');

  if (claimToken) {
    localStorage.setItem('referrer_token', claimToken);
    localStorage.setItem('role', 'customer');
  }
  if (redeemToken) {
    localStorage.setItem('referee_token', redeemToken);
    localStorage.setItem('role', 'customer');
  }

  if (claimToken || redeemToken) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Handle Onboarding / Routing
  let currentRole = localStorage.getItem('role');
  const mainNav = document.getElementById('main-nav');
  const ownerBtns = document.querySelectorAll('.owner-only');
  const customerBtns = document.querySelectorAll('.customer-only');

  function activatePanel(panelId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');
    
    const navBtn = document.querySelector(`.nav-item[data-target="${panelId}"]`);
    if (navBtn) navBtn.classList.add('active');
  }

  function applyRole(role) {
    localStorage.setItem('role', role);
    mainNav.style.display = 'flex';
    if (role === 'owner') {
       ownerBtns.forEach(el => el.style.display = 'flex');
       customerBtns.forEach(el => el.style.display = 'none');
       activatePanel('owner-view');
    } else {
       ownerBtns.forEach(el => el.style.display = 'none');
       customerBtns.forEach(el => el.style.display = 'flex');
       // Auto-route customer based on available tokens
       if (redeemToken || localStorage.getItem('referee_token')) {
         activatePanel('referee-view');
       } else {
         activatePanel('referrer-view');
       }
    }
  }

  if (currentRole) {
    applyRole(currentRole);
  } else {
    activatePanel('onboarding-view');
    mainNav.style.display = 'none';
  }

  const btnSelectOwner = document.getElementById('btn-select-owner');
  if (btnSelectOwner) {
    btnSelectOwner.addEventListener('click', () => applyRole('owner'));
  }
  
  const btnSelectCustomer = document.getElementById('btn-select-customer');
  if (btnSelectCustomer) {
    btnSelectCustomer.addEventListener('click', () => applyRole('customer'));
  }

  // 3. Tab Switching
  const navItems = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.panel');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(nav => nav.classList.remove('active'));
      panels.forEach(panel => panel.classList.remove('active'));
      
      item.classList.add('active');
      const targetId = item.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // 4. Generate Referral Link & Canvas (Referrer Flow)
  const referrerToken = localStorage.getItem('referrer_token');
  let referralLink = '';

  if (referrerToken) {
    referralLink = `${window.location.origin}${window.location.pathname}?redeem=${referrerToken}`;
    generateSocialCard(referralLink);
  }

  // 5. Action Buttons (Referrer Flow)
  const downloadBtn = document.getElementById('download-card-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const canvas = document.getElementById('social-canvas');
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = 'my-referral-card.jpg';
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    });
  }

  const copyBtn = document.getElementById('copy-link-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (referralLink) {
        navigator.clipboard.writeText(referralLink)
          .then(() => alert('Link copied to clipboard!'))
          .catch(err => console.error('Error copying text:', err));
      } else {
        alert('No referral link available. Please obtain a claim token first.');
      }
    });
  }

  // 6. Store Owner Flow: Generate Claim Code
  document.getElementById('gen-qr-btn').addEventListener('click', async () => {
    const token = 'REF-' + Math.floor(Math.random() * 1000000000).toString();
    
    // Insert into Supabase
    const { error } = await supabaseClient
      .from('referrals')
      .insert([
        { code: token, referrer_name: "Customer", status: "Active" }
      ]);
      
    if (error) {
      console.error('Error saving referral to Supabase:', error);
      alert('Failed to generate code in database.');
      return;
    }
    
    // Show QR
    const claimLink = `${window.location.origin}${window.location.pathname}?claim=${token}`;
    const container = document.getElementById('store-qr');
    const wrapper = document.getElementById('owner-qr-container');
    container.innerHTML = '';
    
    if (typeof QRCode !== 'undefined') {
      new QRCode(container, {
          text: claimLink,
          width: 200,
          height: 200,
          colorDark : "#ffffff",
          colorLight : "#1E1E24"
      });
      wrapper.style.display = 'flex';
    }
  });

  // 7. Referee Flow: Show Redeem QR code inside referee view
  const localRefereeToken = localStorage.getItem('referee_token');
  if (localRefereeToken) {
    const refereeQrContainer = document.getElementById('referee-qr');
    const refereeQrWrapper = document.getElementById('referee-qr-container');
    const refereeMessage = document.getElementById('referee-message');
    
    if (refereeQrContainer && typeof QRCode !== 'undefined') {
      new QRCode(refereeQrContainer, {
          text: localRefereeToken,
          width: 200,
          height: 200,
          colorDark : "#ffffff",
          colorLight : "#1E1E24"
      });
      refereeQrWrapper.style.display = 'flex';
      refereeMessage.textContent = "Present this QR code to the cashier.";
      refereeMessage.style.color = "white"; // Make it visible
    }
  }

  // 8. Cashier Verification Flow (Html5QrcodeScanner)
  let html5QrcodeScanner;
  document.getElementById('start-scan-btn').addEventListener('click', () => {
    if (typeof Html5QrcodeScanner !== 'undefined') {
      if (!html5QrcodeScanner) {
          html5QrcodeScanner = new Html5QrcodeScanner(
            "reader", 
            { fps: 10, qrbox: {width: 250, height: 250} }, 
            false
          );
          html5QrcodeScanner.render(async (decodedText) => {
            // Stop scanning once something is found
            try {
              await html5QrcodeScanner.clear();
            } catch (e) {
              console.error(e);
            }
            
            const resultDiv = document.getElementById('scan-result');
            resultDiv.textContent = 'Verifying...';
            resultDiv.style.color = 'var(--text-main)';

            // Perform Supabase Query
            const { data, error } = await supabaseClient
              .from('referrals')
              .select('*')
              .eq('code', decodedText)
              .eq('status', 'Active');

            if (error) {
              console.error(error);
              resultDiv.textContent = 'Error querying database.';
              resultDiv.style.color = 'crimson';
              return;
            }

            if (data && data.length > 0) {
              // Valid! Insert into redemptions
              const { error: insertError } = await supabaseClient
                .from('redemptions')
                .insert([
                  { referral_code: decodedText }
                ]);
                
              if (insertError) {
                resultDiv.textContent = 'Verified, but failed to log redemption.';
                resultDiv.style.color = 'crimson';
              } else {
                resultDiv.textContent = 'Success! Code Verified.';
                resultDiv.style.color = '#34d399'; // Emerald 400
              }
            } else {
              // Invalid or not found
              resultDiv.textContent = 'Error: Invalid or inactive code.';
              resultDiv.style.color = 'crimson';
            }

          }, (errorMessage) => {
            // parse error, ignore
          });
      }
    } else {
      alert("Scanner library not loaded");
    }
  });

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // Wait a small tick for React to finish hydrating if it just injected the scripts
  setTimeout(initApp, 100);
}

// 9. Canvas Graphic Engine
function generateSocialCard(link) {
  // Create temporary container for QR
  const tempQrContainer = document.createElement('div');
  document.body.appendChild(tempQrContainer);
  tempQrContainer.style.display = 'none';

  // Generate QR
  new QRCode(tempQrContainer, {
    text: link,
    width: 400,
    height: 400,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });

  // Give QRCode.js a moment to render to canvas/img
  setTimeout(() => {
    const qrCanvas = tempQrContainer.querySelector('canvas');
    const qrImg = tempQrContainer.querySelector('img');

    // Grab the rendered QR code image
    if (qrImg && qrImg.src) {
        const img = new Image();
        img.onload = () => drawCanvas(img);
        img.src = qrImg.src;
    } else if (qrCanvas) {
        drawCanvas(qrCanvas);
    }

    function drawCanvas(qrSource) {
      const canvas = document.getElementById('social-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      // Paint Linear Gradient Background: #4f46e5 to #06b6d4
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#4f46e5');
      gradient.addColorStop(1, '#06b6d4');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Write bold white text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 50px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN FOR MY EXCLUSIVE DISCOUNT!', canvas.width / 2, 200);

      // Draw the QR code image directly into the center
      const qrSize = 500;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = (canvas.height - qrSize) / 2 + 50;

      // Draw white background block for QR to ensure it stands out
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (ctx.roundRect) {
         ctx.roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 24);
      } else {
         ctx.rect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
      }
      ctx.fill();

      // Draw QR graphic
      ctx.drawImage(qrSource, qrX, qrY, qrSize, qrSize);

      // Convert to JPEG and display in #card-preview
      const preview = document.getElementById('card-preview');
      if (preview) {
        preview.src = canvas.toDataURL('image/jpeg', 0.9);
      }

      // Clean up temp container
      document.body.removeChild(tempQrContainer);
    }
  }, 100);
}
