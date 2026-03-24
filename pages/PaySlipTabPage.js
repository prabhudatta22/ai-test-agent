class PaySlipTabPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.paySlipTab = page.getByRole('tab', { name: /pay slip/i });
    this.columns = {
      period: page.getByRole('columnheader', { name: /Period/i }),
      paySlipType: page.getByRole('columnheader', { name: /Pay slip Type/i }),
      totalWorkDays: page.getByRole('columnheader', { name: /Total Workdays/i }),
      gross: page.getByRole('columnheader', { name: /Gross/i }),
      deduction: page.getByRole('columnheader', { name: /Deduction/i }),
      tds: page.getByRole('columnheader', { name: /TDS/i }),
      net: page.getByRole('columnheader', { name: /Net/i }),
      reimbursement: page.getByRole('columnheader', { name: /Reimbursement/i }),
      totalOffCycleNonTaxableAmount: page.getByRole('columnheader', { name: /Total Off-Cycle Non-Taxable Amount/i }),
      totalPay: page.getByRole('columnheader', { name: /Total Pay/i }),
    };
    this.rows = page.locator('table tbody tr');
  }

  async openPaySlipTab() {
    await this.paySlipTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getColumnHeadersText() {
    const headers = [];
    for (const key of Object.keys(this.columns)) {
      headers.push(await this.columns[key].textContent());
    }
    return headers;
  }

  async getRowDataByPaySlipType(paySlipType) {
    const rowCount = await this.rows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = this.rows.nth(i);
      const typeCell = row.locator('td').nth(1); // Assuming second column is Pay slip Type
      const typeText = await typeCell.textContent();
      if (typeText.trim().toLowerCase() === paySlipType.toLowerCase()) {
        // Extract all columns text for this row
        const cells = row.locator('td');
        const cellCount = await cells.count();
        const rowData = [];
        for (let j = 0; j < cellCount; j++) {
          rowData.push((await cells.nth(j).textContent()).trim());
        }
        return rowData;
      }
    }
    return null;
  }

  async getReimbursementValueForPeriod(period) {
    const rowCount = await this.rows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = this.rows.nth(i);
      const periodCell = row.locator('td').first();
      const periodText = await periodCell.textContent();
      if (periodText.trim() === period) {
        // Reimbursement column index assumed 7 (0-based)
        const reimbursementCell = row.locator('td').nth(7);
        return (await reimbursementCell.textContent()).trim();
      }
    }
    return null;
  }

  async getNetPayValueForPeriod(period) {
    const rowCount = await this.rows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = this.rows.nth(i);
      const periodCell = row.locator('td').first();
      const periodText = await periodCell.textContent();
      if (periodText.trim() === period) {
        // Net column index assumed 6 (0-based)
        const netCell = row.locator('td').nth(6);
        return (await netCell.textContent()).trim();
      }
    }
    return null;
  }

  async getTotalPayValueForPeriod(period) {
    const rowCount = await this.rows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = this.rows.nth(i);
      const periodCell = row.locator('td').first();
      const periodText = await periodCell.textContent();
      if (periodText.trim() === period) {
        // Total Pay column index assumed 9 (0-based)
        const totalPayCell = row.locator('td').nth(9);
        return (await totalPayCell.textContent()).trim();
      }
    }
    return null;
  }
}

module.exports = { PaySlipTabPage };
