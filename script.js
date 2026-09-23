/* =====================================================
   ДАННЫЕ
===================================================== */

let app = JSON.parse(
    localStorage.getItem("routineApp")
) || {

    days: {},

    goals: [],

    matrix: {
        1: [],
        2: [],
        3: [],
        4: []
    },

    notes: {},

    settings: {
        dark: false
    }
};


let selectedDate =
    getDateString(new Date());


let timerInterval = null;

let notificationTimer = null;


/* =====================================================
   DOM
===================================================== */

const $ = id =>
    document.getElementById(id);


const datePicker =
    $("datePicker");

const timeline =
    $("timeline");

const taskModal =
    $("taskModal");

const taskForm =
    $("taskForm");


/* =====================================================
   СОХРАНЕНИЕ
===================================================== */

function save() {

    localStorage.setItem(
        "routineApp",
        JSON.stringify(app)
    );
}


/* =====================================================
   ДАТЫ
===================================================== */

function getDateString(date) {

    return date
        .toISOString()
        .split("T")[0];

}


function getDateObject(dateString) {

    return new Date(
        dateString + "T00:00:00"
    );

}


function getTasks(date = selectedDate) {

    if (!app.days[date]) {

        app.days[date] = [];

    }

    return app.days[date];

}


/* =====================================================
   ФОРМАТИРОВАНИЕ
===================================================== */

function minutesFromTime(time) {

    const [hours, minutes] =
        time.split(":").map(Number);

    return hours * 60 + minutes;

}


function timeFromMinutes(total) {

    total =
        Math.max(
            0,
            Math.min(
                1439,
                total
            )
        );

    const h =
        Math.floor(total / 60);

    const m =
        total % 60;

    return (
        String(h).padStart(2, "0")
        + ":"
        +
        String(m).padStart(2, "0")
    );

}


function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value || "";

    return div.innerHTML;

}


/* =====================================================
   ДЕНЬ
===================================================== */

function loadDay() {

    datePicker.value =
        selectedDate;

    updateDateText();

    renderTasks();

    updateStats();

    renderNotes();

    updateCurrentTime();

}


/* =====================================================
   ТЕКСТ ДАТЫ
===================================================== */

function updateDateText() {

    const date =
        getDateObject(
            selectedDate
        );

    $("currentDateText")
        .textContent =
        date.toLocaleDateString(
            "ru-RU",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );

}


/* =====================================================
   ПЕРЕКЛЮЧЕНИЕ ДНЕЙ
===================================================== */

function changeDay(amount) {

    const date =
        getDateObject(
            selectedDate
        );

    date.setDate(
        date.getDate() + amount
    );

    selectedDate =
        getDateString(date);

    loadDay();

}


/* =====================================================
   РЕНДЕР ЗАДАЧ
===================================================== */

function renderTasks() {

    timeline.innerHTML = "";

    let tasks =
        [...getTasks()];

    const search =
        $("searchInput")
            .value
            .toLowerCase();

    const category =
        $("categoryFilter")
            .value;


    tasks =
        tasks.filter(task => {

            const text =
                (
                    task.title +
                    " " +
                    task.description +
                    " " +
                    task.tags.join(" ")
                )
                .toLowerCase();


            return (

                text.includes(search)

                &&

                (
                    category === "all"
                    ||
                    task.category === category
                )

            );

        });


    tasks.sort(
        (a, b) =>
            a.start.localeCompare(
                b.start
            )
    );


    tasks.forEach(
        task =>
            timeline.appendChild(
                createTask(task)
            )
    );


    drawCurrentTimeLine();

}


/* =====================================================
   СОЗДАНИЕ КАРТОЧКИ
===================================================== */

