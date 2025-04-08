const coverLetterText = `
Добрый день, интересует ваше предложение о работе. 
Если предложение ещё актуально, свяжитесь со мной, пожалуйста, через чат или Telegram: [your_telegram]
`;

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

function initCoverLetterAutomation() {
    document.body.addEventListener("click", async (event) => {
        const clickedButton = event.target.closest('a[data-qa="vacancy-serp__vacancy_response"]');
        if (!clickedButton) return;

        console.log("🟡 Кнопка нажата. Ожидаем кнопку 'Приложить письмо'...");

        try {
            const attachLetterButton = await waitForResponseInfinite('button[data-qa="vacancy-response-letter-toggle"]');
            attachLetterButton.click();
            console.log("🟢 Нажали 'Приложить письмо'");

            const textarea = await waitForResponseInfinite('textarea[name="text"]');
            textarea.value = coverLetterText.trim();
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            console.log("🟢 Вставили сопроводительное письмо");

            const submitButton = await waitForResponseInfinite('button[data-qa="vacancy-response-letter-submit"]');
            submitButton.click();
            console.log("✅ Письмо отправлено!");
        } catch (err) {
            console.warn("⚠️ Ошибка:", err);
        }
    });
}

initCoverLetterAutomation();
console.log("📌 Скрипт активен. Ждем нажатия кнопки 'Откликнуться'");