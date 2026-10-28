// BLOCO 01

let {
    pages,
    inbox,
    select,
    taskOrder,
    taskFiles,
    globalTaskFilter,
    dailyNoteFolder,
    dailyNoteFormat,
    done,
    sort,
    css,
    forward,
    dateFormat,
    options
} = input;

// Error Handling
if (!pages && pages != "") {
    dv.span(
        '> [!ERROR] Missing pages parameter\n> \n' +
        '> Please set the pages parameter like\n> \n' +
        '> `pages: ""`'
    );
    return false;
}

// Get, Set, Eval Pages
if (pages == "") {
    var tasks = dv.pages().file.tasks;
} else {
    if (pages.startsWith("dv.pages")) {
        var tasks = eval(pages);
    } else {
        var tasks = dv.pages(pages).file.tasks;
    }
}

if (!taskFiles) {
    taskFiles = [
        ...new Set(
            dv.pages().file
                .map(f => f.tasks.filter(t => !t.completed))
                .path
        )
    ].sort();
} else {
    taskFiles = [...new Set(dv.pagePaths(taskFiles))].sort();
}

if (!options) {
    options = "";
}

if (!dailyNoteFolder) {
    dailyNoteFolder = "Torre de Vigilância/Star Fortress/Arquivo Dos Desejos/";
} else {
    dailyNoteFolder = dailyNoteFolder.replace(/\/+$/, "") + "/";
}

if (!dailyNoteFormat) {
    dailyNoteFormat = "DD [de] MMMM [de] YYYY";
}

// Validação do formato.
// Os colchetes são permitidos porque o Moment os usa para texto literal.
if (
    dailyNoteFormat !== "DD [de] MMMM [de] YYYY" &&
    dailyNoteFormat.match(/[|\\YMDWwd.,\-:\[\]]/g)?.length
        !== dailyNoteFormat.length
) {
    dv.span(
        '> [!ERROR] The `dailyNoteFormat` contains invalid characters'
    );
    return false;
}

if (!taskOrder) {
    taskOrder = [
        "overdue",
        "due",
        "scheduled",
        "start",
        "process",
        "unplanned",
        "done",
        "cancelled"
    ];
}

if (!sort) {
    sort = "t=>t.order";
}

if (!dateFormat) {
    dateFormat = "ddd, MMM D";
}

if (!select) {
    select = "dailyNote";
}

// FIM DO BLOCO 01

// BLOCO 02 - INTERPRETAÇÃO EM PORTUGUÊS


const dailyNoteTemplatePath = "Templates/arquivoDosDesejos/diaria.md";

const portugueseMonths = [
    "janeiro", "fevereiro", "março", "abril",
    "maio", "junho", "julho", "agosto",
    "setembro", "outubro", "novembro", "dezembro"
];

const portugueseDailyFormat = "DD [de] MMMM [de] YYYY";

const usesPortugueseDailyFormat =
    dailyNoteFormat === portugueseDailyFormat;

function getDailyNotePath(date) {
    const year = date.format("YYYY");
    const month = portugueseMonths[date.month()];
    const title =
        date.format("DD [de] ") +
        month +
        date.format(" [de] YYYY");

    return dailyNoteFolder + year + "/" + month + "/" +
        title + ".md";
}

// Ícones do ITS - funções auxiliares




function getTaskStatusIcon(task) {
    const status = getTaskStatus(task);
    const completed = status === "x" || status === "X";

    const wrapper = document.createElement("li");
wrapper.className = "task-list-item";
    wrapper.dataset.task = status;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-list-item-checkbox";
    checkbox.dataset.task = status;
    checkbox.disabled = true;
    checkbox.checked = completed;
    checkbox.setAttribute(
        "aria-label",
        completed ? "Tarefa concluída" : "Tarefa pendente"
    );

    wrapper.appendChild(checkbox);

    return wrapper.outerHTML;
};


function isDoneTask(task) {
    const status = getTaskStatus(task);
    return status === "x" || status === "X";
}

function isCancelledTask(task) {
    return getTaskStatus(task) === "-";
}


function getTaskStatusIcon(task) {
    const status = getTaskStatus(task);
    const visuallyChecked = status !== " ";

    return `
        <span class="task-status-icon" data-status="${status}">
            <span class="task-list-item${visuallyChecked ? " is-checked" : ""}"
                  data-task="${status}">
                <input type="checkbox"
                       class="task-list-item-checkbox"
                       ${visuallyChecked ? "checked" : ""}
                       disabled
                       aria-label="Status ${status}">
            </span>
        </span>
    `;
}