function createTask(task) {

    const element =
        document.createElement("div");

    element.className =
        `task ${task.category}`;


    if (task.completed) {

        element.classList.add(
            "completed"
        );

    }


    const start =
        minutesFromTime(
            task.start
        );

    const end =
        minutesFromTime(
            task.end
        );


    element.style.top =
        `${start / 60 * 70}px`;


    element.style.height =
        `${Math.max(
            45,
            (end - start) / 60 * 70
        )}px`;


    if (
        isCurrentTask(task)
        &&
        !task.completed
    ) {

        element.classList.add(
            "current"
        );

        startTimer(task);

    }


    const tags =
        task.tags
            .map(
                tag =>
                `<span class="tag">
                    #${escapeHTML(tag)}
                </span>`
            )
            .join("");


    element.innerHTML = `

        <div class="task-title">

            ${task.completed ? "✓ " : ""}

            ${escapeHTML(task.title)}

        </div>

        <div class="task-time">

            ${task.start}
            —
            ${task.end}

        </div>

        ${
            task.description
            ?
            `<div class="task-description">
                ${escapeHTML(task.description)}
            </div>`
            :
            ""
        }

        ${
            tags
            ?
            `<div class="task-tags">
                ${tags}
            </div>`
            :
            ""
        }

        <div style="margin-top:7px">

            ${
                task.completed
                ?
                `<button
                    class="small-button"
                    data-action="uncomplete">
                    ↩ Вернуть
                </button>`
                :
                `<button
                    class="small-button"
                    data-action="complete">
                    ✓ Выполнено
                </button>`
            }

            <button
                class="small-button"
                data-action="edit">
                ✏️
            </button>

            <button
                class="small-button"
                data-action="delete">
                🗑
            </button>

        </div>
    `;


    element
        .querySelector(
            '[data-action="complete"]'
        )
        ?.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                completeTask(
                    task.id
                );

            }
        );


    element
        .querySelector(
            '[data-action="uncomplete"]'
        )
        ?.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                completeTask(
                    task.id
                );

            }
        );


    element
        .querySelector(
            '[data-action="edit"]'
        )
        ?.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                editTask(
                    task.id
                );

            }
        );


    element
        .querySelector(
            '[data-action="delete"]'
        )
        ?.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                deleteSingleTask(
                    task.id
                );

            }
        );


    element.addEventListener(
        "dblclick",
        () =>
            editTask(task.id)
    );


    return element;

}


/* =====================================================
   ВЫПОЛНЕНИЕ
===================================================== */

function completeTask(id) {

    const task =
        getTasks().find(
            task =>
                task.id === id
        );

    if (!task) return;


    task.completed =
        !task.completed;


    save();

    renderTasks();

    updateStats();

}


/* =====================================================
   ТЕКУЩАЯ ЗАДАЧА
===================================================== */

function isCurrentTask(task) {

    if (
        selectedDate !==
        getDateString(new Date())
    ) {

        return false;

    }


    const now =
        new Date();


    const current =
        now.getHours() * 60 +
        now.getMinutes();


    return (
        current >=
        minutesFromTime(task.start)
        &&
        current <
        minutesFromTime(task.end)
    );

}


/* =====================================================
   ЛИНИЯ ВРЕМЕНИ
===================================================== */

function drawCurrentTimeLine() {

    document
        .querySelector(
            ".current-time-line"
        )
        ?.remove();


    if (
        selectedDate !==
        getDateString(new Date())
    ) {

        return;

    }


    const now =
        new Date();


    const minutes =
        now.getHours() * 60 +
        now.getMinutes() +
        now.getSeconds() / 60;


    const line =
        document.createElement(
            "div"
        );


    line.className =
        "current-time-line";


    line.style.top =
        `${minutes / 60 * 70}px`;


    timeline.appendChild(line);

}


/* =====================================================
   ОБНОВЛЕНИЕ ТЕКУЩЕГО ВРЕМЕНИ
===================================================== */

function updateCurrentTime() {

    drawCurrentTimeLine();

    renderTasks();

}


/* =====================================================
   ТАЙМЕР ОСТАВШЕГОСЯ ВРЕМЕНИ
===================================================== */

function startTimer(task) {

    clearInterval(
        timerInterval
    );


    if (
        !isCurrentTask(task)
    ) {

        $("timerBox")
            .classList.add(
                "hidden"
            );

        return;

    }


    $("timerBox")
        .classList.remove(
            "hidden"
        );


    $("timerTaskName")
        .textContent =
        task.title;


    function update() {

        const now =
            new Date();


        const end =
            new Date();


        const [h, m] =
            task.end
                .split(":")
                .map(Number);


        end.setHours(
            h,
            m,
            0,
            0
        );


        let seconds =
            Math.max(
                0,
                Math.floor(
                    (end - now) / 1000
                )
            );


        const hours =
            Math.floor(
                seconds / 3600
            );


        seconds %= 3600;


        const minutes =
            Math.floor(
                seconds / 60
            );


        seconds %= 60;


        $("timerValue")
            .textContent =

            `${String(hours).padStart(2,"0")}:` +

            `${String(minutes).padStart(2,"0")}:` +

            `${String(seconds).padStart(2,"0")}`;


        if (
            seconds === 0 &&
            minutes === 0 &&
            hours === 0
        ) {

            clearInterval(
                timerInterval
            );

            loadDay();

        }

    }


    update();


    timerInterval =
        setInterval(
            update,
            1000
        );

}


