// Reusable Login Page Object for Playwright tests.
// NOTE: This is used by generated specs under /output.

class LoginPage {
  constructor(page) {
    this.page = page;
    this.usernameInput = page.getByLabel('Username');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: /login/i });
  }

  /**
   * Logs into the application.
   * Expects APP_BASE_URL (preferred) or BASE_URL to point to the application host.
   */
  async logintoApp(username, password) {
    const baseUrl = process.env.APP_BASE_URL || process.env.BASE_URL;
    await this.page.goto(`${baseUrl}/login`);
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL('**/dashboard/overview');
  }
}

module.exports = { LoginPage };