function parseDailyNoteDate(dateText) {
    const match = String(dateText).match(
        /^(\d{1,2}) de (janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (\d{4})$/i
    );

    if (!match) return moment.invalid();

    const monthIndex = portugueseMonths.indexOf(
        match[2].toLocaleLowerCase("pt-BR")
    );

    if (monthIndex < 0) return moment.invalid();

    return moment([
        Number(match[3]),
        monthIndex,
        Number(match[1])
    ]);
}

async function ensureVaultFolder(folderPath) {
    const parts = folderPath.split("/").filter(Boolean);
    let current = "";

    for (const part of parts) {
        current = current ? current + "/" + part : part;

        if (!app.vault.getAbstractFileByPath(current)) {
            try {
                await app.vault.createFolder(current);
            } catch (error) {
                if (!app.vault.getAbstractFileByPath(current)) {
                    throw error;
                }
            }
        }
    }
}

async function createDailyNoteFromTemplate(date) {
    const templateFile =
        app.vault.getAbstractFileByPath(dailyNoteTemplatePath);

    if (!templateFile) {
        throw new Error(
            "Template não encontrado: " + dailyNoteTemplatePath
        );
    }

    const templaterPlugin =
        app.plugins.plugins["templater-obsidian"];

    if (
        !templaterPlugin ||
        !templaterPlugin.templater ||
        typeof templaterPlugin.templater
            .create_new_note_from_template !== "function"
    ) {
        throw new Error(
            "Templater indisponível ou API incompatível."
        );
    }

    const targetPath = getDailyNotePath(date);
    const targetFolder = targetPath.substring(
        0, targetPath.lastIndexOf("/")
    );
    const targetTitle = targetPath.substring(
        targetPath.lastIndexOf("/") + 1
    ).replace(/\.md$/i, "");

    await ensureVaultFolder(targetFolder);

    const existing = app.vault.getAbstractFileByPath(targetPath);
    if (existing) return existing;

    const created = await templaterPlugin.templater
        .create_new_note_from_template(
            templateFile,
            targetFolder,
            targetTitle,
            true
        );

   
const resolved = app.vault.getAbstractFileByPath(targetPath);
const createdFile = resolved ?? (
    created?.path
        ? app.vault.getAbstractFileByPath(created.path)
        : null
);

if (!createdFile) {
    throw new Error(
        "Não foi possível confirmar a criação de " + targetPath
    );
}

// Garantia adicional: remove a tag "template" do frontmatter.
await app.fileManager.processFrontMatter(
    createdFile,
    (frontmatter) => {
        const tags = frontmatter.tags ?? [];

        frontmatter.tags = (
            Array.isArray(tags) ? tags : [tags]
        ).filter((tag) => {
            const normalizedTag = String(tag).replace(/^#/, "");
            return normalizedTag !== "template";
        });
    }
);

return createdFile;

};


// FIM DO BLOCO 02 - INTERPRETAÇÃO EM PORTUGUÊS

// Variables
var timelineDates = [];
var tid = (new Date()).getTime();
var today = moment().format("YYYY-MM-DD");
var dailyNoteRegEx = momentToRegex(dailyNoteFormat);

// Set Root
const rootNode = dv.el("div", "", {cls: "taskido "+options, attr: {id: "taskido"+tid}});
if (css) { var style = document.createElement("style"); style.innerHTML = css; rootNode.querySelector("span").append(style) };

// Icons
var doneIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M7.5 12.5L10.5 15.5L16 10"></path></svg>';
var dueIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
var scheduledIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"></path><path d="M5 2h14"></path><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path></svg>';
var startIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>';
var overdueIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
var processIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z"></path><path d="M12 13v9"></path><path d="M12 2v4"></path></svg>';
var dailynoteIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
var unplannedIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.18 4.18A2 2 0 0 0 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 1.82-1.18"></path><path d="M21 15.5V6a2 2 0 0 0-2-2H9.5"></path><path d="M16 2v4"></path><path d="M3 10h7"></path><path d="M21 10h-5.5"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>';
var taskIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>';
var addIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>';
var tagIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path><path d="M7 7h.01"></path></svg>';
var repeatIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"></path><path d="M3 11v-1a4 4 0 0 1 4-4h14"></path><path d="m7 22-4-4 4-4"></path><path d="M21 13v1a4 4 0 0 1-4 4H3"></path></svg>';
var priorityIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
var fileIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>';
var forwardIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 17 20 12 15 7"></polyline><path d="M4 18v-2a4 4 0 0 1 4-4h12"></path></svg>';
var alertIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
var cancelledIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

// Initialze
getMeta(tasks);
getTimeline(tasks);
getSelectOptions();
setEvents();



function getTaskStatus(task) {
    if (task.status !== undefined && task.status !== null) {
        return String(task.status);
    }

    // Compatibilidade com tarefas Dataview sem status exposto.
    if (task.completed === true) return "x";

    return " ";
}

function isDoneTask(task) {
    const status = getTaskStatus(task);
    return status === "x" || status === "X";
}

function isCancelledTask(task) {
    return getTaskStatus(task) === "-";
}

function getTaskStatusIcon(task) {
    const status = getTaskStatus(task);
    const completed = isDoneTask(task);

    return `<div class="task-list-item${completed ? " is-checked" : ""}" data-task="${status}"><input type="checkbox" class="task-list-item-checkbox" ${completed ? "checked" : ""} aria-label="${completed ? "Tarefa concluída" : "Tarefa pendente"}"></div>`;
}

function getMeta(tasks) {

    for (i = 0; i < tasks.length; i++) {
        let happens = {};
        var taskText = tasks[i].text;
        var taskFile = getFilename(tasks[i].path);
        var filePath = tasks[i].link.path;

        // Normalizar a conclusão: somente x/X são concluídos.
        var taskDone = isDoneTask(tasks[i]);
        var taskCancelled = isCancelledTask(tasks[i]);

        // Inbox
        if (
            inbox &&
            inbox == filePath &&
            !taskDone &&
            !taskCancelled &&
            !taskText.match(/[🛫|⏳|📅|✅] *(\d{4}-\d{2}-\d{2})/)
        ) {
            timelineDates.push(today);
            happens["unplanned"] = today;
            tasks[i].order = taskOrder.indexOf("unplanned");
        }

        // Daily Notes
        var dailyNoteMatch = taskFile.match(eval(dailyNoteRegEx));
        var dailyTaskMatch = taskText.match(/[🛫|⏳|📅|✅] *(\d{4}-\d{2}-\d{2})/);

        if (
            dailyNoteMatch &&
            !taskDone &&
            !taskCancelled
        ) {
            tasks[i].dailyNote = true;

            if (!dailyTaskMatch) {
                var dailyDate = parseDailyNoteDate(dailyNoteMatch[1])
                    .format("YYYY-MM-DD");

                if (dailyDate < today && forward == true) {
                    timelineDates.push(today);
                    happens["unplanned"] = today;
                    tasks[i].order = taskOrder.indexOf("unplanned");
                } else {
                    timelineDates.push(dailyDate);
                    happens["unplanned"] = dailyDate;
                    tasks[i].order = taskOrder.indexOf("unplanned");
                }
            }
        } else if (
            dailyNoteMatch &&
            taskCancelled &&
            parseDailyNoteDate(dailyNoteMatch[1]).format("YYYY-MM-DD") >= today
        ) {
            var cancelledDailyDate = parseDailyNoteDate(dailyNoteMatch[1])
                .format("YYYY-MM-DD");

            timelineDates.push(cancelledDailyDate);
            happens["cancelled"] = cancelledDailyDate;
            tasks[i].order = taskOrder.indexOf("cancelled");
            tasks[i].dailyNote = true;
        } else if (dailyNoteMatch) {
            tasks[i].dailyNote = true;
        } else {
            tasks[i].dailyNote = false;
        }

        // Dataview Tasks: inline fields
        while (inlineFields = /\[([^\]]+)\:\:([^\]]+)\]/g.exec(tasks[i].text)) {
            var inlineField = inlineFields[0];
            var fieldKey = inlineFields[1].toLowerCase();
            var fieldValue = inlineFields[2];

            if (
                fieldKey == "due" ||
                fieldKey == "scheduled" ||
                fieldKey == "start" ||
                fieldKey == "completion"
            ) {
                var fieldDate = moment(fieldValue).format("YYYY-MM-DD");

                if (!taskDone && !taskCancelled) {
                    if (fieldKey == "due" && fieldDate < today) {
                        if (forward == true) {
                            happens["overdue"] = fieldDate;
                            happens["overdueForward"] = today;
                            tasks[i].order = taskOrder.indexOf("overdue");
                        } else {
                            happens["overdue"] = fieldDate;
                            tasks[i].order = taskOrder.indexOf("overdue");
                            timelineDates.push(fieldDate);
                        }
                    } else if (fieldKey == "due" && fieldDate >= today) {
                        happens["due"] = fieldDate;
                        tasks[i].order = taskOrder.indexOf("due");
                        timelineDates.push(fieldDate);
                    }

                    if (fieldKey == "scheduled" && fieldDate < today) {
                        happens["scheduled"] = fieldDate;
                        happens["scheduledForward"] = today;
                        tasks[i].order = taskOrder.indexOf("scheduled");
                    } else if (fieldKey == "scheduled") {
                        happens["scheduled"] = fieldDate;
                        tasks[i].order = taskOrder.indexOf("scheduled");
                        timelineDates.push(fieldDate);
                    }

                    if (fieldKey == "start" && fieldDate < today) {
                        happens["start"] = fieldDate;
                        happens["startForward"] = today;
                        tasks[i].order = taskOrder.indexOf("start");
                    } else if (fieldKey == "start") {
                        happens["start"] = fieldDate;
                        tasks[i].order = taskOrder.indexOf("start");
                        timelineDates.push(fieldDate);
                    }
                } else if (taskDone && fieldKey == "completion") {
                    happens["done"] = fieldDate;
                    tasks[i].order = taskOrder.indexOf("done");
                } else if (taskCancelled && fieldDate >= today) {
                    happens["cancelled"] = fieldDate;
                    tasks[i].order = taskOrder.indexOf("cancelled");
                }
            }

            tasks[i].text = tasks[i].text.replace(inlineField, "");
        }

        // Tasks Plugin Tasks: due date
        var dueMatch = taskText.match(/📅 *(\d{4}-\d{2}-\d{2})/);

        if (dueMatch && !taskDone && !taskCancelled) {
            tasks[i].text = tasks[i].text.replace(dueMatch[0], "");

            if (dueMatch[1] < today) {
                if (forward == true) {
                    happens["overdue"] = dueMatch[1];
                    happens["overdueForward"] = today;
                    tasks[i].order = taskOrder.indexOf("overdue");
                } else {
                    happens["overdue"] = dueMatch[1];
                    tasks[i].order = taskOrder.indexOf("overdue");
                    timelineDates.push(dueMatch[1]);
                }
            } else {
                happens["due"] = dueMatch[1];
                tasks[i].order = taskOrder.indexOf("due");
                timelineDates.push(dueMatch[1]);
            }
        } else if (dueMatch && taskDone) {
            tasks[i].text = tasks[i].text.replace(dueMatch[0], "");
        } else if (dueMatch && taskCancelled && dueMatch[1] >= today) {
            tasks[i].text = tasks[i].text.replace(dueMatch[0], "");
            happens["cancelled"] = dueMatch[1];
            tasks[i].order = taskOrder.indexOf("cancelled");
            timelineDates.push(dueMatch[1]);
        }

        // Scheduled date
        var scheduledMatch = taskText.match(/⏳ *(\d{4}-\d{2}-\d{2})/);

        if (scheduledMatch && !taskDone && !taskCancelled) {
            tasks[i].text = tasks[i].text.replace(scheduledMatch[0], "");

            if (scheduledMatch[1] < today) {
                happens["scheduled"] = scheduledMatch[1];
                happens["scheduledForward"] = today;
                tasks[i].order = taskOrder.indexOf("scheduled");
            } else {
                happens["scheduled"] = scheduledMatch[1];
                tasks[i].order = taskOrder.indexOf("scheduled");
                timelineDates.push(scheduledMatch[1]);
            }
        } else if (scheduledMatch && taskDone) {
            tasks[i].text = tasks[i].text.replace(scheduledMatch[0], "");
        } else if (scheduledMatch && taskCancelled) {
            tasks[i].text = tasks[i].text.replace(scheduledMatch[0], "");
        }

        // Start date
        var startMatch = taskText.match(/🛫 *(\d{4}-\d{2}-\d{2})/);

        if (startMatch && !taskDone && !taskCancelled) {
            tasks[i].text = tasks[i].text.replace(startMatch[0], "");

            if (startMatch[1] < today) {
                happens["start"] = startMatch[1];
                happens["startForward"] = today;
                tasks[i].order = taskOrder.indexOf("start");
            } else {
                happens["start"] = startMatch[1];
                tasks[i].order = taskOrder.indexOf("start");
                timelineDates.push(startMatch[1]);
            }
        } else if (startMatch && (taskDone || taskCancelled)) {
            tasks[i].text = tasks[i].text.replace(startMatch[0], "");
        }

        // Completion date
        var doneMatch = taskText.match(/✅ *(\d{4}-\d{2}-\d{2})/);

        if (doneMatch && taskDone) {
            tasks[i].text = tasks[i].text.replace(doneMatch[0], "");

            if (done == true || doneMatch[1] == today) {
                timelineDates.push(doneMatch[1]);
                happens["done"] = doneMatch[1];
                tasks[i].order = taskOrder.indexOf("done");
            }
        } else if (taskDone) {
            // Tarefa concluída sem data explícita: usar hoje.
            happens["done"] = today;
            tasks[i].order = taskOrder.indexOf("done");
        }

        // Repeat
        var repeatMatch = taskText.match(/🔁 ?([a-zA-Z0-9, !]+)/);

        if (repeatMatch) {
            tasks[i].repeat = repeatMatch[1];
            tasks[i].text = tasks[i].text.replace(repeatMatch[0], "");
        }

        // Priority
        var lowMatch = taskText.includes("🔽");

        if (lowMatch) {
            tasks[i].text = tasks[i].text.replace("🔽", "");
            tasks[i].priority = "D";
            tasks[i].priorityLabel = "low priority";
        }

        var mediumMatch = taskText.includes("🔼");

        if (mediumMatch) {
            tasks[i].text = tasks[i].text.replace("🔼", "");
            tasks[i].priority = "B";
            tasks[i].priorityLabel = "medium priority";
        }

        var highMatch = taskText.includes("⏫");

        if (highMatch) {
            tasks[i].text = tasks[i].text.replace("⏫", "");
            tasks[i].priority = "A";
            tasks[i].priorityLabel = "high priority";
        }

        if (!lowMatch && !mediumMatch && !highMatch) {
            tasks[i].priority = "C";
        }

        // Global task filter
        if (globalTaskFilter) {
            tasks[i].text = tasks[i].text.replaceAll(globalTaskFilter, "");
        } else {
            tasks[i].text = tasks[i].text.replaceAll("#task", "");
        }

        // External links
        while (outerLink = /\[([^\]]+)\]\(([^)]+)\)/g.exec(tasks[i].text)) {
            tasks[i].text = tasks[i].text.replace(
                outerLink[0],
                "<a class='external-link outerLink' href='" +
                    outerLink[2] + "'>" + outerLink[1] + "</a>"
            );
        }

        // Internal links
        while (innerLink = /\[\[([^\]]+)\]\]/g.exec(tasks[i].text)) {
            tasks[i].text = tasks[i].text.replace(
                innerLink[0],
                "<a class='internal-link innerLink' href='" +
                    innerLink[1] + "'>" + innerLink[1] + "</a>"
            );
        }

        // Markdown highlights
        while (mark = /\=\=([^\]]+)\=\=/g.exec(tasks[i].text)) {
            tasks[i].text = tasks[i].text.replace(
                mark[0],
                "<mark>" + mark[1] + "</mark>"
            );
        }

        // Reminder syntax
        var reminderMatch = taskText.match(
            /⏰ *(\d{4}-\d{2}-\d{2}) *(\d{2}\:\d{2})|⏰ *(\d{4}-\d{2}-\d{2})|(\(\@(\d{4}-\d{2}-\d{2}) *(\d{2}\:\d{2})\))|(\(\@(\d{4}-\d{2}-\d{2})\))/
        );

        if (reminderMatch) {
            tasks[i].text = tasks[i].text.replace(reminderMatch[0], "");
        }

        tasks[i].happens = happens;
    }

    timelineDates.push(today);
    timelineDates = [...new Set(timelineDates)].sort();
};