/* =====================================================
   ДОБАВЛЕНИЕ
===================================================== */

function openAddTask() {

    taskForm.reset();

    $("taskId").value = "";

    $("modalTitle")
        .textContent =
        "Новое дело";


    $("deleteTaskButton")
        .classList.add(
            "hidden"
        );


    $("deleteSeriesButton")
        .classList.add(
            "hidden"
        );


    taskModal
        .classList.remove(
            "hidden"
        );

}


/* =====================================================
   РЕДАКТИРОВАНИЕ
===================================================== */

function editTask(id) {

    const task =
        getTasks().find(
            task =>
                task.id === id
        );

    if (!task) return;


    $("taskId").value =
        task.id;

    $("taskTitle").value =
        task.title;

    $("startTime").value =
        task.start;

    $("endTime").value =
        task.end;

    $("taskCategory").value =
        task.category;

    $("taskPriority").value =
        task.priority || "normal";

    $("taskDescription").value =
        task.description || "";

    $("taskTags").value =
        task.tags.join(", ");

    $("repeatType").value =
        task.repeat || "none";

    $("reminderMinutes").value =
        task.reminderMinutes || "0";

    $("taskReminder").checked =
        task.reminder || false;


    $("modalTitle")
        .textContent =
        "Редактировать дело";


    $("deleteTaskButton")
        .classList.remove(
            "hidden"
        );


    if (task.seriesId) {

        $("deleteSeriesButton")
            .classList.remove(
                "hidden"
            );

    } else {

        $("deleteSeriesButton")
            .classList.add(
                "hidden"
            );

    }


    taskModal
        .classList.remove(
            "hidden"
        );

}


/* =====================================================
   СОХРАНЕНИЕ ЗАДАЧИ
===================================================== */

taskForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const title =
            $("taskTitle")
                .value
                .trim();

        const start =
            $("startTime")
                .value;

        const end =
            $("endTime")
                .value;


        if (
            minutesFromTime(end)
            <=
            minutesFromTime(start)
        ) {

            alert(
                "Время окончания должно быть позже начала."
            );

            return;

        }


        const tags =
            $("taskTags")
                .value
                .split(",")
                .map(
                    tag =>
                        tag.trim()
                )
                .filter(Boolean);


        const id =
            $("taskId").value;


        if (id) {

            const task =
                getTasks().find(
                    task =>
                        task.id ===
                        Number(id)
                );


            if (task) {

                task.title =
                    title;

                task.start =
                    start;

                task.end =
                    end;

                task.category =
                    $("taskCategory")
                        .value;

                task.priority =
                    $("taskPriority")
                        .value;

                task.description =
                    $("taskDescription")
                        .value;

                task.tags =
                    tags;

                task.repeat =
                    $("repeatType")
                        .value;

                task.reminderMinutes =
                    Number(
                        $("reminderMinutes")
                            .value
                    );

                task.reminder =
                    $("taskReminder")
                        .checked;

            }


        } else {

            const seriesId =
                crypto.randomUUID();


            const task = {

                id:
                    Date.now(),

                seriesId,

                title,

                start,

                end,

                category:
                    $("taskCategory")
                        .value,

                priority:
                    $("taskPriority")
                        .value,

                description:
                    $("taskDescription")
                        .value,

                tags,

                repeat:
                    $("repeatType")
                        .value,

                reminderMinutes:
                    Number(
                        $("reminderMinutes")
                            .value
                    ),

                reminder:
                    $("taskReminder")
                        .checked,

                completed:
                    false

            };


            getTasks()
                .push(task);


            createRepeatingTasks(
                task
            );

        }


        save();

        closeWindow(
            "taskModal"
        );

        loadDay();

    }
);


/* =====================================================
   ПОВТОРЕНИЯ
===================================================== */

