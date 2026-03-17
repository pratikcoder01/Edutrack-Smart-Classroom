/**
 * EduTrack SaaS — Frontend API Service
 * =====================================
 * Production-grade JavaScript module to communicate with the Flask backend.
 * All functions use async/await, return normalized JSON, and handle errors uniformly.
 *
 * Usage on any page:
 *   <script src="js/api.js"></script>
 *   const data = await EduTrackAPI.getStudents();
 */

const EduTrackAPI = (() => {

    // ─────────────────────────────────────────────
    // CONFIGURATION
    // ─────────────────────────────────────────────
    const BASE_URL = 'http://127.0.0.1:5000';

    /** Default headers attached to every request */
    const DEFAULT_HEADERS = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    // ─────────────────────────────────────────────
    // INTERNAL: Core Fetch Wrapper
    // ─────────────────────────────────────────────
    /**
     * Central fetch handler with unified error handling and response parsing.
     * @param {string} endpoint  - The API path e.g. "/students"
     * @param {object} options   - Fetch request options (method, body, headers...)
     * @returns {Promise<object>} - Resolves with { ok: bool, status: int, data: object }
     */
    async function _request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const config = {
            headers: { ...DEFAULT_HEADERS },
            ...options
        };

        try {
            const response = await fetch(url, config);
            let data = null;

            // Guard: parse JSON only if there's a body (204 No Content has none)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            }

            if (!response.ok) {
                // Normalize backend error into a standard shape
                const errorMessage = data?.error || data?.message || `HTTP Error ${response.status}`;
                console.error(`[EduTrackAPI] ❌ ${options.method || 'GET'} ${endpoint} → ${response.status}: ${errorMessage}`);
                return { ok: false, status: response.status, error: errorMessage, data: null };
            }

            return { ok: true, status: response.status, error: null, data };

        } catch (networkError) {
            // Typically ERR_CONNECTION_REFUSED — Flask server is not running
            const message = 'Cannot reach backend server. Is app.py running on port 5000?';
            console.error(`[EduTrackAPI] ⚠️ Network Failure on ${endpoint}:`, networkError.message);
            return { ok: false, status: 0, error: message, data: null };
        }
    }

    // ─────────────────────────────────────────────
    // AUTH
    // ─────────────────────────────────────────────
    /**
     * Authenticate a faculty member.
     * POST /login
     *
     * @param {string} email
     * @param {string} password
     * @returns {{ ok, data: { faculty_id, name, department } | null, error }}
     *
     * @example
     * const { ok, data, error } = await EduTrackAPI.loginUser('alan@uni.edu', 'pass123');
     * if (ok) localStorage.setItem('faculty_name', data.name);
     */
    async function loginUser(email, password) {
        return await _request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    // ─────────────────────────────────────────────
    // DATA RETRIEVAL
    // ─────────────────────────────────────────────
    /**
     * Fetch all registered students from Firestore.
     * GET /students
     *
     * @returns {{ ok, data: Array<{ roll_number, name, class, dataset_images, is_active }>, error }}
     *
     * @example
     * const { ok, data: students } = await EduTrackAPI.getStudents();
     */
    async function getStudents() {
        return await _request('/students');
    }

    /**
     * Fetch the 100 most recent face-recognition attendance logs.
     * GET /attendance
     *
     * @returns {{ ok, data: Array<{ roll_number, name, subject, date, time, confidence_score, status }>, error }}
     *
     * @example
     * const { ok, data: logs } = await EduTrackAPI.getAttendanceLogs();
     */
    async function getAttendanceLogs() {
        return await _request('/attendance');
    }

    /**
     * Fetch aggregated analytics for the dashboard overview card row.
     * GET /analytics
     *
     * @returns {{ ok, data: { total_students, today_attendance, avg_confidence }, error }}
     *
     * @example
     * const { ok, data } = await EduTrackAPI.getAnalytics();
     * if (ok) document.getElementById('stat').innerText = data.total_students;
     */
    async function getAnalytics() {
        return await _request('/analytics');
    }

    // ─────────────────────────────────────────────
    // ATTENDANCE SESSION MANAGEMENT
    // ─────────────────────────────────────────────
    /**
     * Start the live AI attendance session.
     * Instructs the Flask backend to spawn face_recognition_system.py as a subprocess.
     * POST /start_attendance
     *
     * @returns {{ ok, data: { message }, error }}
     *
     * @example
     * const { ok, error } = await EduTrackAPI.startAttendanceSession();
     * if (!ok) Swal.fire('Error', error, 'error');
     */
    async function startAttendanceSession() {
        return await _request('/start_attendance', { method: 'POST' });
    }

    /**
     * Stop the live AI attendance session.
     * Instructs Flask to terminate the running OpenCV camera subprocess.
     * POST /stop_attendance
     *
     * @returns {{ ok, data: { message }, error }}
     *
     * @example
     * const { ok } = await EduTrackAPI.stopAttendanceSession();
     */
    async function stopAttendanceSession() {
        return await _request('/stop_attendance', { method: 'POST' });
    }

    // ─────────────────────────────────────────────
    // VIDEO FEED
    // ─────────────────────────────────────────────
    /**
     * Returns the absolute URL for the live MJPEG video stream.
     * Use this directly as the `src` attribute on an <img> tag — do NOT fetch it as JSON.
     * The stream is served by Flask using multipart/x-mixed-replace.
     * GET /video_feed
     *
     * @returns {string} — The full URL to the live streaming endpoint.
     *
     * @example
     * document.getElementById('videoFeed').src = EduTrackAPI.getVideoFeedURL();
     */
    function getVideoFeedURL() {
        return `${BASE_URL}/video_feed`;
    }

    // ─────────────────────────────────────────────
    // STUDENT ENROLLMENT
    // ─────────────────────────────────────────────
    /**
     * Enroll a new student into the system.
     * Uploads their profile data and optional dataset images to Firestore.
     * POST /enroll_student
     *
     * Accepts a FormData object (for file uploads) OR a plain JSON object (no images).
     * If passing FormData, the Content-Type header will be excluded so the browser
     * can set the correct multipart/form-data boundary automatically.
     *
     * @param {FormData|object} payload - Student data (roll_number, name, class) + optional image files
     * @returns {{ ok, data: { message, roll_number }, error }}
     *
     * @example — JSON-only enrollment:
     * const result = await EduTrackAPI.enrollStudent({
     *   roll_number: 'CS2024001',
     *   name: 'Jane Doe',
     *   class: 'Computer Science - 3rd Year'
     * });
     *
     * @example — With image files (from a file input):
     * const form = new FormData();
     * form.append('roll_number', 'CS2024001');
     * form.append('name', 'Jane Doe');
     * form.append('class', 'CS - 3rd Year');
     * form.append('image', fileInputElement.files[0]);
     * const result = await EduTrackAPI.enrollStudent(form);
     */
    async function enrollStudent(payload) {
        const isFormData = payload instanceof FormData;

        return await _request('/enroll_student', {
            method: 'POST',
            // For file uploads, do NOT set `Content-Type` — the browser sets the boundary.
            headers: isFormData ? { Accept: 'application/json' } : { ...DEFAULT_HEADERS },
            body: isFormData ? payload : JSON.stringify(payload)
        });
    }

    // ─────────────────────────────────────────────
    // OPTIONAL: UI Loading State Helpers
    // ─────────────────────────────────────────────
    /**
     * Sets a button into a loading state with a spinner and custom text.
     * @param {HTMLElement} btn - The button element
     * @param {string} loadingText - Text to display while loading
     */
    function setButtonLoading(btn, loadingText = 'Loading...') {
        btn._originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-current inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            ${loadingText}`;
    }

    /**
     * Resets a button from its loading state back to its original HTML.
     * @param {HTMLElement} btn - The button element
     */
    function resetButton(btn) {
        btn.disabled = false;
        btn.innerHTML = btn._originalHTML || 'Submit';
    }

    // ─────────────────────────────────────────────
    // PUBLIC API SURFACE
    // ─────────────────────────────────────────────
    return {
        // Auth
        loginUser,

        // Data
        getStudents,
        getAttendanceLogs,
        getAnalytics,

        // Session Control
        startAttendanceSession,
        stopAttendanceSession,

        // Video Feed
        getVideoFeedURL,

        // Enrollment
        enrollStudent,

        // UI Helpers
        setButtonLoading,
        resetButton
    };

})();