function getRelative(someDate) {
    let date = moment(someDate);

    if (
        moment().diff(date, "days") >= 1 ||
        moment().diff(date, "days") <= -1
    ) {
        return date.fromNow();
    } else {
        return date.calendar().split(" ")[0];
    }
}



function getSelectOptions() {
    // Push daily note and Inbox files
    const currentDailyNote = getDailyNotePath(moment());

    taskFiles.push(currentDailyNote);

    if (inbox) {
        taskFiles.push(inbox);
    }

    taskFiles = [...new Set(taskFiles)].sort();

    // Loop files
    const fileSelect = rootNode.querySelector(".fileSelect");

    taskFiles.forEach(function(file) {
        const opt = document.createElement("option");
        opt.value = file;

        const parts = file.split("/");
        const secondParentFolder =
            parts[parts.length - 3] == null ? "" : "… / ";

        const parentFolder =
            parts[parts.length - 2] == null
                ? ""
                : secondParentFolder + "📂&nbsp;" +
                  parts[parts.length - 2] + " / ";

        const filePath = parentFolder + "📄&nbsp;" + getFilename(file);

        opt.innerHTML = filePath;
        opt.title = file;

        if (select && file === select) {
            opt.setAttribute("selected", true);
        } else if (select === "dailyNote" && file === currentDailyNote) {
            opt.setAttribute("selected", true);
        }

        fileSelect.appendChild(opt);
    });
}