function createRepeatingTasks(task) {

    if (
        task.repeat ===
        "none"
    ) {

        return;

    }


    const base =
        getDateObject(
            selectedDate
        );


    for (
        let i = 1;
        i <= 365;
        i++
    ) {

        const date =
            new Date(base);


        date.setDate(
            date.getDate() + i
        );


        const day =
            date.getDay();


        if (
            task.repeat ===
            "weekdays"
            &&
            (
                day === 0 ||
                day === 6
            )
        ) {

            continue;

        }


        if (
            task.repeat ===
            "weekly"
            &&
            i % 7 !== 0
        ) {

            continue;

        }


        const dateString =
            getDateString(date);


        if (
            !app.days[dateString]
        ) {

            app.days[dateString] =
                [];

        }


        app.days[dateString]
            .push({

                ...task,

                id:
                    Date.now()
                    +
                    Math.random(),

                completed:
                    false

            });

    }

}


/* =====================================================
   УДАЛЕНИЕ ОДНОЙ ЗАДАЧИ
===================================================== */

function deleteSingleTask(id) {

    if (
        !confirm(
            "Удалить это дело?"
        )
    ) {

        return;

    }


    app.days[selectedDate] =
        getTasks().filter(
            task =>
                task.id !== id
        );


    save();

    loadDay();

}


/* =====================================================
   УДАЛЕНИЕ ВСЕЙ СЕРИИ
===================================================== */

$("deleteSeriesButton")
    .addEventListener(
        "click",
        () => {

            const id =
                Number(
                    $("taskId").value
                );


            const task =
                getTasks().find(
                    task =>
                        task.id === id
                );


            if (!task?.seriesId) {

                return;

            }


            if (
                !confirm(
                    "Удалить все повторения этой задачи?"
                )
            ) {

                return;

            }


            const seriesId =
                task.seriesId;


            Object.keys(
                app.days
            ).forEach(
                date => {

                    app.days[date] =
                        app.days[date]
                            .filter(
                                task =>
                                    task.seriesId
                                    !==
                                    seriesId
                            );

                }
            );


            save();

            closeWindow(
                "taskModal"
            );

            loadDay();

        }
    );


/* =====================================================
   УДАЛЕНИЕ ТЕКУЩЕЙ
===================================================== */

$("deleteTaskButton")
    .addEventListener(
        "click",
        () => {

            deleteSingleTask(
                Number(
                    $("taskId").value
                )
            );


            closeWindow(
                "taskModal"
            );

        }
    );


/* =====================================================
   СТАТИСТИКА ДНЯ
===================================================== */

function updateStats() {

    const tasks =
        getTasks();


    const completed =
        tasks.filter(
            task =>
                task.completed
        ).length;


    const total =
        tasks.length;


    const percent =
        total === 0
        ?
        0
        :
        Math.round(
            completed /
            total *
            100
        );


    $("totalTasks")
        .textContent =
        total;


    $("completedTasks")
        .textContent =
        completed;


    $("progressText")
        .textContent =
        `${percent}%`;


    $("progressBar")
        .style.width =
        `${percent}%`;


    $("streakText")
        .textContent =
        `${calculateStreak()} 🔥`;

}


/* =====================================================
   СЕРИЯ ДНЕЙ
===================================================== */

function calculateStreak() {

    let date =
        new Date();


    let streak =
        0;


    while (true) {

        const dateString =
            getDateString(date);


        const tasks =
            app.days[dateString] ||
            [];


        if (
            tasks.length === 0
        ) {

            break;

        }


        const completed =
            tasks.length > 0
            &&
            tasks.every(
                task =>
                    task.completed
            );


        if (!completed) {

            break;

        }


        streak++;

        date.setDate(
            date.getDate() - 1
        );

    }


    return streak;

}


/* =====================================================
   НЕДЕЛЯ
===================================================== */

