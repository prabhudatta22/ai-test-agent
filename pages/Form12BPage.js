class Form12BPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Selectors for Form 12B details on profile page
    this.form12BSection = page.getByRole('region', { name: /Form 12B/i });
    this.ltaNonTaxableClaimsPreviousBlock = page.getByLabel('Number of non-taxable claims for LTA in previous block');
    this.ltaNonTaxableClaimedYearsCurrentBlock = page.getByLabel('Select LTA non-taxable claimed years in current block');
    this.isFresherNotExitCheckbox = page.getByLabel('Is Fresher/ Not Exit in current FY');
    this.form12BEntries = page.locator('section[aria-label="Form 12B Entries"]');
    this.form12BEntryByTaxYear = (taxYear) => this.page.locator(`section[aria-label="Form 12B Entries"] >> text=${taxYear}`);
    this.form12BField = (fieldName) => this.page.getByLabel(fieldName);
    this.form12BAttachment = page.locator('text=Form 12B Attachment');
  }

  async navigateToForm12BSection() {
    await this.form12BSection.scrollIntoViewIfNeeded();
    await this.form12BSection.waitFor({ state: 'visible' });
  }

  async getForm12BEntryText(taxYear) {
    return await this.form12BEntryByTaxYear(taxYear).textContent();
  }

  async isForm12BEntryPresent(taxYear) {
    return await this.form12BEntryByTaxYear(taxYear).count() > 0;
  }

  async getFieldValue(fieldName) {
    const field = this.form12BField(fieldName);
    if (await field.count() === 0) return null;
    return await field.inputValue();
  }

  async isFieldDisabled(fieldName) {
    const field = this.form12BField(fieldName);
    return await field.isDisabled();
  }

  async isAttachmentPresent() {
    return await this.form12BAttachment.isVisible();
  }
}

module.exports = { Form12BPage };