function setEvents() {
    rootNode.querySelectorAll('.task:not(.star, .add)').forEach(t => {
        t.addEventListener('click', e => {
            // Ignora cliques nas tags.
            if (e.target.closest(".task .tag")) {
                return;
            }

            const link = t.getAttribute("data-link");
            const line = t.getAttribute("data-line");
            const col = t.getAttribute("data-col");

            // Apenas navega até a tarefa.
            openFile(link, line, col);
        });
    });


	

rootNode.querySelector(".ok").addEventListener("click", async () => {
    const filePath = rootNode.querySelector(".fileSelect").value;
    const taskInput = rootNode.querySelector(".newTask");
    const newTask = taskInput.value.trim();

    if (newTask.length <= 1) {
        taskInput.focus();
        return;
    }

    try {
        let file = app.vault.getAbstractFileByPath(filePath);

        // Detecta ou cria a nota de destino.
        if (!file) {
            const currentDailyNote = getDailyNotePath(moment());

            if (filePath === currentDailyNote) {
                file = await createDailyNoteFromTemplate(moment());
            } else {
                const targetFolder = filePath.substring(
                    0,
                    filePath.lastIndexOf("/")
                );

                await ensureVaultFolder(targetFolder);
                file = await app.vault.create(filePath, "");
            }
        }

        const fileText = await app.vault.read(file);
        const lines = fileText.split("\n");

        // Localiza a seção de destino.
        const sectionIndex = lines.findIndex(line =>
            /^##\s+Intenções para hoje:\s*$/i.test(line.trim())
        );

        if (sectionIndex === -1) {
            new Notice(
                'A seção "## Intenções para hoje:" não foi encontrada. ' +
                "A tarefa não foi salva."
            );
            return;
        }

        // Encontra o próximo título de nível 1 ou 2.
        let sectionEnd = lines.length;

        for (let i = sectionIndex + 1; i < lines.length; i++) {
            if (/^#{1,2}\s/.test(lines[i])) {
                sectionEnd = i;
                break;
            }
        }

        // Insere antes das linhas em branco que precedem
        // a próxima seção, preservando a separação entre seções.
        let insertAt = sectionEnd;

        while (
            insertAt > sectionIndex + 1 &&
            lines[insertAt - 1].trim() === ""
        ) {
            insertAt--;
        }

        // Mantém o marcador padrão e evita duplicar #tarefa.
        const taskText = newTask.replace(/^#tarefa\b\s*/i, "");
        const taskLine = "- [ ] #tarefa " + taskText;

        lines.splice(insertAt, 0, taskLine);

        await app.vault.modify(file, lines.join("\n"));

        taskInput.value = "";
        taskInput.blur();

        new Notice("Tarefa salva na seção Intenções para hoje!");
    } catch (err) {
        console.error("Erro ao salvar tarefa:", err);
        new Notice("Erro ao salvar tarefa. Consulte o console.");
    }
});

	rootNode.querySelector('.fileSelect').addEventListener('change', (() => {
		rootNode.querySelector('.newTask').focus();
	}));
	rootNode.querySelector('.newTask').addEventListener('input', (() => {
		var input = rootNode.querySelector('.newTask');
		var newTask = input.value;
		
		// Icons
		if (newTask.includes("due ")) { input.value = newTask.replace("due", "📅") };
		if (newTask.includes("start ")) { input.value = newTask.replace("start", "🛫") };
		if (newTask.includes("scheduled ")) { input.value = newTask.replace("scheduled", "⏳") };
		if (newTask.includes("done ")) { input.value = newTask.replace("done", "✅") };
		if (newTask.includes("high ")) { input.value = newTask.replace("high", "⏫") };
		if (newTask.includes("medium ")) { input.value = newTask.replace("medium", "🔼") };
		if (newTask.includes("low ")) { input.value = newTask.replace("low", "🔽") };
		if (newTask.includes("repeat ")) { input.value = newTask.replace("repeat", "🔁") };
		if (newTask.includes("recurring ")) { input.value = newTask.replace("recurring", "🔁") };
		
		// Dates
		if (newTask.includes("today ")) { input.value = newTask.replace("today", moment().format("YYYY-MM-DD")) };
		if (newTask.includes("tomorrow ")) { input.value = newTask.replace("tomorrow", moment().add(1, "days").format("YYYY-MM-DD")) };
		if (newTask.includes("yesterday ")) { input.value = newTask.replace("yesterday", moment().subtract(1, "days").format("YYYY-MM-DD")) };
		
		// In X days/weeks/month/years
		var futureDate = newTask.match(/(in)\W(\d{1,3})\W(days|day|weeks|week|month|years|year) /);
		if (futureDate) {
			var x = parseInt(futureDate[2]);
			var unit = futureDate[3];
			var date = moment().add(x, unit).format("YYYY-MM-DD[ ]")
			input.value = newTask.replace(futureDate[0], date);
		};
		
		// Next Weekday
		var weekday = newTask.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday) /);
		if (weekday) {
			var weekdays = ["","monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
			const dayINeed = weekdays.indexOf(weekday[1]);
			if (moment().isoWeekday() < dayINeed) {
			  input.value = newTask.replace(weekday[1], moment().isoWeekday(dayINeed).format("YYYY-MM-DD")); 
			} else {
			  input.value = newTask.replace(weekday[1], moment().add(1, 'weeks').isoWeekday(dayINeed).format("YYYY-MM-DD"));
			};
		};
		
		rootNode.querySelector('.newTask').focus();
	}));
	rootNode.querySelector('.newTask').addEventListener('keyup', ((e) => {
		if (e.which === 13) { // Enter key
			rootNode.querySelector('.ok').click();
		};
	}));
	rootNode.querySelector('.newTask').addEventListener('focus', (() => {
		rootNode.querySelector('.quickEntryPanel').classList.add("focus");
	}));
	rootNode.querySelector('.newTask').addEventListener('blur', (() => {
		rootNode.querySelector('.quickEntryPanel').classList.remove("focus");
	}));
};

