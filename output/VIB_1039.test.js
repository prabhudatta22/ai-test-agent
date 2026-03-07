
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../src/pages/LoginPage');
const { CreatePostPage } = require('../src/pages/CreatePostPage');

test.describe('Create Post Module', () => {

  let loginPage;
  let createPostPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    loginPage.loginToApp(page);
    createPostPage = new CreatePostPage(page);
  });

  test('TC001 - Select and use a content creation template', async ({ page }) => {
    
    await test.step('Navigate to Create Post page', async () => {
      await createPostPage.navigateToCreatePost(page);
    });

    await test.step('Verify post creation screen is pre-populated with template prompts', async () => {
       await createPostPage.openCreatePostFromMainFeed();
      const urlInputVisible = await createPostPage.urlInput.isVisible();
      expect(urlInputVisible).toBeTruthy();
      
    });

      await test.step('Select a template from the categorized list', async () => {
      await createPostPage.selectTemplate('New Post');
    });
  });

  test('TC002 - Post button enabled only after mandatory fields completion', async ({ page }) => {
    await test.step('Login as employeeUser', async () => {
      await loginPage.login('employeeUser', 'password123');
    });

    await test.step('Navigate to Create Post page and select Good Reads template', async () => {
      await createPostPage.navigateToCreatePost('/create-post');
      await createPostPage.selectTemplate('Good Reads');
    });

    await test.step('Leave Paste link field empty and verify post button is disabled', async () => {
      await createPostPage.urlInput.fill('');
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
    });

    await test.step('Enter a valid link and verify post button is enabled', async () => {
      await createPostPage.fillGoodReadsUrl('https://example.com');
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });

  test('TC003 - Validate online URL in link field for Good Reads template', async ({ page }) => {
    await test.step('Login as employeeUser', async () => {
      await loginPage.login('employeeUser', 'password123');
    });

    await test.step('Navigate to Create Post page and select Good Reads template', async () => {
      await createPostPage.navigateToCreatePost('/create-post');
      await createPostPage.selectTemplate('Good Reads');
    });

    await test.step('Enter invalid URL and attempt to submit', async () => {
      await createPostPage.fillGoodReadsUrl('file://localpath');
      await createPostPage.clickPostButton();
      const error = await createPostPage.getErrorMessage();
      expect(error).toContain('Invalid URL');
    });

    await test.step('Enter valid online URL and attempt to submit', async () => {
      await createPostPage.fillGoodReadsUrl('https://example.com');
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });

  test('TC004 - Upload attachments respecting defined limits', async ({ page }) => {
    await test.step('Login as employeeUser', async () => {
      await loginPage.login('employeeUser', 'password123');
    });

    await test.step('Navigate to Create Post page', async () => {
      await createPostPage.navigateToCreatePost('/create-post');
    });

    await test.step('Upload 2 gifs and verify limits', async () => {
      await createPostPage.uploadAttachment(['tests/assets/sample1.gif', 'tests/assets/sample2.gif']);
      // Verify upload success or limit enforcement if exceeded
    });

    await test.step('Upload 6 images and verify limits', async () => {
      await createPostPage.uploadAttachment([
        'tests/assets/sample1.jpg',
        'tests/assets/sample2.jpg',
        'tests/assets/sample3.jpg',
        'tests/assets/sample4.jpg',
        'tests/assets/sample5.jpg',
        'tests/assets/sample6.jpg'
      ]);
      // Verify upload success or limit enforcement if exceeded
    });

    await test.step('Upload 6 files and verify limits', async () => {
      await createPostPage.uploadAttachment([
        'tests/assets/sample1.pdf',
        'tests/assets/sample2.pdf',
        'tests/assets/sample3.pdf',
        'tests/assets/sample4.pdf',
        'tests/assets/sample5.pdf',
        'tests/assets/sample6.pdf'
      ]);
      // Verify upload success or limit enforcement if exceeded
    });

    await test.step('Upload 6 videos and verify limits', async () => {
      await createPostPage.uploadAttachment([
        'tests/assets/sample1.mp4',
        'tests/assets/sample2.mp4',
        'tests/assets/sample3.mp4',
        'tests/assets/sample4.mp4',
        'tests/assets/sample5.mp4',
        'tests/assets/sample6.mp4'
      ]);
      // Verify upload success or limit enforcement if exceeded
    });

    await test.step('Hover over attachment icons and verify limit info', async () => {
      // Assuming attachment icons have title or tooltip attribute
      const attachmentIcons = await page.locator('.attachment-icon');
      for (let i = 0; i < await attachmentIcons.count(); i++) {
        await attachmentIcons.nth(i).hover();
        const tooltip = await page.locator('.tooltip').textContent();
        expect(tooltip).toMatch(/limit/i);
      }
    });
  });

  test('TC005 - Toggle visibility based on admin settings and user role', async ({ page }) => {
    // Step 1 & 2: Login as regular user; admin enabled comments
    await test.step('Login as regular user with comments enabled', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
    });

    await test.step('Verify Allow comments & replies toggle visible', async () => {
      expect(await createPostPage.isAllowCommentsToggleVisible()).toBeTruthy();
    });

    // Step 3 & 4: Login as regular user; admin disabled comments
    await test.step('Login as regular user with comments disabled', async () => {
      // Simulate admin disabling comments - placeholder for API or setup
      // await api.setCommentsEnabled(false);
      await page.reload();
    });

    await test.step('Verify Allow comments & replies toggle not visible', async () => {
      expect(await createPostPage.isAllowCommentsToggleVisible()).toBeFalsy();
    });

    // Step 5 & 6: Login as admin user
    await test.step('Login as admin user', async () => {
      await loginPage.login('adminUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
    });

    await test.step('Verify Post on behalf of company toggle visible', async () => {
      expect(await createPostPage.isPostOnBehalfToggleVisible()).toBeTruthy();
    });
  });

  test('TC006 - Post audience default and changeability based on context', async ({ page }) => {
    await test.step('Login as employeeUser', async () => {
      await loginPage.login('employeeUser', 'password123');
    });

    await test.step('Create post from main feed and verify default audience', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      const audienceText = await createPostPage.audienceDropdown.textContent();
      expect(audienceText).toContain('All Employees');
    });

    await test.step('Change audience to a group user is part of', async () => {
      await createPostPage.selectAudience('Engineering Team');
      const selectedAudience = await createPostPage.audienceDropdown.textContent();
      expect(selectedAudience).toContain('Engineering Team');
    });

    await test.step('Create post from within a group and verify default audience', async () => {
      await createPostPage.openCreatePostFromGroup();
      const audienceText = await createPostPage.audienceDropdown.textContent();
      expect(audienceText).toContain('Group Members');
    });

    await test.step('Attempt to change audience (should not be allowed)', async () => {
      expect(await createPostPage.isAudienceSelectionDisabled()).toBeTruthy();
    });
  });

  test('TC007 - Automatic hashtag generation from template name', async ({ page }) => {
    await test.step('Login as employeeUser and create post using Good Reads template', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
      await createPostPage.selectTemplate('Good Reads');
      await createPostPage.fillGoodReadsUrl('https://example.com');
      await createPostPage.clickPostButton();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify hashtag #GoodReads added to caption', async () => {
      const hashtagText = await createPostPage.getHashtagText();
      expect(hashtagText).toBe('#GoodReads');
    });

    await test.step('Click hashtag and verify feed filters accordingly', async () => {
      await createPostPage.clickHashtag();
      await expect(page).toHaveURL(/hashtag=GoodReads/);
      // Additional verification that feed is filtered can be added here
    });
  });

  test('TC008 - Preview post before submitting for each template', async ({ page }) => {
    await test.step('Login as employeeUser and navigate to Create Post', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
    });

    await test.step('Select any template and fill mandatory fields', async () => {
      await createPostPage.selectTemplate('Good Reads');
      await createPostPage.fillGoodReadsUrl('https://example.com');
    });

    await test.step('Click Preview button and verify preview content', async () => {
      await createPostPage.clickPreviewButton();
      const previewContent = await createPostPage.getPreviewContent();
      expect(previewContent).toContain('https://example.com');
    });
  });

  test('TC009 - First time user sees prioritized templates and sample previews', async ({ page }) => {
    await test.step('Login as first time user and navigate to Create Post', async () => {
      await loginPage.login('newEmployee', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
    });

    await test.step('Verify prioritized templates shown', async () => {
      const iceBreaker = await page.getByRole('option', { name: 'Ice Breaker' }).isVisible();
      const seekingMentorship = await page.getByRole('option', { name: 'Seeking Mentorship' }).isVisible();
      expect(iceBreaker).toBeTruthy();
      expect(seekingMentorship).toBeTruthy();
    });

    await test.step('Verify sample previews available', async () => {
      const previewButtonVisible = await createPostPage.previewButton.isVisible();
      expect(previewButtonVisible).toBeTruthy();
    });

    await test.step('Verify nudges like Explore templates displayed', async () => {
      expect(await createPostPage.isNudgeExploreTemplatesVisible()).toBeTruthy();
    });
  });

  test('TC010 - Returning user sees segregation of templates based on prior contributions', async ({ page }) => {
    await test.step('Login as returning user with prior contributions and navigate to Create Post', async () => {
      await loginPage.login('returningUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
    });

    await test.step('Verify templates segregated accordingly', async () => {
      const contributedSection = await page.locator('text=Contributed Templates').isVisible();
      const notContributedSection = await page.locator('text=Not Yet Contributed').isVisible();
      expect(contributedSection).toBeTruthy();
      expect(notContributedSection).toBeTruthy();
    });
  });

  test('TC011 - Schedule post creation, editing, and cancellation', async ({ page }) => {
    await test.step('Login as employeeUser and navigate to schedule post page', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post/schedule');
    });

    await test.step('Create post with schedule date/time and save', async () => {
      // Placeholder: Implement scheduling logic with date/time input
      await createPostPage.createScheduledPost('2099-12-31T12:00');
      // Verify scheduled post saved
      expect(await createPostPage.scheduledPostsList.isVisible()).toBeTruthy();
    });

    await test.step('Edit scheduled post content and time', async () => {
      await createPostPage.editScheduledPost();
      // Placeholder: Edit content and time
      // Save changes
    });

    await test.step('Cancel scheduled post and verify it does not appear', async () => {
      await createPostPage.cancelScheduledPost();
      // Verify scheduled post removed
      expect(await createPostPage.scheduledPostsList.locator('text=2099-12-31T12:00').count()).toBe(0);
    });
  });

  test('TC012 - Background color changes dynamically based on user selection', async ({ page }) => {
    await test.step('Login as employeeUser and navigate to Create Post', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
    });

    await test.step('Select Seeking Mentorship template', async () => {
      await createPostPage.selectTemplate('Seeking Mentorship');
    });

    await test.step('Choose different background colors and verify changes', async () => {
      const colorOptions = await page.locator('.background-color-option');
      for (let i = 0; i < await colorOptions.count(); i++) {
        await colorOptions.nth(i).click();
        const bgColor = await page.locator('.template-background').evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(bgColor).toBeTruthy();
      }
    });
  });

  test('TC013 - Attachment size boundary validation', async ({ page }) => {
    await test.step('Login as employeeUser and navigate to Create Post', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
    });

    await test.step('Attempt to upload image >10MB and verify rejection', async () => {
      await createPostPage.uploadAttachment('tests/assets/large_image_11MB.jpg');
      const error = await createPostPage.getErrorMessage();
      expect(error).toContain('size limit');
    });

    await test.step('Attempt to upload video >250MB and verify rejection', async () => {
      await createPostPage.uploadAttachment('tests/assets/large_video_251MB.mp4');
      const error = await createPostPage.getErrorMessage();
      expect(error).toContain('size limit');
    });

    await test.step('Attempt to upload file >10MB and verify rejection', async () => {
      await createPostPage.uploadAttachment('tests/assets/large_file_11MB.pdf');
      const error = await createPostPage.getErrorMessage();
      expect(error).toContain('size limit');
    });
  });

  test('TC014 - Mandatory picture upload validation for Pet Pics template', async ({ page }) => {
    await test.step('Login as employeeUser and navigate to Create Post', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
    });

    await test.step('Select Pet Pics template and verify post button disabled without picture', async () => {
      await createPostPage.selectTemplate('Pet Pics');
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
    });

    await test.step('Upload one picture and verify post button enabled', async () => {
      await createPostPage.uploadPicture('tests/assets/sample_pet.jpg');
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });

  test('TC015 - Post creation with toggles in all permutations', async ({ page }) => {
    await test.step('Login as adminUser and navigate to Create Post', async () => {
      await loginPage.login('adminUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
    });

    const permutations = [
      { allowComments: true, postOnBehalf: true },
      { allowComments: false, postOnBehalf: false },
      { allowComments: true, postOnBehalf: false },
      { allowComments: false, postOnBehalf: true }
    ];

    for (const perm of permutations) {
      await test.step(`Create post with allowComments=${perm.allowComments} and postOnBehalf=${perm.postOnBehalf}`, async () => {
        await createPostPage.toggleAllowComments(perm.allowComments);
        await createPostPage.togglePostOnBehalf(perm.postOnBehalf);
        await createPostPage.selectTemplate('Good Reads');
        await createPostPage.fillGoodReadsUrl('https://example.com');
        expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
        await createPostPage.clickPostButton();
        await page.waitForLoadState('networkidle');
        // Optionally verify post creation success message
      });
    }
  });

  test('TC016 - Negative: Attempt to post without completing mandatory fields', async ({ page }) => {
    await test.step('Login as employeeUser and navigate to Create Post', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
    });

    await test.step('Select any template and leave mandatory fields empty', async () => {
      await createPostPage.selectTemplate('Good Reads');
      await createPostPage.fillGoodReadsUrl('');
    });

    await test.step('Attempt to post and verify post button disabled or error shown', async () => {
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
      await createPostPage.clickPostButton().catch(() => {});
      const error = await createPostPage.getErrorMessage();
      expect(error).toBeTruthy();
    });
  });

  test('TC017 - Integration: Verify backend analytics tagging of posts by template type', async ({ page, request }) => {
    await test.step('Login as employeeUser and create post using Ideas template', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
      await createPostPage.selectTemplate('Ideas');
      await createPostPage.fillPosterText('Test idea post');
      await createPostPage.clickPostButton();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Check backend analytics data for post and verify template type tag', async () => {
      // Placeholder: Fetch latest post analytics via API
      const response = await request.get(`${process.env.BASE_URL}/api/posts/latest`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.templateType).toBe('Ideas');
    });
  });

  test('TC018 - Performance: Load test template carousel with increasing number of templates', async ({ page }) => {
    await test.step('Login as employeeUser and navigate to feed', async () => {
      await loginPage.login('employeeUser', 'password123');
      await page.goto(`${process.env.BASE_URL}/feed`);
    });

    await test.step('Load main feed with 10 templates in carousel and measure load time', async () => {
      // Placeholder: Setup 10 templates in carousel
      const start = Date.now();
      await page.waitForSelector('div.template-carousel >> nth=9', { timeout: 10000 });
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });

    await test.step('Increase templates to 50 and measure load time and responsiveness', async () => {
      // Placeholder: Setup 50 templates in carousel
      const start = Date.now();
      await page.waitForSelector('div.template-carousel >> nth=49', { timeout: 15000 });
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000);
      // Additional responsiveness checks can be added here
    });
  });

  test('TC019 - Security: Verify role-based access for Post on behalf of company toggle', async ({ page }) => {
    await test.step('Login as regular employee and verify toggle not visible', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
      expect(await createPostPage.isPostOnBehalfToggleVisible()).toBeFalsy();
    });

    await test.step('Login as admin user and verify toggle visible and usable', async () => {
      await loginPage.login('adminUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
      expect(await createPostPage.isPostOnBehalfToggleVisible()).toBeTruthy();
      await createPostPage.togglePostOnBehalf(true);
      const isChecked = await createPostPage.postOnBehalfToggle.isChecked();
      expect(isChecked).toBeTruthy();
    });
  });

  test('TC020 - Negative: Attempt to upload unsupported attachment types', async ({ page }) => {
    await test.step('Login as employeeUser and navigate to Create Post', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
    });

    await test.step('Attempt to upload unsupported file type and verify rejection', async () => {
      await createPostPage.uploadAttachment('tests/assets/malicious.exe');
      const error = await createPostPage.getErrorMessage();
      expect(error).toContain('unsupported');
    });
  });

  test('TC021 - Boundary: Content body character limits enforcement', async ({ page }) => {
    await test.step('Login as employeeUser and navigate to Create Post', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post');
    });

    await test.step('Enter content below minimum limit and attempt to post', async () => {
      await createPostPage.fillPosterText('Hi');
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
    });

    await test.step('Enter content exceeding maximum limit and attempt to post', async () => {
      const longText = 'a'.repeat(5001);
      await createPostPage.fillPosterText(longText);
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
    });

    await test.step('Enter content within limits and attempt to post', async () => {
      const validText = 'This is a valid post content within limits.';
      await createPostPage.fillPosterText(validText);
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });

  test('TC022 - Negative: Attempt to change audience when posting from within a group', async ({ page }) => {
    await test.step('Login as employeeUser and create post from within a group', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.openCreatePostFromGroup();
    });

    await test.step('Attempt to change audience to other groups or departments', async () => {
      expect(await createPostPage.isAudienceSelectionDisabled()).toBeTruthy();
    });
  });

  test('TC023 - Integration: Verify hashtag search filters feed content', async ({ page }) => {
    await test.step('Login as employeeUser and navigate to feed', async () => {
      await loginPage.login('employeeUser', 'password123');
      await page.goto(`${process.env.BASE_URL}/feed`);
    });

    await test.step('Click hashtag on a post created via template and verify feed updates', async () => {
      await createPostPage.clickHashtag();
      await expect(page).toHaveURL(/hashtag=/);
      // Additional verification that feed is filtered can be added here
    });
  });

  test('TC024 - Negative: Attempt to post with invalid scheduled date/time', async ({ page }) => {
    await test.step('Login as employeeUser and navigate to schedule post page', async () => {
      await loginPage.login('employeeUser', 'password123');
      await createPostPage.navigateToCreatePost('/create-post/schedule');
    });

    await test.step('Enter past date/time and attempt to save', async () => {
      await createPostPage.createScheduledPost('2000-01-01T00:00');
      const error = await createPostPage.getErrorMessage();
      expect(error).toContain('Invalid scheduled date');
    });

    await test.step('Enter invalid date/time format and attempt to save', async () => {
      await createPostPage.createScheduledPost('invalid-date');
      const error = await createPostPage.getErrorMessage();
      expect(error).toContain('Invalid scheduled date');
    });
  });

  test('TC025 - Performance: Verify system behavior under concurrent post creations using templates', async ({ request }) => {
    await test.step('Simulate 50 users creating posts concurrently and measure response times', async () => {
      const concurrency = 50;
      const promises = [];
      for (let i = 0; i < concurrency; i++) {
        promises.push(
          request.post(`${process.env.BASE_URL}/api/posts`, {
            data: {
              template: 'Good Reads',
              url: `https://example.com/post${i}`,
              content: `Concurrent post ${i}`
            }
          })
        );
      }
      const responses = await Promise.all(promises);
      for (const response of responses) {
        expect(response.ok()).toBeTruthy();
      }
      // Additional performance metrics can be collected here
    });
  });

});