/**
 * TimeTableLib - A JavaScript library for displaying interactive timetables
 * Version 1.0.0
 */

class Timetable {
    /**
     * Creates a new Timetable instance
     * @param {string} containerId - ID of the container element
     * @param {Array} data - Array of event objects
     * @param {Object} options - Configuration options (optional)
     */
    constructor(containerId, data, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = this._mergeDefaultOptions(options);
        this.data = this.prepareData(data);
        this.timeSlots = this.generateTimeSlots();
        this.modalElement = null;

        // Mobile View properties
        this.currentDayIndex = this.options.startingDay;
        this.isMobileView = false;

        // Apply dark mode if set in options
        if (this.options.darkMode) {
            this.enableDarkMode();
        }

        // Load required CSS and dependencies
        this._loadDependencies();

        // Create modal
        this._createModal();

        // Add window resize handler for responsive behavior
        window.addEventListener('resize', this._handleResize.bind(this));

        // Render the timetable
        this.render();
    }

    /**
     * Merges user provided options with defaults
     */
    _mergeDefaultOptions(userOptions) {
        const defaults = {
            weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            timeInterval: 15, // minutes
            minRowSpan: 2,
            showIcons: true,
            modalEnabled: true, // New option to enable/disable modal
            showProf: true,     // NEW option: display professor info
            showClasse: true,    // NEW option: display classroom info
            // New mobile settings
            mobileBreakpoint: 768, // Width in px to switch to mobile view (single day)
            startingDay: 0, // Index of day to show first (0 = Monday if using default weekdays)
            alwaysUseMobileView: false, // Force single day view even on desktop
            darkMode: false  // Enable/disable dark mode
        };

        return { ...defaults, ...userOptions };
    }

    /**
     * Loads external dependencies (FontAwesome)
     */
    _loadDependencies() {
        // Add Font Awesome for icons if not present and icons are enabled
        if (this.options.showIcons && !document.getElementById("font-awesome-css")) {
            const fontAwesome = document.createElement("link");
            fontAwesome.id = "font-awesome-css";
            fontAwesome.rel = "stylesheet";
            fontAwesome.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
            document.head.appendChild(fontAwesome);
        }
    }

    /**
     * Prepares raw data into a format suitable for the timetable
     */
    prepareData(rawData) {
        // Initialize prepared data object with weekdays
        let prepared = {};
        this.options.weekdays.forEach(day => {
            prepared[day] = [];
        });

        // Map date string (dd/mm/yyyy) to day of week
        const getDayOfWeek = (dateStr) => {
            const parts = dateStr.split("/");
            const date = new Date(parts[2], parts[1] - 1, parts[0]);
            const days = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
            ];
            return days[date.getDay()];
        };

        // Process time string to get start and end times in minutes from midnight
        const processTime = (timeStr) => {
            const [range, startTime, endTime] = timeStr
                .match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/)
                .slice(0, 3);

            const getMinutes = (time) => {
                const [hours, minutes] = time.split(":").map(Number);
                return hours * 60 + minutes;
            };

            const startMinutes = getMinutes(startTime);
            const endMinutes = getMinutes(endTime);