function openFile(link, line, col) {
	app.workspace.openLinkText('', link).then(() => {
		if (line && col) {
			try {
				const view = app.workspace.activeLeaf.getViewState();
				view.state.mode = 'source'; // mode = source || preview
				app.workspace.activeLeaf.setViewState(view);
				var cmEditor = app.workspace.activeLeaf.view.editor;
				cmEditor.setSelection({line: parseInt(line), ch: 6},{line: parseInt(line), ch: parseInt(col)});
				cmEditor.focus();
			} catch(err) {
				new Notice("Something went wrong!")
			};
		};
	});
};

async function completeTask(link, line, col, taskText) {
    try {
        await app.workspace.openLinkText("", link);

        const leaf = app.workspace.activeLeaf;
        const view = leaf.getViewState();
        view.state.mode = "source";
        await leaf.setViewState(view);

        const editor = leaf.view.editor;
        const target = taskText.trim();

        const start = Math.max(0, parseInt(line, 10) - 2);
        const end = Math.min(
            editor.lineCount() - 1,
            parseInt(line, 10) + 2
        );

        const matches = [];

        for (let i = start; i <= end; i++) {
            const text = editor.getLine(i);
            const match = text.match(
                /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\])\s*(.*)$/
            );

            if (!match) continue;

            if (match[4].trim() === target) {
                matches.push({
                    line: i,
                    column: match[1].length,
                    marker: match[2]
                });
            }
        }

        if (matches.length !== 1) {
            new Notice(
                matches.length === 0
                    ? "Não encontrei a tarefa pelo texto."
                    : "O texto corresponde a várias tarefas."
            );
            return;
        }

        const task = matches[0];
        const newMarker = task.marker === " " ? "X" : " ";

        editor.replaceRange(
            newMarker,
            { line: task.line, ch: task.column },
            { line: task.line, ch: task.column + 1 }
        );

        editor.setCursor(task.line, task.column);
        editor.focus();

    } catch (err) {
        console.error(err);
        new Notice("Não foi possível atualizar a tarefa.");
    }
};

