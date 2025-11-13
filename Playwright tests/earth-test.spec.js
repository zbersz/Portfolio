// @ts-check
const { test, expect } = require('@playwright/test');

// Функция-помощник для навигации к статье о Земле
async function navigateToEarthArticle(page) {
  // 1. Открыть новую вкладку (в Playwright это происходит автоматически при создании page)
  // 2. Перейти по ссылке на главную страницу Википедии
  await page.goto('https://ru.wikipedia.org/wiki/%D0%97%D0%B0%D0%B3%D0%BB%D0%B0%D0%B2%D0%BD%D0%B0%D1%8F_%D1%81%D1%82%D1%80%D0%B0%D0%BD%D0%B8%D1%86%D0%B0');

  // 3. В поле поиска ввести "Земля" и применить ввод
  const searchInput = page.locator('input[name="search"]');
  await searchInput.fill('Земля');
  
  // Ждем появления автодополнения (если оно есть)
  // Пробуем кликнуть на первый результат автодополнения, если он появился
  try {
    const autocompleteResult = page.locator('.suggestions-results a, .suggestions a, .mw-searchSuggest a').first();
    await autocompleteResult.waitFor({ state: 'visible', timeout: 2000 });
    await autocompleteResult.click();
    // Если автодополнение сработало, переходим к проверке статьи
    await page.waitForLoadState('networkidle');
  } catch (e) {
    // Если автодополнение не появилось, используем Enter
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle');
    
    // Проверяем, на какой странице мы оказались
    const currentUrl = page.url();
    
    // Если открылась страница результатов поиска, кликаем на первый результат
    if (currentUrl.includes('/wiki/Special:Search') || currentUrl.includes('search=') || currentUrl.includes('fulltext=1')) {
      // Ищем первую ссылку на статью в результатах поиска
      // Пробуем разные селекторы для результатов поиска Википедии
      const firstResult = page.locator(
        '.mw-search-result-heading a, ' +
        '.searchresults a[href*="/wiki/"], ' +
        '.mw-search-results a[href*="/wiki/"], ' +
        'ul.mw-search-results > li:first-child a, ' +
        '.searchResult a[href*="/wiki/"]'
      ).first();
      
      await expect(firstResult).toBeVisible({ timeout: 10000 });
      await firstResult.click();
      
      // Ждем загрузки статьи
      await page.waitForLoadState('networkidle');
    }
  }
  
  // Убеждаемся, что мы на странице статьи (а не результатах поиска)
  // URL может содержать закодированное значение %D0%97%D0%B5%D0%BC%D0%BB%D1%8F вместо "Земля"
  await expect(page).toHaveURL(/.*\/wiki\/(?!Special:).*/);
}