function renderWeek() {

    const container =
        $("weekDays");


    container.innerHTML =
        "";


    const current =
        getDateObject(
            selectedDate
        );


    const day =
        current.getDay();


    const mondayOffset =
        day === 0
        ? -6
        : 1 - day;


    const monday =
        new Date(current);


    monday.setDate(
        current.getDate()
        +
        mondayOffset
    );


    for (
        let i = 0;
        i < 7;
        i++
    ) {

        const date =
            new Date(monday);


        date.setDate(
            monday.getDate() + i
        );


        const dateString =
            getDateString(date);


        const dayElement =
            document.createElement(
                "div"
            );


        dayElement.className =
            "week-day";


        if (
            dateString ===
            getDateString(new Date())
        ) {

            dayElement.classList.add(
                "today"
            );

        }


        const tasks =
            app.days[dateString] ||
            [];


        dayElement.innerHTML = `

            <strong>
                ${date.toLocaleDateString(
                    "ru-RU",
                    {
                        weekday:
                            "short"
                    }
                )}
            </strong>

            <br>

            ${date.getDate()}
            ${date.toLocaleDateString(
                "ru-RU",
                {
                    month: "short"
                }
            )}

        `;


        tasks.forEach(
            task => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "week-task";


                item.style.background =
                    categoryColor(
                        task.category
                    );


                item.textContent =
                    `${task.start} ${task.title}`;


                dayElement.appendChild(
                    item
                );

            }
        );


        dayElement.addEventListener(
            "click",
            () => {

                selectedDate =
                    dateString;

                $("weekView")
                    .classList.add(
                        "hidden"
                    );

                loadDay();

            }
        );


        container.appendChild(
            dayElement
        );

    }

}


function categoryColor(category) {

    const colors = {

        study: "#4f46e5",

        work: "#2563eb",

        sport: "#16a34a",

        rest: "#9333ea",

        other: "#ea580c"

    };


    return (
        colors[category]
        ||
        colors.other
    );

}


/* =====================================================
   ЦЕЛИ
===================================================== */

$("goalsButton")
    .addEventListener(
        "click",
        () => {

            renderGoals();

            $("goalsModal")
                .classList.remove(
                    "hidden"
                );

        }
    );


$("goalForm")
    .addEventListener(
        "submit",
        event => {

            event.preventDefault();


            app.goals.push({

                id:
                    Date.now(),

                title:
                    $("goalTitle")
                        .value,

                target:
                    Number(
                        $("goalTarget")
                            .value
                    ),

                progress:
                    0

            });


            $("goalForm")
                .reset();


            save();

            renderGoals();

        }
    );


function renderGoals() {

    const list =
        $("goalsList");


    list.innerHTML =
        "";


    app.goals.forEach(
        goal => {

            const percent =
                Math.min(
                    100,
                    Math.round(
                        goal.progress /
                        goal.target *
                        100
                    )
                );


            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "goal";


            element.innerHTML = `

                <strong>
                    ${escapeHTML(
                        goal.title
                    )}
                </strong>

                <p>
                    ${goal.progress}
                    /
                    ${goal.target}
                </p>

                <div class="goal-progress">

                    <div
                        style="width:${percent}%"
                    ></div>

                </div>

                <button
                    onclick="changeGoal(${goal.id}, 1)"
                >
                    +1
                </button>

                <button
                    class="danger"
                    onclick="deleteGoal(${goal.id})"
                >
                    🗑
                </button>

            `;


            list.appendChild(
                element
            );

        }
    );

}


function changeGoal(id, amount) {

    const goal =
        app.goals.find(
            goal =>
                goal.id === id
        );


    if (!goal) return;


    goal.progress =
        Math.max(
            0,
            Math.min(
                goal.target,
                goal.progress +
                amount
            )
        );


    save();

    renderGoals();

}


function deleteGoal(id) {

    app.goals =
        app.goals.filter(
            goal =>
                goal.id !== id
        );


    save();

    renderGoals();

}


/* =====================================================
   МАТРИЦА ЭЙЗЕНХАУЭРА
===================================================== */

$("eisenhowerButton")
    .addEventListener(
        "click",
        () => {

            renderMatrix();

            $("eisenhowerModal")
                .classList.remove(
                    "hidden"
                );

        }
    );


function renderMatrix() {

    for (
        let i = 1;
        i <= 4;
        i++
    ) {

        const container =
            $(`matrix${i}`);


        container.innerHTML =
            "";


        app.matrix[i]
            .forEach(
                (item, index) => {

                    const div =
                        document.createElement(
                            "div"
                        );


                    div.className =
                        "matrix-item";


                    div.innerHTML = `

                        ${escapeHTML(
                            item
                        )}

                        <button
                            onclick="deleteMatrixTask(${i},${index})"
                            style="float:right"
                        >
                            ×
                        </button>

                    `;


                    container.appendChild(
                        div
                    );

                }
            );

    }

}


function addMatrixTask(number) {

    const text =
        prompt(
            "Введите задачу:"
        );


    if (!text) return;


    app.matrix[number]
        .push(text);


    save();

    renderMatrix();

}