function getFilename(path) {
	var filename = path.match(/^(?:.*\/)?([^\/]+?|)(?=(?:\.[^\/.]*)?$)/)[1];
	return filename;
};

function getMetaFromNote(task, metaName) {
	var meta = dv.pages('"'+task.link.path+'"')[metaName][0];
	if (meta) { return meta } else { return "" };
};


function momentToRegex(momentFormat) {
    if (momentFormat === "DD [de] MMMM [de] YYYY") {
        return "/^(\\d{1,2} de (?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de \\d{4})$/i";
    }

    momentFormat = momentFormat.replaceAll(".", "\\.");
    momentFormat = momentFormat.replaceAll(",", "\\,");
    momentFormat = momentFormat.replaceAll("-", "\\-");
    momentFormat = momentFormat.replaceAll(":", "\\:");
    momentFormat = momentFormat.replaceAll(" ", "\\s");

    momentFormat = momentFormat.replace("dddd", "\\w{1,}");
    momentFormat = momentFormat.replace("ddd", "\\w{1,3}");
    momentFormat = momentFormat.replace("dd", "\\w{2}");
    momentFormat = momentFormat.replace("d", "\\d{1}");

    momentFormat = momentFormat.replace("YYYY", "\\d{4}");
    momentFormat = momentFormat.replace("YY", "\\d{2}");

    momentFormat = momentFormat.replace("MMMM", "\\w{1,}");
    momentFormat = momentFormat.replace("MMM", "\\w{3}");
    momentFormat = momentFormat.replace("MM", "\\d{2}");

    momentFormat = momentFormat.replace("DDDD", "\\d{3}");
    momentFormat = momentFormat.replace("DDD", "\\d{1,3}");
    momentFormat = momentFormat.replace("DD", "\\d{2}");
    momentFormat = momentFormat.replace("D", "\\d{1,2}");

    momentFormat = momentFormat.replace("ww", "\\d{1,2}");

    return "/^(" + momentFormat + ")$/";
}



