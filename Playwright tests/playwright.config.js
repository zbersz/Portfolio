// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './',
  /* Максимальное время выполнения одного теста */
  timeout: 30 * 1000,
  expect: {
    /**
     * Максимальное время ожидания для expect assertions
     * @see https://playwright.dev/docs/api/class-testexpect#expect-set-timeout
     */
    timeout: 5000
  },
  /* Запуск тестов в параллельном режиме */
  fullyParallel: true,
  /* Не запускать тесты в CI */
  forbidOnly: !!process.env.CI,
  /* Повторные попытки только в CI */
  retries: process.env.CI ? 2 : 0,
  /* Оптимизация для CI */
  workers: process.env.CI ? 1 : undefined,
  /* Репортер для использования */
  reporter: 'html',
  /* Общие настройки для всех проектов */
  use: {
    /* Базовый URL для использования в действиях типа navigate */
    // baseURL: 'http://127.0.0.1:3000',

    /* Собирать trace при повторе неудачного теста */
    trace: 'on-first-retry',
  },

  /* Настройка проектов для основных браузеров */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

