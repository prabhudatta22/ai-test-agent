class MainDashboardPage {
  constructor(page) {
    this.page = page;

    this.selfFeedbackPendingTask = page.getByRole('button', {
      name: /Self Feedback Pending/i,
    });

    this.submitTaskButton = page.getByRole('button', { name: /submit/i });
    this.feedbackInput = page.locator(
      'textarea[placeholder*="feedback"], textarea[name*="feedback"]'
    );

    this.validationError = page.locator('text=Feedback input is required').first();
    this.lengthValidationError = page
      .locator('text=Feedback input exceeds maximum allowed length')
      .first();
    this.accessDeniedMessage = page.locator('text=Access denied').first();
    this.sessionExpiredMessage = page
      .locator('text=Session expired, please login again')
      .first();
    this.networkErrorMessage = page
      .locator('text=Network error, please try again later')
      .first();
  }

  feedbackPendingTask(role) {
    return this.page.getByRole('button', {
      name: new RegExp(`Feedback Pending.*${role}`, 'i'),
    });
  }

  async navigateToMainDashboard() {
    const baseUrl = process.env.APP_BASE_URL || process.env.BASE_URL;
    await this.page.goto(`${baseUrl}/dashboard/overview`);
    await this.page.waitForLoadState('networkidle');
  }

  async locateSelfFeedbackPendingTask() {
    await this.selfFeedbackPendingTask.waitFor({ state: 'visible' });
    return this.selfFeedbackPendingTask;
  }

  async locateFeedbackPendingTask(role) {
    const locator = this.feedbackPendingTask(role);
    await locator.waitFor({ state: 'visible' });
    return locator;
  }

  async submitTask(taskButton) {
    await taskButton.click();
  }

  async fillFeedbackInput(text) {
    await this.feedbackInput.fill(text);
  }

  async clearFeedbackInput() {
    await this.feedbackInput.fill('');
  }

  async isValidationErrorVisible() {
    return await this.validationError.isVisible();
  }

  async isLengthValidationErrorVisible() {
    return await this.lengthValidationError.isVisible();
  }

  async isAccessDeniedVisible() {
    return await this.accessDeniedMessage.isVisible();
  }

  async isSessionExpiredVisible() {
    return await this.sessionExpiredMessage.isVisible();
  }

  async isNetworkErrorVisible() {
    return await this.networkErrorMessage.isVisible();
  }
}

module.exports = { MainDashboardPage };