function getTimeline(tasks) {
    let yearNode = null;
    let lastYear = null;
    let containedTypesPerYear = [];

    const timelineRoot = rootNode.querySelector("span");

    if (!timelineRoot) {
        console.error("Timeline: não encontrei o contêiner rootNode > span.");
        return;
    }

    // Cria um elemento HTML a partir de uma string.
    function appendHTML(parent, html) {
        const template = document.createElement("template");
        template.innerHTML = html.trim();
        parent.appendChild(template.content.cloneNode(true));
    }

    for (let i = 0; i < timelineDates.length; i++) {
        const currentDate = timelineDates[i].toString();

        const tasksFiltered = tasks
            .filter(t => Object.values(t.happens).includes(currentDate))
            .sort(eval(sort));

        const date = moment(currentDate).format(dateFormat);
        const weekday = moment(currentDate).format("dddd");
        const year = moment(currentDate).format("YYYY");

        let detailsCls = "";
        let content = document.createElement("div");
        const containedTypesPerDay = [];

        // Seção do ano
        if (year !== lastYear) {
            containedTypesPerYear = [];
            lastYear = year;

            yearNode = dv.el("div", year, {
                cls: "year",
                attr: { "data-types": "" }
            });

            if (moment().format("YYYY") === year) {
                yearNode.classList.add("current");
            }

            timelineRoot.appendChild(yearNode);
        }

        // Painel de hoje e entrada rápida
        if (currentDate === today.toString()) {
            detailsCls += "today";

            const overdueCount = tasks.filter(
                t => t.happens["overdue"]
            ).length;

            const dueCount = tasksFiltered.filter(
                t => t.happens["due"]
            ).length;

            const startCount = tasksFiltered.filter(
                t => t.happens["start"]
            ).length;

            const scheduledCount = tasksFiltered.filter(
                t => t.happens["scheduled"]
            ).length;

            const doneCount = tasksFiltered.filter(
                t => t.happens["done"] && isDoneTask(t)
            ).length;

            const dailynoteCount = tasksFiltered.filter(
                t => t.happens["dailynote"]
            ).length;

            const processCount = tasksFiltered.filter(
                t => t.happens["process"]
            ).length;

            const todoCount = tasksFiltered.filter(t =>
                !isDoneTask(t) &&
                !t.happens["overdue"] &&
                !t.happens["unplanned"] &&
                !isCancelledTask(t)
            ).length;

            const unplannedCount = tasks.filter(
                t => t.happens["unplanned"]
            ).length;

            let todayContent =
                "<div class='todayHeader' aria-label='Focus today'>Today</div>";

            todayContent += "<div class='counters'>";
            todayContent +=
                "<div class='counter' id='todo' aria-label='Filter tasks to do'>" +
                    "<div class='count'>" + todoCount + "</div>" +
                    "<div class='label'>To Do</div>" +
                "</div>";

            todayContent +=
                "<div class='counter' id='overdue' aria-label='Filter overdue tasks'>" +
                    "<div class='count'>" + overdueCount + "</div>" +
                    "<div class='label'>Overdue</div>" +
                "</div>";

            todayContent +=
                "<div class='counter' id='unplanned' aria-label='Filter unplanned tasks'>" +
                    "<div class='count'>" + unplannedCount + "</div>" +
                    "<div class='label'>Unplanned</div>" +
                "</div>";

            todayContent += "</div>";

            // Painel de entrada rápida
            todayContent += "<div class='quickEntryPanel'>";
            todayContent +=
                "<div class='left'>" +
                    "<select class='fileSelect' aria-label='Select a note to add a new task to'></select>" +
                    "<input class='newTask' type='text' placeholder='Enter your tasks here'/>" +
                "</div>";

            todayContent +=
                "<div class='right'>" +
                    "<button class='ok' aria-label='Append new task to selected note'>" +
                        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                            '<polyline points="9 10 4 15 9 20"></polyline>' +
                            '<path d="M20 4v7a4 4 0 0 1-4 4H4"></path>' +
                        '</svg>' +
                    "</button>" +
                "</div>";

            todayContent += "</div>";

            appendHTML(content, todayContent);
        }

        // Tarefas da data
        tasksFiltered.forEach(function(item) {
            const file = getFilename(item.path);
            const header = item.header?.subpath;

            let displayFile = file;

            if (header && header !== file) {
                displayFile += " > " + header;
            }

            const link = item.link.path.replace(/'/g, "&apos;");
            let text = item.text;
            const posEndLine = item.position.start.line;
            const posEndCol = item.position.end.col;

            let info = "";
            let color = getMetaFromNote(item, "color");

            if (!color) {
                color = "var(--text-muted)";
            }

            const cls = Object.keys(item.happens)
                .find(key => item.happens[key] === currentDate)
                ?.replace("Forward", "") || "unplanned";

            const dailyNote = item.dailyNote;

            containedTypesPerDay.push(cls);
            containedTypesPerYear.push(cls);

            // Informações relativas às datas
            const happensKeys = Object.keys(item.happens);

            for (let h = 0; h < happensKeys.length; h++) {
                const key = happensKeys[h];
                const value = item.happens[key];
                const relative = getRelative(moment(value));

                if (!key.includes("Forward") && key !== "unplanned") {
                    info +=
                        "<div class='relative' aria-label='" + cls + ": " + value + "'>" +
                            "<div class='icon'>" + eval(key + "Icon") + "</div>" +
                            "<div class='label'>" + relative + "</div>" +
                        "</div>";
                }
            }

            // Recorrência
            if (item.repeat) {
                info +=
                    "<div class='repeat'>" +
                        "<div class='icon'>" + repeatIcon + "</div>" +
                        "<div class='label'>" +
                            item.repeat.replace("🔁", "") +
                        "</div>" +
                    "</div>";
            }

            // Prioridade
            if (item.priorityLabel) {
                info +=
                    "<div class='priority'>" +
                        "<div class='icon'>" + priorityIcon + "</div>" +
                        "<div class='label'>" + item.priorityLabel + "</div>" +
                    "</div>";
            }

            // Arquivo de origem
            info +=
                "<div class='file' aria-label='" + item.path + "'>" +
                    "<div class='icon'>" + fileIcon + "</div>" +
                    "<div class='label'>" + displayFile + "</div>" +
                "</div>";

            // Tags
            item.tags.forEach(function(tag) {
                let tagText = tag.replace("#", "");
                const hexColorMatch =
                    tag.match(/([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\/(.*)/);

                let style;

                if (hexColorMatch) {
                    style =
                        "style='--tag-color:#" + hexColorMatch[1] +
                        ";--tag-background:#" + hexColorMatch[1] + "1a'";

                    tagText = hexColorMatch[2];
                } else {
                    style = "style='--tag-color:var(--text-muted)'";
                }

                info +=
                    "<a href='" + tag + "' class='tag' " + style +
                        " aria-label='#" + tagText + "'>" +
                        "<div class='icon'>" + tagIcon + "</div>" +
                        "<div class='label'>" + tagText + "</div>" +
                    "</a>";

                text = text.replace(tag, "");
            });

            // Ícone de status
            let icon = getTaskStatusIcon(item);

            // Preserva os ícones especiais da timeline
            if (cls === "overdue") {
                icon = alertIcon;
            } else if (cls === "cancelled") {
                icon = cancelledIcon;
            }

            const taskHTML =
                "<div data-line='" + posEndLine +
                "' data-col='" + posEndCol +
                "' data-link='" + link +
                "' data-dailynote='" + dailyNote +
                "' class='task " + cls +
                "' style='--task-color:" + color +
                "' aria-label='" + displayFile + "'>" +
                    "<div class='timeline'>" +
                        "<div class='icon'>" + icon + "</div>" +
                        "<div class='stripe'></div>" +
                    "</div>" +
                    "<div class='lines'>" +
                        "<a class='internal-link' href='" + link + "'>" +
                            "<div class='content'>" + text + "</div>" +
                        "</a>" +
                        "<div class='line info'>" + info + "</div>" +
                    "</div>" +
                "</div>";

            appendHTML(content, taskHTML);

     });

        // Linha da data
        const dateLine = document.createElement("div");
        dateLine.className = "dateLine";

        appendHTML(
            dateLine,
            "<div class='date'>" + date + "</div>" +
            "<div class='weekday'>" + weekday + "</div>"
        );

        const details = document.createElement("div");
        details.className = "details " + detailsCls;
        details.dataset.year = year;
        details.dataset.types = [...new Set(containedTypesPerDay)]
            .sort()
            .join(" ");

        details.appendChild(dateLine);
        details.appendChild(content);

        timelineRoot.appendChild(details);


        // Tipos presentes no ano
        containedTypesPerYear = [...new Set(containedTypesPerYear)].sort();
        yearNode.setAttribute("data-types", containedTypesPerYear.join(" "));
    }
}