test('Проверка содержания кислорода в атмосфере Земли', async ({ page }) => {
  // Навигация к статье о Земле
  await navigateToEarthArticle(page);

  // 4. Найти раздел "Химический состав атмосферы"
  // Ищем заголовок раздела (может быть h2, h3 или h4)
  const sectionHeading = page.locator('h2, h3, h4').filter({ hasText: /Химический состав атмосферы/i }).first();
  await expect(sectionHeading).toBeVisible({ timeout: 10000 });
  
  // 5. Найти конкретную строку с описанием состава атмосферы
  // Ищем строку: "У поверхности Земли осушенный воздух содержит около 78,08 % азота (по объёму), 20,95 % кислорода, 0,93 % аргона и около 0,03 % углекислого газа"
  
  let targetSentence = null;
  let oxygenFound = false;
  let oxygenValue = null;
  
  // Подход 1: Поиск через locator по ключевым словам из предложения
  try {
    // Ищем элемент, содержащий начало предложения "У поверхности Земли осушенный воздух"
    const sentenceLocator = page.locator('text=/У поверхности Земли.*осушенный воздух.*содержит/i');
    const count = await sentenceLocator.count();
    if (count > 0) {
      targetSentence = await sentenceLocator.first().textContent();
    }
  } catch (e) {
    // Продолжаем с другими методами
  }
  
  // Подход 2: Поиск через текст страницы
  if (!targetSentence) {
    const pageText = await page.textContent('body');
    
    // Ищем предложение, содержащее ключевые слова
    const sentenceRegex = /У поверхности Земли[^.]*осушенный воздух[^.]*содержит[^.]*78[,.]08[^.]*азота[^.]*20[,.]95[^.]*кислорода[^.]*/i;
    const sentenceMatch = pageText.match(sentenceRegex);
    
    if (sentenceMatch) {
      targetSentence = sentenceMatch[0];
    } else {
      // Альтернативный поиск - ищем более короткий фрагмент
      const shortRegex = /осушенный воздух[^.]*содержит[^.]*20[,.]95[^.]*кислорода[^.]*/i;
      const shortMatch = pageText.match(shortRegex);
      if (shortMatch) {
        targetSentence = shortMatch[0];
      }
    }
  }
  
  // Проверяем, что нашли нужное предложение
  if (targetSentence) {
    // Ищем в этом предложении значение "20,95 % кислорода"
    const oxygenRegex = /20[,.]95\s+%\s+кислорода/i;
    const oxygenMatch = targetSentence.match(oxygenRegex);
    
    if (oxygenMatch) {
      // Извлекаем числовое значение
      const valueMatch = oxygenMatch[0].match(/20[,.]95/);
      if (valueMatch) {
        oxygenValue = valueMatch[0];
        oxygenFound = true;
      }
    } else {
      // Пробуем более гибкий поиск с учетом неразрывных пробелов
      const flexibleRegex = /20[,.]95[\s\u00A0]+%[\s\u00A0]+кислорода/i;
      const flexibleMatch = targetSentence.match(flexibleRegex);
      if (flexibleMatch) {
        const valueMatch = flexibleMatch[0].match(/20[,.]95/);
        if (valueMatch) {
          oxygenValue = valueMatch[0];
          oxygenFound = true;
        }
      }
    }
  }
  
  // Проверяем результат
  if (oxygenFound && oxygenValue) {
    // Проверяем, что значение именно 20,95 (не изменилось)
    expect(oxygenValue).toMatch(/^20[,.]95$/);
    console.log(`Тест пройден: найдено "20,95 % кислорода" в строке о составе атмосферы`);
    console.log(`Проверенное значение кислорода: ${oxygenValue}`);
    console.log(`Найденная строка: "${targetSentence.substring(0, 150)}..."`);
  } else {
    // Выводим отладочную информацию для диагностики
    const pageText = await page.textContent('body');
    const hasSentence = pageText.includes('У поверхности Земли') || pageText.includes('осушенный воздух');
    const has2095 = pageText.includes('20,95') || pageText.includes('20.95');
    const hasOxygen = pageText.includes('кислорода');
    
    console.log('Диагностика:');
    console.log(`- Найдено начало предложения "У поверхности Земли" или "осушенный воздух": ${hasSentence}`);
    console.log(`- Найдено "20,95" или "20.95": ${has2095}`);
    console.log(`- Найдено "кислорода": ${hasOxygen}`);
    
    if (targetSentence) {
      console.log(`- Найдено предложение: "${targetSentence.substring(0, 200)}..."`);
    } else {
      console.log('- Предложение с описанием состава атмосферы не найдено');
    }
    
    // Показываем фрагмент текста вокруг "осушенный воздух"
    const airIndex = pageText.indexOf('осушенный воздух');
    if (airIndex > -1) {
      const context = pageText.substring(Math.max(0, airIndex - 50), 
                                         Math.min(pageText.length, airIndex + 300));
      console.log('Контекст вокруг "осушенный воздух":', context);
    }
    
    throw new Error('Не найдено значение "20,95 % кислорода" в строке "У поверхности Земли осушенный воздух содержит около 78,08 % азота (по объёму), 20,95 % кислорода, 0,93 % аргона и около 0,03 % углекислого газа"');
  }
});

test('Проверка наличия раздела "Химический состав атмосферы" в статье о Земле', async ({ page }) => {
  // Навигация к статье о Земле
  await navigateToEarthArticle(page);

  // Проверяем, что раздел "Химический состав атмосферы" существует на странице
  // Ищем заголовок раздела (может быть h2, h3 или h4)
  const sectionHeading = page.locator('h2, h3, h4').filter({ hasText: /Химический состав атмосферы/i }).first();
  
  // Проверяем, что раздел видим и существует
  await expect(sectionHeading).toBeVisible({ timeout: 10000 });
  
  // Дополнительная проверка: убеждаемся, что раздел содержит какой-то контент
  // Получаем текст заголовка для подтверждения
  const headingText = await sectionHeading.textContent();
  expect(headingText).toMatch(/Химический состав атмосферы/i);
  
  console.log(`Тест пройден: раздел "Химический состав атмосферы" найден на странице`);
  console.log(`Заголовок раздела: "${headingText}"`);
});

