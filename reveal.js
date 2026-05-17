// DOM References
const talentTitle = document.getElementById('talent-title');
const talentWhy = document.getElementById('talent-why');
const talentHow = document.getElementById('talent-how');

// Populate Reveal Page
function loadProfile() {
  const stored = sessionStorage.getItem('talentProfile');

  // Guard: if no profile exists, redirect back to start
  if (!stored) {
    window.location.href = 'index.html';
    return;
  }

  const profile = JSON.parse(stored);

  talentTitle.textContent = profile.title;
  talentWhy.textContent = profile.why;
  talentHow.textContent = profile.how;
}

// Init
loadProfile();