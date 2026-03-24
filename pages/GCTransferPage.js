class GCTransferPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.form12BTransferLineItem = page.getByRole('row', { name: /Form 12 B Transfer/i });
    this.form12BTransferYesOption = this.form12BTransferLineItem.getByRole('radio', { name: 'Yes' });
    this.form12BTransferNoOption = this.form12BTransferLineItem.getByRole('radio', { name: 'No' });
  }

  async navigateToGCtoGCTransfer() {
    // Navigate using nav structure to Initiate flow Request for GC to GC Transfer screen
    // Assuming path: /form12b/gc-to-gc-transfer or similar
    // Using nav structure: no direct path given, so fallback to environment base URL + known path
    const baseUrl = process.env.APP_BASE_URL || process.env.BASE_URL;
    await this.page.goto(`${baseUrl}/form12b/gc-to-gc-transfer`);
    await this.page.waitForLoadState('networkidle');
  }

  async isForm12BTransferLineItemVisible() {
    return await this.form12BTransferLineItem.isVisible();
  }

  async isYesSelectedByDefault() {
    return await this.form12BTransferYesOption.isChecked();
  }
}

module.exports = { GCTransferPage };
