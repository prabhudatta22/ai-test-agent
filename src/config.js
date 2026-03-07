module.exports = {
  startUrl: 'https://instance8.darwinbox.in/ms/vibe/home/posts',

  login: {
    loginUrl: 'https://instance8.darwinbox.in',
    username: '60',
    password: 'tnBYZgjAQsEAZYsk1@',

    selectors: {
      usernameInput: '#UserLogin_username',
      passwordInput: '#UserLogin_password',
      submitButton: '#login-submit'
    }
  },

  maxDepth: 20,
  //navigationTimeout: 20000,
  outputDir: './data',
  sameDomainOnly: true,
  headless: true,
  sessionFile: './storageState.json'
};