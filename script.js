"use strict";

// CodeCompass: Personal Coding Learning Tracker

const STORAGE_KEY = "codeCompassData";

const $ = (selector) => document.querySelector(selector);

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function createId() {
    return globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createInitialData() {
    return {
        languages: [],
        goals: [],
        journal: [],
        studyDates: [],
        theme: "dark"
    };
}

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return createInitialData();

        const data = JSON.parse(saved);

        return {
            ...createInitialData(),
            ...data,
            languages: Array.isArray(data.languages) ? data.languages : [],
            goals: Array.isArray(data.goals) ? data.goals : [],
            journal: Array.isArray(data.journal) ? data.journal : [],
            studyDates: Array.isArray(data.studyDates) ? data.studyDates : []
        };
    } catch (error) {
        console.error("Could not load saved progress:", error);
        return createInitialData();
    }
}

let data = loadData();

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error("Could not save progress:", error);
        alert("Your changes could not be saved. Check your browser storage.");
        return false;
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function recordStudyToday() {
    const today = localDateKey();

    if (!data.studyDates.includes(today)) {
        data.studyDates.push(today);
    }
}

function calculateStreak() {
    const dates = new Set(data.studyDates);
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    // Allow the streak to remain visible until the current day ends.
    let streak = 0;

    if (!dates.has(localDateKey(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
    }

    while (dates.has(localDateKey(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}

function updateDashboard() {
    const completedGoals = data.goals.filter(goal => goal.completed).length;

    // Each completed goal counts as 30 minutes for this estimate.
    // This is not a timer or a measurement of actual study time.
    const estimatedMinutes = completedGoals * 30;
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;

    $("#totalHours").textContent = `${hours}h ${minutes}m`;
    $("#languageCount").textContent = data.languages.length;
    $("#goalsCompleted").textContent = completedGoals;
    $("#streak").textContent = `${calculateStreak()} days`;

    updateAchievements();
}

function renderLanguages() {
    const container = $("#languageList");

    if (data.languages.length === 0) {
        container.innerHTML =
            '<p class="empty-state">No languages yet. Add your first programming language above! 💻</p>';
        return;
    }

    container.innerHTML = data.languages.map(language => `
        <article class="language-card">
            <div class="card-top">
                <h3>${escapeHTML(language.name)}</h3>
                <button class="small-button danger-button"
                    data-delete-language="${escapeHTML(language.id)}"
                    aria-label="Delete ${escapeHTML(language.name)}">✕</button>
            </div>

            <div class="card-top">
                <span class="muted">Learning progress</span>
                <strong>${language.progress}%</strong>
            </div>

            <div class="progress-track"
                role="progressbar"
                aria-label="${escapeHTML(language.name)} progress"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="${language.progress}">
                <div class="progress-fill" style="width: ${language.progress}%"></div>
            </div>

            <label class="muted" for="progress-${escapeHTML(language.id)}">
                Update progress
            </label>
            <input
                id="progress-${escapeHTML(language.id)}"
                type="range"
                min="0"
                max="100"
                value="${language.progress}"
                data-progress-language="${escapeHTML(language.id)}"
                aria-label="Update ${escapeHTML(language.name)} progress"
                style="width: 100%; accent-color: var(--accent);">
        </article>
    `).join("");
}

function renderGoals() {
    const container = $("#goalList");

    if (data.goals.length === 0) {
        container.innerHTML =
            '<p class="empty-state">No goals yet. Add a small goal and start learning! 🎯</p>';
        return;
    }

    container.innerHTML = data.goals.map(goal => `
        <article class="goal-item ${goal.completed ? "completed" : ""}">
            <input
                type="checkbox"
                data-toggle-goal="${escapeHTML(goal.id)}"
                ${goal.completed ? "checked" : ""}
                aria-label="Mark ${escapeHTML(goal.text)} as completed">

            <span class="goal-text">${escapeHTML(goal.text)}</span>

            <button class="small-button danger-button"
                data-delete-goal="${escapeHTML(goal.id)}"
                aria-label="Delete goal">Delete</button>
        </article>
    `).join("");
}

function renderJournal() {
    const container = $("#journalList");

    if (data.journal.length === 0) {
        container.innerHTML =
            '<p class="empty-state">Your journal is empty. Record something you learned today! 📝</p>';
        return;
    }

    container.innerHTML = [...data.journal]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(entry => `
            <article class="journal-entry">
                <h3>${escapeHTML(entry.title)}</h3>
                <time datetime="${escapeHTML(entry.createdAt)}">
                    ${escapeHTML(new Date(entry.createdAt).toLocaleString())}
                </time>
                <p>${escapeHTML(entry.content)}</p>
                <button class="small-button danger-button"
                    data-delete-journal="${escapeHTML(entry.id)}"
                    aria-label="Delete journal entry">Delete</button>
            </article>
        `).join("");
}

function updateAchievements() {
    const achievements = [
        {
            element: $("#starterBadge"),
            unlocked: data.languages.length > 0
        },
        {
            element: $("#goalBadge"),
            unlocked: data.goals.some(goal => goal.completed)
        },
        {
            element: $("#journalBadge"),
            unlocked: data.journal.length > 0
        }
    ];

    achievements.forEach(achievement => {
        achievement.element.textContent = achievement.unlocked
            ? "✓ Unlocked"
            : "Locked";

        achievement.element.closest(".achievement-card")
            .classList.toggle("unlocked", achievement.unlocked);
    });
}

function renderAll() {
    renderLanguages();
    renderGoals();
    renderJournal();
    updateDashboard();
}

// Add a programming language.
$("#languageForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("#languageName").value.trim();
    const progress = Number($("#languageProgress").value);

    if (!name || !Number.isFinite(progress) || progress < 0 || progress > 100) {
        alert("Enter a language name and progress between 0 and 100.");
        return;
    }

    if (data.languages.some(language =>
        language.name.toLowerCase() === name.toLowerCase()
    )) {
        alert("This language is already in your tracker.");
        return;
    }

    data.languages.push({
        id: createId(),
        name,
        progress
    });

    recordStudyToday();

    if (saveData()) {
        $("#languageForm").reset();
        renderAll();
    }
});

// Update language progress and delete languages.
$("#languageList").addEventListener("change", event => {
    const progressId = event.target.dataset.progressLanguage;

    if (progressId) {
        const language = data.languages.find(item => item.id === progressId);
        if (!language) return;

        language.progress = Number(event.target.value);
        recordStudyToday();

        if (saveData()) renderAll();
    }
});

$("#languageList").addEventListener("click", event => {
    const id = event.target.dataset.deleteLanguage;
    if (!id) return;

    data.languages = data.languages.filter(language => language.id !== id);

    if (saveData()) renderAll();
});

// Add a daily goal.
$("#goalForm").addEventListener("submit", event => {
    event.preventDefault();

    const text = $("#goalInput").value.trim();
    if (!text) return;

    data.goals.push({
        id: createId(),
        text,
        completed: false
    });

    if (saveData()) {
        $("#goalForm").reset();
        renderAll();
    }
});

// Complete or delete goals.
$("#goalList").addEventListener("change", event => {
    const id = event.target.dataset.toggleGoal;
    if (!id) return;

    const goal = data.goals.find(item => item.id === id);
    if (!goal) return;

    goal.completed = event.target.checked;

    if (goal.completed) recordStudyToday();

    if (saveData()) renderAll();
});

$("#goalList").addEventListener("click", event => {
    const id = event.target.dataset.deleteGoal;
    if (!id) return;

    data.goals = data.goals.filter(goal => goal.id !== id);

    if (saveData()) renderAll();
});

// Save a journal entry.
$("#journalForm").addEventListener("submit", event => {
    event.preventDefault();

    const title = $("#journalTitle").value.trim();
    const content = $("#journalContent").value.trim();

    if (!title || !content) return;

    data.journal.push({
        id: createId(),
        title,
        content,
        createdAt: new Date().toISOString()
    });

    recordStudyToday();

    if (saveData()) {
        $("#journalForm").reset();
        renderAll();
    }
});

// Delete journal entries.
$("#journalList").addEventListener("click", event => {
    const id = event.target.dataset.deleteJournal;
    if (!id) return;

    data.journal = data.journal.filter(entry => entry.id !== id);

    if (saveData()) renderAll();
});

// Toggle between dark and light themes.
function applyTheme() {
    const isLight = data.theme === "light";

    document.body.classList.toggle("light-theme", isLight);
    $("#themeToggle").textContent = isLight ? "🌙" : "☀️";
}

$("#themeToggle").addEventListener("click", () => {
    data.theme = data.theme === "light" ? "dark" : "light";

    if (saveData()) applyTheme();
});

// Highlight the selected navigation section.
document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");
    });
});

// Initialize the dashboard.
$("#year").textContent = new Date().getFullYear();
applyTheme();
renderAll();