function deleteMatrixTask(
    number,
    index
) {

    app.matrix[number]
        .splice(index, 1);


    save();

    renderMatrix();

}


/* =====================================================
   ЗАМЕТКИ
===================================================== */

$("notesButton")
    .addEventListener(
        "click",
        () => {

            renderNotes();

            $("notesModal")
                .classList.remove(
                    "hidden"
                );

        }
    );


function renderNotes() {

    $("notesText")
        .value =
        app.notes[selectedDate]
        ||
        "";

}


$("saveNotesButton")
    .addEventListener(
        "click",
        () => {

            app.notes[selectedDate] =
                $("notesText")
                    .value;


            save();


            alert(
                "Заметки сохранены."
            );

        }
    );


/* =====================================================
   СТАТИСТИКА МЕСЯЦА
===================================================== */

$("monthStatsButton")
    .addEventListener(
        "click",
        () => {

            renderMonthStats();

            $("monthStatsModal")
                .classList.remove(
                    "hidden"
                );

        }
    );


function renderMonthStats() {

    const date =
        getDateObject(
            selectedDate
        );


    const year =
        date.getFullYear();

    const month =
        date.getMonth();


    let total = 0;

    let completed = 0;

    let daysWithTasks = 0;

    let perfectDays = 0;


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const d =
            new Date(
                year,
                month,
                day
            );


        const dateString =
            getDateString(d);


        const tasks =
            app.days[dateString] ||
            [];


        if (
            tasks.length
        ) {

            daysWithTasks++;

            total +=
                tasks.length;

            completed +=
                tasks.filter(
                    task =>
                        task.completed
                ).length;


            if (
                tasks.every(
                    task =>
                        task.completed
                )
            ) {

                perfectDays++;

            }

        }

    }


    const percent =
        total
        ?
        Math.round(
            completed /
            total *
            100
        )
        :
        0;


    $("monthStats")
        .innerHTML = `

            <h3>
                ${date.toLocaleDateString(
                    "ru-RU",
                    {
                        month:
                            "long",
                        year:
                            "numeric"
                    }
                )}
            </h3>

            <p>
                📋 Всего задач:
                <strong>${total}</strong>
            </p>

            <p>
                ✅ Выполнено:
                <strong>${completed}</strong>
            </p>

            <p>
                📈 Процент:
                <strong>${percent}%</strong>
            </p>

            <p>
                📅 Дней с задачами:
                <strong>${daysWithTasks}</strong>
            </p>

            <p>
                🏆 Полностью выполненных дней:
                <strong>${perfectDays}</strong>
            </p>

        `;

}


/* =====================================================
   КОПИРОВАНИЕ ДНЯ
===================================================== */

$("copyDayButton")
    .addEventListener(
        "click",
        () => {

            const target =
                prompt(
                    "Дата назначения (ГГГГ-ММ-ДД):"
                );


            if (!target) return;


            app.days[target] =
                getTasks()
                    .map(
                        task => ({

                            ...task,

                            id:
                                Date.now()
                                +
                                Math.random(),

                            completed:
                                false

                        })
                    );


            save();


            alert(
                "День скопирован."
            );

        }
    );


/* =====================================================
   ПОИСК
===================================================== */

$("searchInput")
    .addEventListener(
        "input",
        renderTasks
    );


$("categoryFilter")
    .addEventListener(
        "change",
        renderTasks
    );


/* =====================================================
   КНОПКИ ДАТЫ
===================================================== */

$("previousDay")
    .addEventListener(
        "click",
        () =>
            changeDay(-1)
    );


$("nextDay")
    .addEventListener(
        "click",
        () =>
            changeDay(1)
    );


$("todayButton")
    .addEventListener(
        "click",
        () => {

            selectedDate =
                getDateString(
                    new Date()
                );

            loadDay();

        }
    );


datePicker
    .addEventListener(
        "change",
        () => {

            selectedDate =
                datePicker.value;

            loadDay();

        }
    );


/* =====================================================
   НЕДЕЛЬНЫЙ ВИД
===================================================== */

$("weekViewButton")
    .addEventListener(
        "click",
        () => {

            $("weekView")
                .classList.toggle(
                    "hidden"
                );

            renderWeek();

        }
    );


/* =====================================================
   ДОБАВИТЬ
===================================================== */

$("addTaskButton")
    .addEventListener(
        "click",
        openAddTask
    );


/* =====================================================
   ЗАКРЫТИЕ
===================================================== */