            return {
                startTime,
                endTime,
                startMinutes,
                endMinutes,
                duration: endMinutes - startMinutes,
            };
        };

        rawData.forEach((event) => {
            const day = getDayOfWeek(event.Date);
            if (prepared[day]) {
                const timeInfo = processTime(event.Heure);

                prepared[day].push({
                    startTime: timeInfo.startTime,
                    endTime: timeInfo.endTime,
                    startMinutes: timeInfo.startMinutes,
                    endMinutes: timeInfo.endMinutes,
                    duration: timeInfo.duration,
                    name:
                        event.Matière || event["Catégorie d’événement"] || "Unspecified",
                    location: event.Salle || "TBD",
                    staff: event.Personnel || "N/A",
                    group: event.Groupe || "All",
                    category: event["Catégorie d’événement"] || "Other",
                    remarks: event.Remarques || "",
                });
            }
        });

        return prepared;
    }

    /**
     * Generates time slots based on fixed range from 8:00 to 18:00
     */
    generateTimeSlots() {
        // Use fixed start and end times (8:00 to 18:00)
        const startHour = 8; // 8:00
        const endHour = 18;  // 18:00

        // Convert hours to minutes
        const startTimeMinutes = startHour * 60;
        const endTimeMinutes = endHour * 60;

        // Create time slots with specified time intervals
        const slots = [];
        for (let time = startTimeMinutes; time < endTimeMinutes; time += this.options.timeInterval) {
            const hour = Math.floor(time / 60);
            const minute = time % 60;
            slots.push({
                label: `${hour.toString().padStart(2, "0")}:${minute
                    .toString()
                    .padStart(2, "0")}`,
                minutes: time,
                isHour: minute === 0, // Flag to identify full hours
                isHalfHour: minute === 30, // Flag to identify half hours
            });
        }

        return slots;
    }

    /**
     * Gets index of time slot for a specific time in minutes
     * @param {number} timeInMinutes - Time in minutes from midnight
     * @returns {number} Index of the corresponding time slot
     */
    getTimeSlotIndex(timeInMinutes) {
        const interval = this.options.timeInterval;
        const firstSlotMinutes = this.timeSlots[0].minutes;

        // Calculate the exact slot index without any rounding or adjustment
        return Math.floor((timeInMinutes - firstSlotMinutes) / interval);
    }

    /**
     * Determines if a time falls exactly on a time slot
     * @param {number} timeInMinutes - Time in minutes from midnight
     * @returns {boolean} Whether the time is exact on a slot
     */
    isExactTimeSlot(timeInMinutes) {
        const interval = this.options.timeInterval;
        const firstSlotMinutes = this.timeSlots[0].minutes;

        // Check if time aligns exactly with a slot
        return (timeInMinutes - firstSlotMinutes) % interval === 0;
    }

    /**
     * Formats time label
     */
    formatTimeLabel(minutes) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        return `${hour.toString().padStart(2, "0")}:${minute
            .toString()
            .padStart(2, "0")}`;
    }

    /**
     * Calculate rowspan based on event duration (each segment = 15 minutes)
     */
    getRowSpan(duration) {
        // 1 hour (60 minutes) yields 4 segments
        return Math.ceil(duration / 15);
    }

    /**
     * Creates modal element for event details
     */
    _createModal() {
        // Only create modal if enabled in options
        if (!this.options.modalEnabled) {
            return;
        }

        // Create modal backdrop
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'timetable-modal-backdrop';

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'timetable-modal';

        // Modal header with close button
        const modalHeader = document.createElement('div');
        modalHeader.className = 'timetable-modal-header';

        const modalTitle = document.createElement('h3');
        modalTitle.className = 'timetable-modal-title';

        const closeButton = document.createElement('button');
        closeButton.className = 'timetable-modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            this.closeModal();
        });

        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);

        // Color indicator at top of modal
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'modal-color-indicator';

        // Modal body for content
        const modalBody = document.createElement('div');
        modalBody.className = 'timetable-modal-body';

        // Modal footer
        const modalFooter = document.createElement('div');
        modalFooter.className = 'timetable-modal-footer';

        // Assemble modal
        modal.appendChild(colorIndicator);
        modal.appendChild(modalHeader);
        modal.appendChild(modalBody);
        modal.appendChild(modalFooter);
        modalBackdrop.appendChild(modal);

        // Add click event to backdrop for closing
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
                this.closeModal();
            }
        });

        // Add keyboard event to close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalBackdrop.classList.contains('active')) {
                this.closeModal();
            }
        });

        // Add to DOM
        document.body.appendChild(modalBackdrop);
        this.modalElement = {
            backdrop: modalBackdrop,
            modal: modal,
            title: modalTitle,
            body: modalBody,
            footer: modalFooter,
            colorIndicator: colorIndicator
        };
    }

    /**
     * Cleans category string for CSS class use by removing parentheses and special characters
     * @param {string} category - The category string to clean
     * @returns {string} Cleaned category string suitable for CSS class
     */
    _cleanCategoryForCss(category) {
        if (!category) return 'other';
        // Remove parentheses and their content, then trim and convert to kebab-case
        return category
            .replace(/\s*\([^)]*\)/g, '') // Remove parentheses and their content
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-');
    }

    /**
     * Opens modal with event details
     * @param {Object} event - Event object with details
     */
    openModal(event) {
        if (!this.modalElement || !this.options.modalEnabled) {
            console.warn("Modal not enabled or created");
            return;
        }

        // Set category class for styling - use cleaned category
        const categoryClass = this._cleanCategoryForCss(event.category);
        this.modalElement.colorIndicator.className = 'modal-color-indicator';
        this.modalElement.colorIndicator.classList.add(categoryClass);

        // Set title
        this.modalElement.title.textContent = event.name;

        // Build content
        let content = '';

        // Time information
        content += `
            <div class="timetable-modal-info">
                <h4>Time</h4>
                <p>${event.startTime} - ${event.endTime}</p>
            </div>
        `;

        // Category
        if (event.category) {
            content += `
                <div class="timetable-modal-info">
                    <h4>Category</h4>
                    <p>${event.category}</p>
                </div>
            `;
        }

        // Location
        if (event.location && event.location !== "TBD") {
            content += `
                <div class="timetable-modal-info">
                    <h4>Location</h4>
                    <p>${event.location}</p>
                </div>
            `;
        }

        // Staff
        if (event.staff && event.staff !== "N/A") {
            content += `
                <div class="timetable-modal-info">
                    <h4>Staff</h4>
                    <p>${event.staff}</p>
                </div>
            `;
        }

        // Group
        if (event.group && event.group !== "All") {
            content += `
                <div class="timetable-modal-info">
                    <h4>Group</h4>
                    <p>${event.group}</p>
                </div>
            `;
        }

        // Remarks
        if (event.remarks) {
            content += `
                <div class="timetable-modal-info">
                    <h4>Notes</h4>
                    <p>${event.remarks}</p>
                </div>
            `;
        }

        // Set content
        this.modalElement.body.innerHTML = content;

        // Add close button to footer
        this.modalElement.footer.innerHTML = '<button class="btn-close">Close</button>';
        const closeButton = this.modalElement.footer.querySelector('.btn-close');

        // Ensure close button event handler is properly added
        if (closeButton) {
            // Remove any existing event listeners first
            const newCloseButton = closeButton.cloneNode(true);
            closeButton.parentNode.replaceChild(newCloseButton, closeButton);
            newCloseButton.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Make sure modal is in the DOM
        if (!document.body.contains(this.modalElement.backdrop)) {
            document.body.appendChild(this.modalElement.backdrop);
        }

        // Simply add active class - no need for multiple classes or force reflow
        this.modalElement.backdrop.classList.add('active');

        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }

    /**
     * Closes the modal
     */
    closeModal() {
        if (!this.modalElement) {
            return;
        }

        // Remove active class
        this.modalElement.backdrop.classList.remove('active');

        // Also remove modal-visible if it was added
        this.modalElement.backdrop.classList.remove('modal-visible');

        // Restore body scrolling
        document.body.style.overflow = '';

        // Log for debugging
        console.log("Modal closed");
    }

    /**
     * Recreate the modal for clean slate
     */
    _recreateModal() {
        // Remove old modal if exists
        if (this.modalElement && this.modalElement.backdrop) {
            document.body.removeChild(this.modalElement.backdrop);
            this.modalElement = null;
        }

        // Create fresh modal
        this._createModal();
    }

    /**
     * Handles switching between days in mobile view
     */
    _navigateToDay(index) {
        // Ensure the index is within bounds
        const totalDays = this.options.weekdays.length;
        this.currentDayIndex = (index + totalDays) % totalDays;
        this.render();
    }

    /**
     * Create day selector for mobile view
     */
    _createDaySelector() {
        const container = document.createElement("div");
        container.className = "timetable-day-selector";

        // Previous day button
        const prevBtn = document.createElement("button");
        prevBtn.innerHTML = '&laquo;';
        prevBtn.className = "day-nav-btn prev-day";
        prevBtn.addEventListener("click", () => this._navigateToDay(this.currentDayIndex - 1));

        // Day label
        const dayLabel = document.createElement("div");
        dayLabel.className = "current-day";
        dayLabel.textContent = this.options.weekdays[this.currentDayIndex];

        // Next day button
        const nextBtn = document.createElement("button");
        nextBtn.innerHTML = '&raquo;';
        nextBtn.className = "day-nav-btn next-day";
        nextBtn.addEventListener("click", () => this._navigateToDay(this.currentDayIndex + 1));

        container.appendChild(prevBtn);
        container.appendChild(dayLabel);
        container.appendChild(nextBtn);

        return container;
    }

    /**
     * Renders the timetable
     */
    render() {
        if (!this.container) {
            console.error("Timetable container not found");
            return;
        }

        // Determine if we should use mobile view based on screen width or option
        this.isMobileView = this.options.alwaysUseMobileView ||
            (window.innerWidth <= this.options.mobileBreakpoint);

        this.container.innerHTML = "";
        const wrapper = document.createElement("div");
        wrapper.classList.add("timetable-wrapper");

        // Add mobile class if needed
        if (this.isMobileView) {
            wrapper.classList.add("mobile-view");

            // Add day selector for mobile view
            wrapper.appendChild(this._createDaySelector());
        }

        // Add dark theme class if enabled
        if (this.options.darkMode) {
            wrapper.classList.add("dark-theme");
        }

        let table = document.createElement("table");
        table.classList.add("timetable");

        // Generate header
        let thead = document.createElement("thead");
        let headRow = document.createElement("tr");

        // Always add the Time column
        let timeHeader = document.createElement("th");
        timeHeader.textContent = "Time";
        headRow.appendChild(timeHeader);

        // Add day columns - either all days or just current day for mobile
        const days = Object.keys(this.data);
        const daysToShow = this.isMobileView ? [days[this.currentDayIndex]] : days;

        daysToShow.forEach((day) => {
            let th = document.createElement("th");
            th.textContent = day;
            headRow.appendChild(th);
        });

        thead.appendChild(headRow);
        table.appendChild(thead);

        // Generate body
        let tbody = document.createElement("tbody");

        // Create a 2D grid to track cell availability
        const cellOccupied = {}; // Track which cells are already occupied
        days.forEach((day) => {
            cellOccupied[day] = {};
        });

        // Sort events for each day by start time
        days.forEach((day) => {
            this.data[day].sort((a, b) => a.startMinutes - b.startMinutes);
        });

        // Pre-process events to assign them to the correct slot
        days.forEach((day) => {
            // Sort events by their start time
            this.data[day].sort((a, b) => a.startMinutes - b.startMinutes);

            this.data[day].forEach((event) => {
                // Get exact slot index for the start time
                const slotIndex = this.getTimeSlotIndex(event.startMinutes);
                event.slotIndex = slotIndex;
                event.rowSpan = this.getRowSpan(event.duration); // rowSpan directly from duration
                event.exactTimeSlot = this.isExactTimeSlot(event.startMinutes);

                // Calculate position offset if not aligned with time slot
                if (!event.exactTimeSlot) {
                    const slotStartMinutes = this.timeSlots[slotIndex].minutes;
                    event.offsetMinutes = event.startMinutes - slotStartMinutes;

                    // Handle events that don't start exactly on time slots
                    if (event.offsetMinutes > 0) {
                        // No need to adjust rowspan here - we'll use the full duration
                    }
                }
            });
        });

        // Generate rows for each time slot
        this.timeSlots.forEach((timeSlot, slotIndex) => {
            let row = document.createElement("tr");
            row.setAttribute("data-time", timeSlot.minutes);

            // Add classes to help with styling
            if (timeSlot.isHour) {
                row.classList.add("hour-row");
            } else if (timeSlot.isHalfHour) {
                row.classList.add("half-hour-row");
            } else {
                row.classList.add("quarter-row");
            }

            // Time column - only show labels for hours and half hours
            let timeCell = document.createElement("td");
            if (timeSlot.isHour) {
                timeCell.textContent = timeSlot.label;
                timeCell.classList.add("time-cell");
                timeCell.classList.add("hour-cell");
            } else {
                timeCell.classList.add("time-cell");
                if (timeSlot.isHalfHour) {
                    timeCell.classList.add("half-hour-cell");
                } else {
                    timeCell.classList.add("quarter-cell");
                }
            }
            row.appendChild(timeCell);

            // Create cells for days - either all days or just the current day
            const daysToShow = this.isMobileView ? [days[this.currentDayIndex]] : days;

            daysToShow.forEach((day) => {
                // Skip if this cell is already occupied by a rowspan from an earlier event
                if (cellOccupied[day][slotIndex]) {
                    return;
                }

                // Find events that should start at exactly this time slot
                const eventsStartingHere = this.data[day].filter((event) => {
                    return event.slotIndex === slotIndex;
                });

                if (eventsStartingHere.length > 0) {
                    // We have events starting at this slot
                    // Compute rowspan for each event already computed as ceil(duration / 15)
                    // Use maximum if multiple events occupy same slot.
                    let cellRowSpan = Math.max(...eventsStartingHere.map(event => event.rowSpan));

                    let cell = document.createElement("td");
                    cell.classList.add("event-cell");
                    cell.style.height = "100%";
                    if (cellRowSpan > 1) {
                        cell.setAttribute("rowspan", cellRowSpan);
                        for (let i = 1; i < cellRowSpan && slotIndex + i < this.timeSlots.length; i++) {
                            cellOccupied[day][slotIndex + i] = true;
                        }
                    }

                    // If only one event, render as before;
                    // if multiple, use a flex container to display them side by side.
                    if (eventsStartingHere.length === 1) {
                        let event = eventsStartingHere[0];
                        if (!event.exactTimeSlot) {
                            event.displayStartTime = event.startTime + ' (exact)';
                        } else {
                            event.displayStartTime = event.startTime;
                        }
                        let eventDiv = document.createElement("div");
                        const categoryClass = this._cleanCategoryForCss(event.category);
                        eventDiv.classList.add("event", categoryClass);
                        // Fixed segment height: 20px per 15 minutes segment
                        const segmentHeight = 20;
                        eventDiv.style.height = (event.rowSpan * segmentHeight) + "px";
                        eventDiv.style.overflow = "auto";

                        // ... (retain adding color bar, title, time, details, click event) ...
                        let colorBar = document.createElement("div");
                        colorBar.classList.add("event-color-bar", categoryClass);
                        eventDiv.appendChild(colorBar);

                        let titleElem = document.createElement("div");
                        titleElem.classList.add("event-title");
                        titleElem.textContent = event.name;
                        eventDiv.appendChild(titleElem);

                        let timeRangeElem = document.createElement("div");
                        timeRangeElem.classList.add("event-time");
                        timeRangeElem.textContent = `${event.displayStartTime} - ${event.endTime}`;
                        eventDiv.appendChild(timeRangeElem);

                        // ADD BASIC INFO: show location if defined
                        if (this.options.showClasse) {
                            if (event.location && event.location !== "TBD") {
                                let classeInfo = document.createElement("div");
                                classeInfo.classList.add("event-basic-info");
                                classeInfo.textContent = event.location;
                                eventDiv.appendChild(classeInfo);
                            }
                        }
                        if (this.options.showProf) {
                            if (event.staff && event.staff !== "N/A") {
                                let profInfo = document.createElement("div");
                                profInfo.classList.add("event-basic-info");
                                profInfo.textContent = event.staff;
                                eventDiv.appendChild(profInfo);
                            }
                        }

                        let detailsElem = document.createElement("div");
                        detailsElem.classList.add("event-details");
                        /* ...existing icon/text details code... */
                        eventDiv.appendChild(detailsElem);

                        if (this.options.modalEnabled) {
                            eventDiv.addEventListener('click', () => { this.openModal(event); });
                        }
                        cell.appendChild(eventDiv);
                    } else {
                        // Multiple events in same slot: create a flex container.
                        let container = document.createElement("div");
                        container.style.display = "flex";
                        container.style.gap = "2px";
                        eventsStartingHere.forEach((event) => {
                            if (!event.exactTimeSlot) {
                                event.displayStartTime = event.startTime + ' (exact)';
                            } else {
                                event.displayStartTime = event.startTime;
                            }
                            let eventDiv = document.createElement("div");
                            const categoryClass = this._cleanCategoryForCss(event.category);
                            eventDiv.classList.add("event", categoryClass);
                            // Use the event's computed rowSpan; for consistency, use fixed segment height.
                            const segmentHeight = 20;
                            eventDiv.style.height = (event.rowSpan * segmentHeight) + "px";
                            eventDiv.style.flex = "1"; // evenly distribute width
                            eventDiv.style.overflow = "auto";

                            let colorBar = document.createElement("div");
                            colorBar.classList.add("event-color-bar", categoryClass);
                            eventDiv.appendChild(colorBar);

                            let titleElem = document.createElement("div");
                            titleElem.classList.add("event-title");
                            titleElem.textContent = event.name;
                            eventDiv.appendChild(titleElem);

                            let timeRangeElem = document.createElement("div");
                            timeRangeElem.classList.add("event-time");
                            timeRangeElem.textContent = `${event.displayStartTime} - ${event.endTime}`;
                            eventDiv.appendChild(timeRangeElem);

                            // ADD BASIC INFO: show location if defined
                            if (this.options.showClasse) {
                                if (event.location && event.location !== "TBD") {
                                    let classeInfo = document.createElement("div");
                                    classeInfo.classList.add("event-basic-info");
                                    classeInfo.textContent = event.location;
                                    eventDiv.appendChild(classeInfo);
                                }
                            }
                            if (this.options.showProf) {
                                if (event.staff && event.staff !== "N/A") {
                                    let profInfo = document.createElement("div");
                                    profInfo.classList.add("event-basic-info");
                                    profInfo.textContent = event.staff;
                                    eventDiv.appendChild(profInfo);
                                }
                            }

                            let detailsElem = document.createElement("div");
                            detailsElem.classList.add("event-details");

                            eventDiv.appendChild(detailsElem);

                            if (this.options.modalEnabled) {
                                eventDiv.addEventListener('click', () => { this.openModal(event); });
                            }
                            container.appendChild(eventDiv);
                        });
                        cell.appendChild(container);
                    }
                    row.appendChild(cell);
                } else if (!cellOccupied[day][slotIndex]) {
                    // Empty cell
                    let cell = document.createElement("td");
                    cell.classList.add("empty-cell");

                    // Set minimum height based on time interval
                    const minHeight = Math.ceil(this.options.timeInterval / 15) * 10;

                    if (timeSlot.isHour) {
                        cell.classList.add("hour-cell");
                    } else if (timeSlot.isHalfHour) {
                        cell.classList.add("half-hour-cell");
                    } else {
                        cell.classList.add("quarter-cell");
                    }

                    // Add a placeholder div with appropriate height to maintain spacing
                    let spacerDiv = document.createElement("div");
                    spacerDiv.style.height = minHeight + "px";
                    spacerDiv.style.width = "100%";
                    cell.appendChild(spacerDiv);

                    row.appendChild(cell);
                }
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        wrapper.appendChild(table);
        this.container.appendChild(wrapper);
    }

    /**
     * Handle window resize
     */
    _handleResize() {
        const wasMobile = this.isMobileView;
        const nowMobile = this.options.alwaysUseMobileView ||
            (window.innerWidth <= this.options.mobileBreakpoint);

        // Only re-render if the view mode changed
        if (wasMobile !== nowMobile) {
            this.render();
        }
    }

    /**
     * Toggle dark mode on/off
     * Add as a new method
     */
    toggleDarkMode() {
        this.options.darkMode = !this.options.darkMode;
        if (this.options.darkMode) {
            this.enableDarkMode();
        } else {
            this.disableDarkMode();
        }
        return this.options.darkMode; // Return new state
    }

    /**
     * Enable dark mode
     * Add as a new method
     */
    enableDarkMode() {
        this.options.darkMode = true;
        if (this.container) {
            const wrapper = this.container.querySelector('.timetable-wrapper');
            if (wrapper) {
                wrapper.classList.add('dark-theme');
            }
        }
    }

    /**
     * Disable dark mode
     * Add as a new method
     */
    disableDarkMode() {
        this.options.darkMode = false;
        if (this.container) {
            const wrapper = this.container.querySelector('.timetable-wrapper');
            if (wrapper) {
                wrapper.classList.remove('dark-theme');
            }
        }
    }
}

// Make Timetable available in the global scope for browser environments
if (typeof window !== 'undefined') {
    window.Timetable = Timetable;
}

// Support CommonJS for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Timetable;
}
