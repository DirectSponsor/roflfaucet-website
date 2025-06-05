// Simple test script for debugging
console.log('Test script loaded successfully!');

// Test API connection immediately
fetch('/api/health')
  .then(response => response.json())
  .then(data => {
    console.log('API Health Check:', data);
    document.getElementById('api-test').textContent = 'API Working: ' + data.status;
  })
  .catch(error => {
    console.error('API Error:', error);
    document.getElementById('api-test').textContent = 'API Error: ' + error.message;
  });

// Test loading stats
fetch('/api/stats')
  .then(response => response.json())
  .then(data => {
    console.log('Stats loaded:', data);
    if (document.getElementById('total-users')) {
      document.getElementById('total-users').textContent = data.totalUsers;
    }
    if (document.getElementById('total-claims')) {
      document.getElementById('total-claims').textContent = data.totalClaims;
    }
    if (document.getElementById('total-tokens')) {
      document.getElementById('total-tokens').textContent = data.totalTokensDistributed;
    }
  })
  .catch(error => {
    console.error('Stats Error:', error);
  });

// Simple signup test
function testSignup() {
  const username = document.getElementById('username-input')?.value;
  console.log('Testing signup with username:', username);
  
  if (!username) {
    alert('Please enter a username');
    return;
  }
  
  fetch('/api/user/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username })
  })
  .then(response => response.json())
  .then(data => {
    console.log('User created:', data);
    alert('User created: ' + JSON.stringify(data));
  })
  .catch(error => {
    console.error('Signup error:', error);
    alert('Error: ' + error.message);
  });
}

// Add test button click handler when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, setting up test handlers');
  
  const signupBtn = document.getElementById('signup-btn');
  if (signupBtn) {
    signupBtn.onclick = testSignup;
    console.log('Signup button handler attached');
  } else {
    console.error('Signup button not found!');
  }
});

