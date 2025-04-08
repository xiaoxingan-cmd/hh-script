const blueResponseButton = 'a[data-qa="vacancy-serp__vacancy_response"]';
const addCoverLetterButtonPrimary = 'button[data-qa="vacancy-response-letter-toggle"]';
const submitButtonPrimary = 'button[data-qa="vacancy-response-letter-submit"]';
const submitButtonForced = 'button[data-qa="vacancy-response-submit-popup"]';
const acceptRelocationWarningButton = 'button[data-qa="relocation-warning-confirm"]';

const vacancyContainer = 'div[data-qa*="vacancy-serp__vacancy"]';
const vacancyTitleSelector = 'h2[data-qa="bloko-header-2"]';
const vacancyCompanySelector = 'span[data-qa="vacancy-serp__vacancy-employer-text"]';

const textareaCoverLetterPrimary = 'textarea[name="text"]';
const textareaCoverLetterForced = 'textarea[data-qa="vacancy-response-popup-form-letter-input"]';

const titleToFindAfterRedirect = '[data-qa="title-description"]';
const waitForRedirectTimeout = 2500;
const waitAfterRedirectByHistoryTimeout = 1000;

const coverLetterText = `
Добрый день, интересует ваше предложение о работе. 
Если предложение ещё актуально, свяжитесь со мной, пожалуйста, через чат или Telegram: [your_telegram]
`;

function getProcessedVacancies() {
    const processedVacancies = localStorage.getItem("processedVacancies");
    return processedVacancies ? JSON.parse(processedVacancies) : [];
}

function saveProcessedVacancy(vacancy) {
    const processedVacancies = getProcessedVacancies();
    processedVacancies.push(vacancy);
    localStorage.setItem("processedVacancies", JSON.stringify(processedVacancies));
}

function isVacancyProcessed(vacancyTitle, companyName) {
    const processedVacancies = getProcessedVacancies();
    return processedVacancies.some(vacancy => vacancy.title === vacancyTitle && vacancy.company === companyName);
}

function waitForResponseInfinite(selector) {
    return new Promise((resolve) => {
        const check = () => {
            const element = document.querySelector(selector);
            if (element) {
                return resolve(element);
            }

            requestAnimationFrame(check);
        };
        check();
    });
}

function waitForResponse(selector, timeout = 1500) {
    return new Promise((resolve) => {
        const start = Date.now();

        const check = () => {
            const element = document.querySelector(selector);
            if (element) {
                return resolve(element);
            }

            if (Date.now() - start > timeout) {
                console.warn(`🔴 Элемент не найден за ${timeout} мс: ${selector}`);
                return resolve(null);
            }

            requestAnimationFrame(check);
        };

        check();
    });
}

async function checkRelocationWarning() {
    const relocationConfirmButton = await waitForResponse(acceptRelocationWarningButton);

    if (relocationConfirmButton) {
        console.log("🟡 Окно с предупреждением о переезде появилось на экране и было найдено.");
        relocationConfirmButton.click();
        console.log("🟢 Нажали 'Все равно откликнуться'");
    } else {
        console.log("🟢 Окно с предупреждением о переезде не появилось.");
    }
}

function setNativeValue(element, value) {
    const lastValue = element.value;
    element.value = value;

    const event = new Event('input', { bubbles: true });

    const tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }

    element.dispatchEvent(event);
}


async function checkForcedCoverLetter(vacancyTitle, companyName) {
    const textarea = await waitForResponse(textareaCoverLetterForced);

    if (textarea) {
        console.log("🟡 На экране появилось принудительное сопроводительное письмо");

        setNativeValue(textarea, coverLetterText.trim());
        console.log("🟢 Вставили сопроводительное письмо");

        const submitButton = await waitForResponse(submitButtonForced);
        submitButton.click();
        console.log("✅ Письмо отправлено!");

        saveProcessedVacancy({ title: vacancyTitle, company: companyName });
        console.log("🟢 Сохраняем вакансию как обработанную...");

        return true;
    } else {
        console.log("🟢 Pop-up для сопроводительного письма не был выведен")
        return false;
    }
}