$("closeModal")
    .addEventListener(
        "click",
        () =>
            closeWindow(
                "taskModal"
            )
    );


function closeWindow(id) {

    $(id)
        .classList.add(
            "hidden"
        );

}


/* =====================================================
   ТЁМНАЯ ТЕМА
===================================================== */

$("themeButton")
    .addEventListener(
        "click",
        () => {

            document.body
                .classList.toggle(
                    "dark"
                );


            app.settings.dark =
                document.body
                    .classList.contains(
                        "dark"
                    );


            save();

        }
    );


if (
    app.settings.dark
) {

    document.body
        .classList.add(
            "dark"
        );

}


/* =====================================================
   УВЕДОМЛЕНИЯ
===================================================== */

$("notificationButton")
    .addEventListener(
        "click",
        async () => {

            if (
                !("Notification" in window)
            ) {

                alert(
                    "Ваш браузер не поддерживает уведомления."
                );

                return;

            }


            const permission =
                await Notification
                    .requestPermission();


            if (
                permission ===
                "granted"
            ) {

                new Notification(
                    "Распорядок",
                    {
                        body:
                            "Уведомления включены!"
                    }
                );

            }

        }
    );


/* =====================================================
   ПРОВЕРКА НАПОМИНАНИЙ
===================================================== */

function checkReminders() {

    if (
        selectedDate !==
        getDateString(new Date())
    ) {

        return;

    }


    if (
        Notification.permission !==
        "granted"
    ) {

        return;

    }


    const now =
        new Date();


    const current =
        now.getHours() * 60 +
        now.getMinutes();


    getTasks().forEach(
        task => {

            if (
                !task.reminder ||
                !task.reminderMinutes
            ) {

                return;

            }


            const start =
                minutesFromTime(
                    task.start
                );


            const difference =
                start - current;


            if (
                difference ===
                Number(
                    task.reminderMinutes
                )
            ) {

                new Notification(
                    `Скоро: ${task.title}`,
                    {
                        body:
                            `Начало в ${task.start}`
                    }
                );

            }

        }
    );

}


notificationTimer =
    setInterval(
        checkReminders,
        60000
    );


/* =====================================================
   ЭКСПОРТ
===================================================== */

$("exportButton")
    .addEventListener(
        "click",
        () => {

            const blob =
                new Blob(
                    [
                        JSON.stringify(
                            app,
                            null,
                            2
                        )
                    ],
                    {
                        type:
                            "application/json"
                    }
                );


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement(
                    "a"
                );


            link.href =
                url;

            link.download =
                "my-routine-backup.json";


            link.click();


            URL.revokeObjectURL(
                url
            );

        }
    );


/* =====================================================
   ИМПОРТ
===================================================== */

$("importButton")
    .addEventListener(
        "click",
        () =>
            $("importFile").click()
    );


$("importFile")
    .addEventListener(
        "change",
        event => {

            const file =
                event.target.files[0];


            if (!file) return;


            const reader =
                new FileReader();


            reader.onload =
                () => {

                    try {

                        app =
                            JSON.parse(
                                reader.result
                            );


                        save();

                        loadDay();


                        alert(
                            "Резервная копия восстановлена."
                        );

                    }

                    catch {

                        alert(
                            "Не удалось прочитать файл."
                        );

                    }

                };


            reader.readAsText(
                file
            );

        }
    );


/* =====================================================
   ОЧИСТКА ДНЯ
===================================================== */

$("clearDayButton")
    .addEventListener(
        "click",
        () => {

            if (
                !confirm(
                    "Удалить все задачи этого дня?"
                )
            ) {

                return;

            }


            app.days[selectedDate] =
                [];


            save();

            loadDay();

        }
    );


/* =====================================================
   ОСТАНОВКА ТАЙМЕРА
===================================================== */

$("stopTimer")
    .addEventListener(
        "click",
        () => {

            clearInterval(
                timerInterval
            );


            $("timerBox")
                .classList.add(
                    "hidden"
                );

        }
    );


/* =====================================================
   ПЕРИОДИЧЕСКОЕ ОБНОВЛЕНИЕ
===================================================== */

setInterval(
    () => {

        if (
            selectedDate ===
            getDateString(new Date())
        ) {

            drawCurrentTimeLine();

            renderTasks();

            updateStats();

        }

    },
    30000
);


/* =====================================================
   ЗАПУСК
===================================================== */

loadDay();