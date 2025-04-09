document.addEventListener('DOMContentLoaded', () => {
    const displayDateEl = document.getElementById('display-date');
    const journalText = document.getElementById('journal-text');
    const taskListContainer = document.getElementById('task-list');
    const saveStatus = document.getElementById('save-status');
    const previousDaysList = document.getElementById('previous-days-list');
    const noEntriesLi = previousDaysList.querySelector('.no-entries');

    // --- Hardcoded Tasks ---
    const dailyTasks = [
        { id: 'task-exercise', text: 'Exercise for 30 minutes' },
        { id: 'task-read', text: 'Read a book/article' },
        { id: 'task-hydrate', text: 'Drink 8 glasses of water' },
        { id: 'task-plan', text: 'Plan tomorrow\'s main task' },
        // Add more tasks as needed
    ];

    let currentlyEditingDate = ''; // Store the date being viewed/edited (YYYY-MM-DD)
    let saveTimeout; // For debouncing saves

    // --- Functions ---

    function getFormattedDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Function to render the hardcoded tasks for the specific date
    function renderTasks(dateString) {
        taskListContainer.innerHTML = ''; // Clear existing tasks
        dailyTasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('task-item');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            // IMPORTANT: Make ID unique per task *and* date to avoid conflicts
            checkbox.id = `${task.id}-${dateString}`;
            checkbox.dataset.taskId = task.id; // Store original task ID

            const label = document.createElement('label');
            label.setAttribute('for', checkbox.id);
            label.textContent = task.text;

            taskItem.appendChild(checkbox);
            taskItem.appendChild(label);
            taskListContainer.appendChild(taskItem);

            // Add event listener to save when checkbox changes
            checkbox.addEventListener('change', scheduleSave);
        });
    }

    // Function to load data for a specific date
    function loadDataForDate(dateString) {
        if (currentlyEditingDate === dateString && journalText.value !== '') { // Avoid unnecessary reloads if clicking the active day
             console.log(`Already viewing ${dateString}`);
             return;
        }

        console.log(`Loading data for ${dateString}...`);
        currentlyEditingDate = dateString;
        displayDateEl.textContent = dateString; // Update displayed date in main area

        // Re-render tasks specific to this date (ensures correct checkbox IDs)
        renderTasks(dateString);

        const savedData = localStorage.getItem(dateString);
        let journalEntry = '';
        let taskStates = {}; // Default: all tasks unchecked

        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                journalEntry = parsedData.journal || '';
                taskStates = parsedData.tasks || {};
            } catch (e) {
                console.error("Error parsing localStorage data for", dateString, e);
            }
        } else {
             console.log(`No saved data found for ${dateString}. Starting fresh.`);
        }

        // Populate journal text
        journalText.value = journalEntry;

        // Populate task checkboxes
        taskListContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            const taskId = checkbox.dataset.taskId;
            checkbox.checked = taskStates[taskId] || false;
        });

        clearStatus();
        updatePreviousDaysHighlight(); // Highlight the newly loaded day in the sidebar
    }

    // Function to save data for the currently editing date
    function saveData() {
        if (!currentlyEditingDate) {
            console.error("Cannot save, no date is currently being edited.");
            return;
        }

        const dataToSave = {
            journal: journalText.value,
            tasks: {}
        };

        taskListContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            const taskId = checkbox.dataset.taskId;
            dataToSave.tasks[taskId] = checkbox.checked;
        });

        try {
            // Only save if there's actual content or a checked task
            const isEmpty = !dataToSave.journal.trim() && Object.values(dataToSave.tasks).every(v => !v);

            if (!isEmpty) {
                localStorage.setItem(currentlyEditingDate, JSON.stringify(dataToSave));
                showStatus("Saved!");
                console.log(`Saved data for ${currentlyEditingDate}`);
                // Refresh the list in case this is the first save for this date
                populatePreviousDaysList();
                updatePreviousDaysHighlight(); // Ensure current day remains highlighted
            } else {
                 // If the entry becomes empty, remove it from storage and the list
                 if (localStorage.getItem(currentlyEditingDate)) {
                     localStorage.removeItem(currentlyEditingDate);
                     console.log(`Removed empty entry for ${currentlyEditingDate}`);
                     showStatus("Entry removed (empty).");
                     populatePreviousDaysList();
                     // Optionally load today's date again if the removed date was the current one
                     // const todayStr = getFormattedDate(new Date());
                     // if (currentlyEditingDate !== todayStr) loadDataForDate(todayStr);
                 } else {
                     clearStatus(); // Don't show "Saved!" for an empty entry
                 }
            }

        } catch (e) {
            console.error("Error saving to localStorage", e);
            showStatus("Error saving!", true);
        }
    }

    // Debounce save function
    function scheduleSave() {
        clearTimeout(saveTimeout);
        clearStatus();
        saveTimeout = setTimeout(saveData, 800); // Save after 800ms of inactivity
    }

    function showStatus(message, isError = false) {
        saveStatus.textContent = message;
        saveStatus.style.color = isError ? 'red' : 'green';
    }

    function clearStatus() {
        saveStatus.textContent = '';
    }

    // Function to get all saved dates from localStorage and populate the sidebar list
    function populatePreviousDaysList() {
        const dateKeys = Object.keys(localStorage)
            // Basic filter for keys that look like YYYY-MM-DD dates
            .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key))
            // Sort dates, most recent first
            .sort((a, b) => b.localeCompare(a));

        // Clear the current list (except the 'no entries' message template)
        previousDaysList.innerHTML = '';
        previousDaysList.appendChild(noEntriesLi); // Keep the template

        if (dateKeys.length > 0) {
            noEntriesLi.style.display = 'none'; // Hide 'no entries' message
            dateKeys.forEach(dateString => {
                const li = document.createElement('li');
                li.textContent = dateString;
                li.dataset.date = dateString; // Store date in data attribute
                li.addEventListener('click', () => {
                    loadDataForDate(dateString);
                });
                previousDaysList.appendChild(li);
            });
        } else {
            noEntriesLi.style.display = 'block'; // Show 'no entries' message
        }
    }

    // Function to update the highlight in the previous days list
    function updatePreviousDaysHighlight() {
        const listItems = previousDaysList.querySelectorAll('li');
        listItems.forEach(li => {
            if (li.dataset.date === currentlyEditingDate) {
                li.classList.add('active');
            } else {
                li.classList.remove('active');
            }
        });
    }

    // --- Event Listeners ---

    // Save data when journal text changes (debounced)
    journalText.addEventListener('input', scheduleSave);

    // --- Initialisation ---

    const todayString = getFormattedDate(new Date());
    populatePreviousDaysList(); // Populate the list of previous entries first
    loadDataForDate(todayString); // Load today's data by default

});