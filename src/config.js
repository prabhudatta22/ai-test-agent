module.exports = {
  startUrl: process.env.START_URL || 'https://instance8.darwinbox.in/ms/vibe/home/posts',

  login: {
    loginUrl: process.env.LOGIN_URL || 'https://instance8.darwinbox.in',
    username: process.env.LOGIN_USERNAME || '',
    password: process.env.LOGIN_PASSWORD || '',

    selectors: {
      usernameInput: '#UserLogin_username',
      passwordInput: '#UserLogin_password',
      submitButton: '#login-submit'
    }
  },

  // For locator extraction default we want depth=5, but keep the crawler default
  // for other use cases. Locator service uses LOCATOR_MAX_DEPTH (default 5).
  maxDepth: 20,
  navigationTimeout: 30000,
  outputDir: './data',
  sameDomainOnly: true,
  headless: String(process.env.HEADLESS || 'true').toLowerCase() === 'true',
  sessionFile: './storageState.json'
};