async function checkForRedirect(clickedButton, vacancyTitle, companyName) {
    setTimeout(() => {
        const element = document.querySelector(titleToFindAfterRedirect);
        const rawText = element?.textContent?.trim();
        const normalizedText = rawText?.replace(/\u00A0/g, ' ');
        const isQuestionPage = normalizedText?.includes('Для отклика необходимо ответить на несколько вопросов работодателя');

        if (isQuestionPage) {
            console.log("🟡 Вакансия требует ответов на вопросы. Возвращаемся назад...");
            window.history.back();
            handleRedirectProcessing(clickedButton, vacancyTitle, companyName);
        } else {
            console.log("🟢 Редиректа не произошло");
        }
    }, waitForRedirectTimeout);
}

function handleRedirectProcessing(clickedButton, vacancyTitle, companyName) {
    setTimeout(() => {
        saveProcessedVacancy({ title: vacancyTitle, company: companyName });
        console.log("🟢 Вакансия добавлена как обработанная.");

    }, waitAfterRedirectByHistoryTimeout);
}

function initCoverLetterAutomation() {
    localStorage.removeItem('processedVacancies');

    document.body.addEventListener("click", async (event) => {
        const clickedButton = event.target.closest(blueResponseButton);
        if (!clickedButton) {
            return;
        }

        console.log("🟢 Кнопка отклика на вакансию нажата!");

        const vacancyContainerBlock = clickedButton.closest(vacancyContainer);
        console.log("🟢 Получили контейнер вакансии:", vacancyContainerBlock);
        if (!vacancyContainerBlock) {
            console.log("🔴 Не удалось найти контейнер вакансии, возможно структура страницы изменилась.");
            return;
        }

        const vacancyTitle = vacancyContainerBlock.querySelector(vacancyTitleSelector)?.textContent.trim();
        const companyName = vacancyContainerBlock.querySelector(vacancyCompanySelector)?.textContent.trim();
        console.log("🔍 Название вакансии:", vacancyTitle, ", Название компании:", companyName);

        if (!vacancyTitle || !companyName) {
            console.log("🔴 Не удалось найти название вакансии или компании. Возможно селекторы устарели.");
            return;
        }

        if (isVacancyProcessed(vacancyTitle, companyName)) {
            console.log("🔴 Эта вакансия уже обработана, пропускаем...");
            return;
        }

        console.log("🟡 Кнопка нажата. Ожидаем кнопку 'Приложить письмо'...");

        try {
            console.log("🟡 Проверяем на редирект...")
            await checkForRedirect(clickedButton, vacancyTitle, companyName);

            console.log("🟡 Проверяем на предупреждение о переезде...")
            await checkRelocationWarning();

            console.log("🟡 Проверяем на forced cover letter pop-up...")
            if (await checkForcedCoverLetter(vacancyTitle, companyName)) {

            } else {
                const attachLetterButton = await waitForResponseInfinite(addCoverLetterButtonPrimary);
                attachLetterButton.click();
                console.log("🟢 Нажали 'Приложить письмо'");

                const textarea = await waitForResponseInfinite(textareaCoverLetterPrimary);
                textarea.value = coverLetterText.trim();
                textarea.dispatchEvent(new Event("input", { bubbles: true }));
                console.log("🟢 Вставили сопроводительное письмо");

                const submitButton = await waitForResponseInfinite(submitButtonPrimary);
                submitButton.click();
                console.log("✅ Сопроводительное письмо отправлено!");

                saveProcessedVacancy({ title: vacancyTitle, company: companyName });
                console.log("🟢 Сохраняем вакансию как обработанную...");
            }
        } catch (err) {
            console.warn("🔴 Ошибка:", err);
        }
    });
}

initCoverLetterAutomation();
console.log("📌 Скрипт активен");