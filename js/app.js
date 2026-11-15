
/* ==========================================================
   COMPLEXE SCOLAIRE RIVIERA II — MOTEUR D'APPLICATION V4.0
   Gestion Complète de l'Emploi du Temps + Temps Réel + Persistance
   ========================================================== */

const SUPABASE_URL = "https://crxcaaghkmhrpgoxkrar.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Uy1ohUaZeyKNhJixDUbOEw_X3BHv1UZ";

// 1. Initialisation sécurisée du client Supabase
let db = null;
try {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn("Client Supabase initialisé en mode sécurisé local :", e);
}

// 2. Constantes d'emploi du temps
const TIMETABLE_SLOTS = [
  "07:00 - 08:55",
  "09:00 - 10:55",
  "11:10 - 12:05",
  "14:30 - 16:25",
  "16:30 - 17:25"
];
const TIMETABLE_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// 3. État central réactif de l'établissement
const APP_STATE = {
  academicYear: "2026-2027",
  currentTrimester: "1er Trimestre",
  currentUser: null,
  isOnline: navigator.onLine,
  offlineQueue: JSON.parse(localStorage.getItem("riviera_offline_queue") || "[]"),
  trimestersConfig: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_trimesters");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [
      { id: 1, name: "1er Trimestre", start: "2026-09-15", end: "2026-12-18", closed: false },
      { id: 2, name: "2ème Trimestre", start: "2027-01-05", end: "2027-04-09", closed: false },
      { id: 3, name: "3ème Trimestre", start: "2027-04-20", end: "2027-07-02", closed: false }
    ];
  })(),
  allowProfBulletinPrint: localStorage.getItem("riviera_allow_prof_bulletin") === "true",
  classes: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_classes");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return ["6e", "5e", "4e", "3e"];
  })(),
  subjects: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_subjects");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [
      { name: "Français", coef: 4 },
      { name: "Mathématiques", coef: 4 },
      { name: "Anglais", coef: 3 },
      { name: "Histoire-Géographie", coef: 2 },
      { name: "SVT", coef: 2 },
      { name: "Physique-Chimie", coef: 2 },
      { name: "EPS", coef: 1 },
      { name: "Éducation civique", coef: 1 }
    ];
  })(),
  teachers: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_teachers");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [
      { id: 1, name: "M. Camara", access_code: "prof123", subjects: "Mathématiques", classes: "6e" },
      { id: 2, name: "Mme Sow", access_code: "prof123", subjects: "Français", classes: "6e" },
      { id: 3, name: "Mme Brown", access_code: "prof123", subjects: "Anglais", classes: "6e" },
      { id: 4, name: "M. Diop", access_code: "prof123", subjects: "Histoire-Géographie", classes: "6e" },
      { id: 5, name: "Mme Fall", access_code: "prof123", subjects: "SVT", classes: "6e" },
      { id: 6, name: "M. Ndiaye", access_code: "prof123", subjects: "Physique-Chimie", classes: "6e" },
      { id: 7, name: "M. Bah", access_code: "prof123", subjects: "EPS", classes: "6e" },
      { id: 8, name: "Mme Sy", access_code: "prof123", subjects: "Éducation civique", classes: "6e" }
    ];
  })(),
  students: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_students");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [
      { id: 1, matricule: "M2026001", lastName: "KONÉ", firstName: "Aminata", sex: "Féminin", dob: "12 mars 2014", pob: "Lomé", class: "6e", status: "Passant", decision: "Admis(e)" },
      { id: 2, matricule: "M2026002", lastName: "LAWSON", firstName: "Koffi", sex: "Masculin", dob: "05 juillet 2013", pob: "Aného", class: "6e", status: "Passant", decision: "Admis(e)" },
      { id: 3, matricule: "M2026003", lastName: "AGBOVI", firstName: "Akouvi", sex: "Féminin", dob: "18 septembre 2014", pob: "Kpalimé", class: "6e", status: "Passant", decision: "Admis(e)" },
      { id: 4, matricule: "M2026004", lastName: "MENSAH", firstName: "Kodjo", sex: "Masculin", dob: "22 janvier 2014", pob: "Lomé", class: "6e", status: "Passant", decision: "Admis(e)" },
      { id: 5, matricule: "M2026005", lastName: "ADOTEVI", firstName: "Mawuli", sex: "Masculin", dob: "14 août 2013", pob: "Tsévié", class: "6e", status: "Passant", decision: "Admis(e)" },
      { id: 6, matricule: "M2026006", lastName: "DOSSOU", firstName: "Enyonam", sex: "Féminin", dob: "30 novembre 2014", pob: "Lomé", class: "6e", status: "Passant", decision: "Admis(e)" }
    ];
  })(),
  timetables: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_timetables");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  })(),
  // CHARGEMENT HORS-LIGNE INSTANTANÉ DE TOUTES LES NOTES
  grades: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_grades");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  })(),
  // CHARGEMENT HORS-LIGNE INSTANTANÉ DES ABSENCES
  attendance: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_attendance");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  })(),
  // CHARGEMENT HORS-LIGNE INSTANTANÉ DES ÉVALUATIONS
  evaluations: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_evaluations");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  })(),
  // CHARGEMENT HORS-LIGNE INSTANTANÉ DES DÉROGATIONS
  derogations: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_derogations");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  })(),
  evalRequests: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_eval_requests");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  })(),
  announcements: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_announcements");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  })(),
  notifications: (() => {
    try {
      const cached = localStorage.getItem("riviera_cached_notifications");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  })(),
  calendarDate: new Date(),
  sortAscending: true,
  adminAccessCode: localStorage.getItem("riviera_admin_code") || "admin123"
};

// ==========================================================
// FONCTION MAÎTRESSE : RAFRAÎCHISSEMENT GLOBAL IMMÉDIAT
// ==========================================================
function refreshUI() {
  renderAllTables();
  renderCalendar();
  renderNotifications();
  populateAuthUserSelect();
  populateSelectDropdowns();
  populateBulletinStudentDropdown();
  renderAdminTimetable();

  const kpiStd = document.getElementById("kpi-total-students");
  if (kpiStd) kpiStd.textContent = APP_STATE.students.length;
  const kpiTch = document.getElementById("kpi-total-teachers");
  if (kpiTch) kpiTch.textContent = APP_STATE.teachers.length;

  if (APP_STATE.currentUser?.role === "teacher") {
    updateTeacherViews();
    renderTeacherTimetable();
  }
}

// ==========================================================
// INITIALISATION AU CHARGEMENT DU DOM
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  setupNetworkListeners();
  setupAuthentication();
  setupPasswordVisibilityToggles();
  setupNavigation();
  setupSidebarToggle();
  setupGlobalModalCloses();
  setupActionMenusGlobalClose();
  setupExcelImport();
  setupInlineRowAdditions();
  setupStudentFilters();
  setupTeacherAssignmentsModal();
  setupCalendarSystem();
  setupTimetableSystem();
  setupTeacherGradeSection();
  setupTeacherEvaluationPrep();
  setupTeacherDerogations();
  setupTeacherAttendanceForm();
  setupPasswordModals();
  setupAnnouncementSystem();
  setupAdminGradesViewFilter();
  setupTrimesterSettings();
  setupBackupAndRestore();
  setupPrintButtons();
  setupBulletinFilters();

  detectActiveTrimester();
  refreshUI();

  loadAllDataFromSupabase();
  subscribeToSupabaseRealtime();

  if (navigator.onLine) flushOfflineQueue();

  checkAuto12hEvaluations();
  setInterval(checkAuto12hEvaluations, 60000);
});

// ==========================================================
// RÉSEAU ET FILE HORS-LIGNE (SYNCHRONISATION COMPLÈTE)
// ==========================================================
let isFlushingQueue = false;

function ensureSupabaseClient() {
  if (!db && window.supabase && typeof window.supabase.createClient === "function") {
    try {
      db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {}
  }
  return db;
}

function setupNetworkListeners() {
  window.addEventListener("online", () => {
    APP_STATE.isOnline = true;
    updateNetworkIndicator(true);
    flushOfflineQueue();
  });
  window.addEventListener("offline", () => {
    APP_STATE.isOnline = false;
    updateNetworkIndicator(false);
  });

  // Permet de cliquer sur le badge "X en attente" pour forcer la synchro ou débloquer une erreur
  const queueBadge = document.getElementById("offline-queue-badge");
  if (queueBadge) {
    queueBadge.style.cursor = "pointer";
    queueBadge.addEventListener("click", () => {
      if (!navigator.onLine) {
        alert("Vous êtes actuellement hors ligne. La synchronisation se fera automatiquement dès le retour d'Internet.");
      } else {
        flushOfflineQueue(true);
      }
    });
  }

  updateNetworkIndicator(navigator.onLine);
}

function updateNetworkIndicator(online) {
  const badge = document.getElementById("sync-status-badge");
  const text = document.getElementById("sync-status-text");
  const queueBadge = document.getElementById("offline-queue-badge");

  if (!badge || !text) return;
  if (online) {
    badge.className = "sync-indicator online";
    text.textContent = "En direct";
  } else {
    badge.className = "sync-indicator offline";
    text.textContent = "Hors ligne";
  }

  if (queueBadge) {
    if (APP_STATE.offlineQueue.length > 0) {
      queueBadge.textContent = `${APP_STATE.offlineQueue.length} en attente`;
      queueBadge.classList.remove("d-none");
    } else {
      queueBadge.classList.add("d-none");
    }
  }
}

function queueOfflineAction(actionType, payload) {
  APP_STATE.offlineQueue.push({ actionType, payload, timestamp: Date.now() });
  localStorage.setItem("riviera_offline_queue", JSON.stringify(APP_STATE.offlineQueue));
  updateNetworkIndicator(APP_STATE.isOnline);
}

async function flushOfflineQueue(isManualTrigger = false) {
  ensureSupabaseClient();
  if (isFlushingQueue || !db || !navigator.onLine || APP_STATE.offlineQueue.length === 0) return;

  isFlushingQueue = true;
  const queue = [...APP_STATE.offlineQueue];
  APP_STATE.offlineQueue = [];
  localStorage.removeItem("riviera_offline_queue");

  const remainingQueue = [];
  let syncedCount = 0;
  let lastErrorMsg = "";

  for (const item of queue) {
    try {
      let reqError = null;

      // 1. NOTES
      if (item.actionType === "UPSERT_GRADE") {
        const { error } = await db.from("grades").upsert(item.payload, { onConflict: "student_matricule,subject_name,trimester" });
        reqError = error;
      }
      // 2. ABSENCES
      else if (item.actionType === "INSERT_ATTENDANCE") {
        const { error } = await db.from("attendance").insert([item.payload]);
        reqError = error;
      }
      // 3. DÉROGATIONS
      else if (item.actionType === "INSERT_DEROG") {
        const { error } = await db.from("derogations").insert([item.payload]);
        reqError = error;
      } else if (item.actionType === "UPDATE_DEROG") {
        const { id, ...fields } = item.payload;
        const { error } = await db.from("derogations").update(fields).eq("id", id);
        reqError = error;
      }
      // 4. ÉVALUATIONS (DEMANDES & CALENDRIER)
      else if (item.actionType === "INSERT_EVAL") {
        const { error } = await db.from("eval_requests").insert([item.payload]);
        reqError = error;
      } else if (item.actionType === "UPDATE_EVAL_REQ") {
        const { id, ...fields } = item.payload;
        const { error } = await db.from("eval_requests").update(fields).eq("id", id);
        reqError = error;
      } else if (item.actionType === "INSERT_CALENDAR_EVAL") {
        const { error } = await db.from("evaluations").insert([item.payload]);
        reqError = error;
      } else if (item.actionType === "DELETE_CALENDAR_EVAL") {
        const { error } = await db.from("evaluations").delete().eq("id", item.payload.id);
        reqError = error;
      }
      // 5. ANNONCES & COMMUNIQUÉS
      else if (item.actionType === "INSERT_ANNOUNCEMENT") {
        const { error } = await db.from("announcements").insert([item.payload]);
        reqError = error;
      } else if (item.actionType === "DELETE_ANNOUNCEMENT") {
        const { error } = await db.from("announcements").delete().eq("id", item.payload.id);
        reqError = error;
      }
      // 6. ÉLÈVES
      else if (item.actionType === "INSERT_STUDENT") {
        const { error } = await db.from("students").insert([item.payload]);
        reqError = error;
      } else if (item.actionType === "UPDATE_STUDENT") {
        const origMat = item.payload.originalMatricule || item.payload.matricule;
        const { originalMatricule, ...fields } = item.payload;
        const { error } = await db.from("students").update(fields).eq("matricule", origMat);
        reqError = error;
      } else if (item.actionType === "DELETE_STUDENT") {
        const { error } = await db.from("students").delete().eq("matricule", item.payload.matricule);
        reqError = error;
      }
      // 7. PROFESSEURS
      else if (item.actionType === "INSERT_TEACHER") {
        const { error } = await db.from("teachers").insert([item.payload]);
        reqError = error;
      } else if (item.actionType === "UPDATE_TEACHER") {
        const { id, ...fields } = item.payload;
        const { error } = await db.from("teachers").update(fields).eq("id", id);
        reqError = error;
      } else if (item.actionType === "DELETE_TEACHER") {
        const { error } = await db.from("teachers").delete().eq("id", item.payload.id);
        reqError = error;
      }
      // 8. EMPLOIS DU TEMPS
      else if (item.actionType === "INSERT_TIMETABLE") {
        const { error } = await db.from("timetables").insert([item.payload]);
        reqError = error;
      } else if (item.actionType === "UPDATE_TIMETABLE") {
        const { id, ...fields } = item.payload;
        const { error } = await db.from("timetables").update(fields).eq("id", id);
        reqError = error;
      } else if (item.actionType === "DELETE_TIMETABLE") {
        const { error } = await db.from("timetables").delete().eq("id", item.payload.id);
        reqError = error;
      }
      // 9. CLASSES, MATIÈRES & TRIMESTRES
      else if (item.actionType === "INSERT_CLASS") {
        const { error } = await db.from("classes").insert([item.payload]);
        reqError = error;
      } else if (item.actionType === "UPDATE_CLASS") {
        const { error } = await db.from("classes").update({ name: item.payload.newName }).eq("name", item.payload.oldName);
        reqError = error;
      } else if (item.actionType === "DELETE_CLASS") {
        const { error } = await db.from("classes").delete().eq("name", item.payload.name);
        reqError = error;
      } else if (item.actionType === "INSERT_SUBJECT") {
        const { error } = await db.from("subjects").insert([item.payload]);
        reqError = error;
      } else if (item.actionType === "UPDATE_SUBJECT") {
        const { error } = await db.from("subjects").update({ name: item.payload.newName, default_coef: item.payload.default_coef }).eq("name", item.payload.oldName);
        reqError = error;
      } else if (item.actionType === "DELETE_SUBJECT") {
        const { error } = await db.from("subjects").delete().eq("name", item.payload.name);
        reqError = error;
      } else if (item.actionType === "UPSERT_TRIMESTER") {
        const { error } = await db.from("trimesters_config").upsert(item.payload);
        reqError = error;
      }

      if (reqError) {
        console.warn(`⚠️ Échec sur ${item.actionType} :`, reqError);
        lastErrorMsg = reqError.message || "Erreur base de données";
        remainingQueue.push(item);
      } else {
        syncedCount++;
      }
    } catch (err) {
      lastErrorMsg = err.message || "Erreur réseau";
      remainingQueue.push(item);
    }
  }

  APP_STATE.offlineQueue = [...remainingQueue, ...APP_STATE.offlineQueue];
  if (APP_STATE.offlineQueue.length > 0) {
    localStorage.setItem("riviera_offline_queue", JSON.stringify(APP_STATE.offlineQueue));
  } else {
    localStorage.removeItem("riviera_offline_queue");
  }

  isFlushingQueue = false;
  updateNetworkIndicator(navigator.onLine);

  if (syncedCount > 0 && navigator.onLine) {
    loadAllDataFromSupabase();
  }

  if (isManualTrigger) {
    if (APP_STATE.offlineQueue.length === 0) {
      alert("✅ Synchronisation terminée avec succès !");
    } else if (lastErrorMsg) {
      if (confirm(`⚠️ Une opération en attente est bloquée par Supabase :\n"${lastErrorMsg}"\n\nVoulez-vous vider cette file d'attente bloquée ?`)) {
        APP_STATE.offlineQueue = [];
        localStorage.removeItem("riviera_offline_queue");
        updateNetworkIndicator(navigator.onLine);
      }
    }
  }
}

setInterval(() => {
  if (navigator.onLine && APP_STATE.offlineQueue && APP_STATE.offlineQueue.length > 0) {
    flushOfflineQueue();
  }
}, 10000);

// ==========================================================
// AUTHENTIFICATION
// ==========================================================
function setupAuthentication() {
  const form = document.getElementById("form-login");
  const btnLogin = document.getElementById("btn-login");
  const userSelect = document.getElementById("login-user-select");
  const passwordInput = document.getElementById("login-password");
  const errorMsg = document.getElementById("auth-error-msg");

  const authWrapper = document.getElementById("view-auth");
  const appLayout = document.getElementById("app-layout");
  const userDisplayName = document.getElementById("user-display-name");
  const userDisplayRole = document.getElementById("user-display-role");
  const navAdmin = document.getElementById("nav-group-admin");
  const navTeacher = document.getElementById("nav-group-teacher");

  // Vider le champ de mot de passe au démarrage
  if (passwordInput) {
    passwordInput.value = "";
  }

  populateAuthUserSelect();

  const handleLogin = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const selectedVal = userSelect ? userSelect.value : "Direction";
    const pwd = passwordInput ? passwordInput.value.trim() : "";
    if (errorMsg) errorMsg.textContent = "";

    if (!pwd) {
      if (errorMsg) errorMsg.textContent = "Veuillez entrer votre code d'accès.";
      return;
    }

    // 1. CONNEXION DIRECTION (ADMINISTRATEUR)
    if (selectedVal === "Direction") {
      const activeAdminCode = APP_STATE.adminAccessCode || "admin123";

      // SEUL LE CODE ACTUEL EST ACCEPTÉ (L'ANCIEN CODE EST REJETÉ)
      if (pwd === activeAdminCode) {
        APP_STATE.currentUser = { role: "admin", name: "Direction" };
        if (userDisplayName) userDisplayName.textContent = "Direction";
        if (userDisplayRole) userDisplayRole.textContent = "Admin";
        if (navAdmin) navAdmin.classList.remove("d-none");
        if (navTeacher) navTeacher.classList.add("d-none");
        switchSection("section-admin-dashboard");
        if (authWrapper) authWrapper.classList.add("d-none");
        if (appLayout) appLayout.classList.remove("d-none");
        if (passwordInput) passwordInput.value = "";
        resetPasswordInputsVisibility();
        renderNotifications();
        renderAnnouncements();
        return;
      } else {
        if (errorMsg) errorMsg.textContent = "Code d'accès Direction incorrect.";
        return;
      }
    }

    // 2. CONNEXION PROFESSEUR
    const teacher = APP_STATE.teachers.find(t => String(t.id) === String(selectedVal) || t.name === selectedVal);
    if (teacher) {
      const activeTeacherCode = teacher.access_code || "prof123";

      // SEUL LE CODE ACTUEL DU PROFESSEUR EST ACCEPTÉ
      if (pwd === activeTeacherCode) {
        APP_STATE.currentUser = { role: "teacher", id: teacher.id, name: teacher.name, teacherObj: teacher };
        if (userDisplayName) userDisplayName.textContent = teacher.name;
        if (userDisplayRole) userDisplayRole.textContent = "Professeur";
        const welcomeEl = document.getElementById("teacher-dashboard-welcome");
        if (welcomeEl) welcomeEl.textContent = teacher.name;
        if (navAdmin) navAdmin.classList.add("d-none");
        if (navTeacher) navTeacher.classList.remove("d-none");
        updateTeacherBulletinNavVisibility();
        switchSection("section-teacher-dashboard");
        if (authWrapper) authWrapper.classList.add("d-none");
        if (appLayout) appLayout.classList.remove("d-none");
        if (passwordInput) passwordInput.value = "";
        populateTeacherSelectors(teacher);
        updateTeacherDashboardKPIs();
        renderTeacherTimetable();
        renderTeacherEvalRequests();
        renderTeacherDerogations();
        calculateTeacherStats();
        renderNotifications();
        renderAnnouncements();
        return;
      } else {
        if (errorMsg) errorMsg.textContent = "Code d'accès incorrect.";
        return;
      }
    }

    if (errorMsg) errorMsg.textContent = "Compte introuvable.";
  };

  if (form) form.addEventListener("submit", handleLogin);
  if (btnLogin) btnLogin.addEventListener("click", handleLogin);

  // Déconnexion propre
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    APP_STATE.currentUser = null;
    if (passwordInput) passwordInput.value = "";
    resetPasswordInputsVisibility();
    if (errorMsg) errorMsg.textContent = "";
    if (appLayout) appLayout.classList.add("d-none");
    if (authWrapper) authWrapper.classList.remove("d-none");
  });
}

function populateAuthUserSelect() {
  const sel = document.getElementById("login-user-select");
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = `<option value="Direction">👑 Direction (Administrateur)</option>` +
    APP_STATE.teachers.map(t => `<option value="${t.id}">👨‍🏫 ${t.name} (${t.subjects || 'Général'})</option>`).join("");
  if (currentVal) sel.value = currentVal;
}

function updateTeacherBulletinNavVisibility() {
  const tab = document.getElementById("tab-teacher-bulletins");
  if (!tab) return;
  if (APP_STATE.allowProfBulletinPrint) tab.classList.remove("d-none");
  else tab.classList.add("d-none");
}

// ==========================================================
// CHARGEMENT & SYNCHRONISATION SUPABASE
// ==========================================================
async function loadAllDataFromSupabase() {
  if (!db) return;
  try {
    const [
      clsRes,
      subRes,
      tchRes,
      stdRes,
      grdRes,
      evRes,
      evReqRes,
      derRes,
      ttRes,
      annRes,
      notifRes,
      trimRes,
      attRes
    ] = await Promise.all([
      db.from("classes").select("name").order("id", { ascending: true }),
      db.from("subjects").select("name, default_coef").order("id", { ascending: true }),
      db.from("teachers").select("id, name, access_code, subjects, classes").order("id", { ascending: true }),
      db.from("students").select("*").order("matricule", { ascending: true }),
      db.from("grades").select("*"),
      db.from("evaluations").select("*").order("eval_date", { ascending: true }),
      db.from("eval_requests").select("*").order("created_at", { ascending: false }),
      db.from("derogations").select("*").order("created_at", { ascending: false }),
      db.from("timetables").select("*"),
      db.from("announcements").select("*").order("created_at", { ascending: false }),
      db.from("notifications").select("*").eq("is_read", false).order("created_at", { ascending: false }),
      db.from("trimesters_config").select("*"),
      db.from("attendance").select("*").order("date", { ascending: false })
    ]);

    if (clsRes.data?.length) {
      APP_STATE.classes = clsRes.data.map(c => c.name);
      try { localStorage.setItem("riviera_cached_classes", JSON.stringify(APP_STATE.classes)); } catch (e) {}
    }
    if (subRes.data?.length) {
      APP_STATE.subjects = subRes.data.map(s => ({ name: s.name, coef: s.default_coef }));
      try { localStorage.setItem("riviera_cached_subjects", JSON.stringify(APP_STATE.subjects)); } catch (e) {}
    }

    if (tchRes.data && !tchRes.error && tchRes.data.length > 0) {
      APP_STATE.teachers = tchRes.data;
      try { localStorage.setItem("riviera_cached_teachers", JSON.stringify(APP_STATE.teachers)); } catch (e) {}
    }

    if (stdRes.data && !stdRes.error && stdRes.data.length > 0) {
      APP_STATE.students = stdRes.data.map(s => ({
        id: s.id,
        matricule: s.matricule,
        lastName: s.last_name,
        firstName: s.first_name,
        sex: s.gender,
        dob: s.dob || "12 mars 2014",
        pob: s.pob || "Lomé",
        class: s.class_name || "6e",
        status: s.status || "Passant",
        decision: s.counsel_decision || "Admis(e)"
      }));
      try { localStorage.setItem("riviera_cached_students", JSON.stringify(APP_STATE.students)); } catch (e) {}
    }

    if (ttRes.data && !ttRes.error && Array.isArray(ttRes.data) && ttRes.data.length > 0) {
      APP_STATE.timetables = ttRes.data;
      try { localStorage.setItem("riviera_cached_timetables", JSON.stringify(APP_STATE.timetables)); } catch (e) {}
    }

    if (grdRes.data) {
      APP_STATE.grades = grdRes.data;
      try { localStorage.setItem("riviera_cached_grades", JSON.stringify(APP_STATE.grades)); } catch (e) {}
    }

    if (attRes.data && !attRes.error) {
      APP_STATE.attendance = attRes.data;
      try { localStorage.setItem("riviera_cached_attendance", JSON.stringify(APP_STATE.attendance)); } catch (e) {}
    }

    if (evRes.data) {
      APP_STATE.evaluations = evRes.data;
      try { localStorage.setItem("riviera_cached_evaluations", JSON.stringify(APP_STATE.evaluations)); } catch (e) {}
    }

    // FUSION SÉCURISÉE DES DEMANDES D'ÉVALUATION (LES DÉCISIONS ACCEPTÉES/REFUSÉES NE PEUVENT JAMAIS ÊTRE ÉCRASÉES)
    if (evReqRes.data) {
      let cachedEvals = [];
      try { cachedEvals = JSON.parse(localStorage.getItem("riviera_cached_eval_requests") || "[]"); } catch (e) {}

      APP_STATE.evalRequests = evReqRes.data.map(remote => {
        const local = cachedEvals.find(l =>
          String(l.id) === String(remote.id) ||
          (l.teacher_name === remote.teacher_name && l.eval_date === remote.eval_date && l.title === remote.title)
        );
        if (local && (local.status === "ACCEPTE" || local.status === "REFUSE")) {
          return { ...remote, status: local.status, refusal_reason: local.refusal_reason };
        }
        return remote;
      });
      try { localStorage.setItem("riviera_cached_eval_requests", JSON.stringify(APP_STATE.evalRequests)); } catch (e) {}
    }

    // FUSION SÉCURISÉE DES DÉROGATIONS (PRÉSERVATION ABSOLUE DU STATUT ACCEPTÉ OU REFUSÉ)
    if (derRes.data) {
      let cachedDerogs = [];
      try { cachedDerogs = JSON.parse(localStorage.getItem("riviera_cached_derogations") || "[]"); } catch (e) {}

      APP_STATE.derogations = derRes.data.map(remote => {
        const local = cachedDerogs.find(l =>
          String(l.id) === String(remote.id) ||
          (l.teacher_name === remote.teacher_name && l.event_date === remote.event_date && l.reason === remote.reason)
        );
        if (local && (local.status === "ACCEPTE" || local.status === "REFUSE")) {
          return { ...remote, status: local.status, refusal_reason: local.refusal_reason };
        }
        return remote;
      });
      try { localStorage.setItem("riviera_cached_derogations", JSON.stringify(APP_STATE.derogations)); } catch (e) {}
    }

    if (annRes.data) {
      APP_STATE.announcements = annRes.data;
      try { localStorage.setItem("riviera_cached_announcements", JSON.stringify(APP_STATE.announcements)); } catch (e) {}
    }
    if (notifRes.data) {
      APP_STATE.notifications = notifRes.data;
      try { localStorage.setItem("riviera_cached_notifications", JSON.stringify(APP_STATE.notifications)); } catch (e) {}
    }

    if (trimRes.data?.length) {
      let cachedTrims = [];
      try { cachedTrims = JSON.parse(localStorage.getItem("riviera_cached_trimesters") || "[]"); } catch (e) {}

      APP_STATE.trimestersConfig = trimRes.data.map(remote => {
        const local = cachedTrims.find(l => l.id === remote.id);
        return {
          ...remote,
          closed: local && local.closed !== undefined ? local.closed : Boolean(remote.closed)
        };
      });
      try { localStorage.setItem("riviera_cached_trimesters", JSON.stringify(APP_STATE.trimestersConfig)); } catch (e) {}
    }

    detectActiveTrimester();
    refreshUI();
    updateNetworkIndicator(true);
  } catch (err) {
    console.warn("Mode local actif :", err);
    updateNetworkIndicator(false);
  }
}

// TEMPS RÉEL SUPABASE COMPLET (AVEC IMPACT IMMÉDIAT SUR EMPLOI DU TEMPS)
function subscribeToSupabaseRealtime() {
  if (!db) return;
  db.channel("school-sync-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "timetables" }, async () => {
      const { data, error } = await db.from("timetables").select("*");
      if (!error && Array.isArray(data) && data.length > 0) {
        APP_STATE.timetables = data;
        try { localStorage.setItem("riviera_cached_timetables", JSON.stringify(APP_STATE.timetables)); } catch (e) {}
        renderAdminTimetable();
        renderTeacherTimetable();
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "students" }, async () => {
      const { data } = await db.from("students").select("*").order("matricule", { ascending: true });
      if (data) {
        APP_STATE.students = data.map(s => ({
          id: s.id,
          matricule: s.matricule,
          lastName: s.last_name,
          firstName: s.first_name,
          sex: s.gender,
          dob: s.dob || "12 mars 2014",
          pob: s.pob || "Lomé",
          class: s.class_name || "6e",
          status: s.status || "Passant",
          decision: s.counsel_decision || "Admis(e)"
        }));
        try { localStorage.setItem("riviera_cached_students", JSON.stringify(APP_STATE.students)); } catch (e) {}
        refreshUI();
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "teachers" }, async () => {
      const { data } = await db.from("teachers").select("*").order("id", { ascending: true });
      if (data) {
        APP_STATE.teachers = data;
        try { localStorage.setItem("riviera_cached_teachers", JSON.stringify(APP_STATE.teachers)); } catch (e) {}
        refreshUI();
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "grades" }, async () => {
      const { data } = await db.from("grades").select("*");
      if (data) {
        APP_STATE.grades = data;
        try { localStorage.setItem("riviera_cached_grades", JSON.stringify(APP_STATE.grades)); } catch (e) {}
        renderAdminGradesView();
        const curMat = document.getElementById("bulletin-select-student")?.value;
        if (curMat) loadBulletinForStudent(curMat);
        calculateTeacherStats();
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, async () => {
      const { data, error } = await db.from("attendance").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        APP_STATE.attendance = data;
        try { localStorage.setItem("riviera_cached_attendance", JSON.stringify(data)); } catch (e) {}
        renderAttendanceTable();
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "derogations" }, async () => {
      console.log("⚡ Événement Dérogation détecté en direct !");
      const { data, error } = await db.from("derogations").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        APP_STATE.derogations = data;
        try { localStorage.setItem("riviera_cached_derogations", JSON.stringify(data)); } catch (e) {}
        renderAdminPendingRequests();
        renderTeacherDerogations();
        renderDashboardPendingDerogations();
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "eval_requests" }, async () => {
      const { data, error } = await db.from("eval_requests").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        APP_STATE.evalRequests = data;
        renderAdminPendingRequests();
        renderTeacherEvalRequests();
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, async () => {
      const { data } = await db.from("notifications").select("*").eq("is_read", false).order("created_at", { ascending: false });
      if (data) {
        APP_STATE.notifications = data;
        renderNotifications();
      }
    })
    .subscribe();
}

// Écoute automatique et instantanée des modifications entre fenêtres et onglets (SANS ACTUALISATION)
try {
  const syncChannel = new BroadcastChannel("riviera_school_sync");
  syncChannel.onmessage = (event) => {
    if (event.data?.type === "NEW_APP_NOTIFICATION") {
      if (event.data.notif) {
        APP_STATE.notifications.unshift(event.data.notif);
        try {
          localStorage.setItem("riviera_cached_notifications", JSON.stringify(APP_STATE.notifications));
        } catch (e) {}
      }
      renderNotifications();
    }
    if (event.data?.type === "TRIMESTER_LOCK_CHANGED") {
      console.log("⚡ Signal de clôture reçu en direct :", event.data);
      const cached = localStorage.getItem("riviera_cached_trimesters");
      if (cached) {
        APP_STATE.trimestersConfig = JSON.parse(cached);
      }
      detectActiveTrimester();
      filterTeacherGrades();
      }
      if (event.data?.type === "NEW_ANNOUNCEMENT" || event.data?.type === "DELETE_ANNOUNCEMENT") {
      const cached = localStorage.getItem("riviera_cached_announcements");
      if (cached) {
        APP_STATE.announcements = JSON.parse(cached);
      }
      renderAnnouncements();
      renderNotifications();
    
    }
  };
} catch (e) {}

window.addEventListener("storage", (event) => {
  if (event.key === "riviera_cached_timetables" && event.newValue) {
    try {
      APP_STATE.timetables = JSON.parse(event.newValue);
      renderAdminTimetable();
      renderTeacherTimetable();
    } catch (e) {}
  }
  // Réaction instantanée si le statut des trimestres change
  if (event.key === "riviera_cached_trimesters" || event.key === "riviera_locked_trimesters") {
    try {
      if (event.key === "riviera_cached_trimesters" && event.newValue) {
        APP_STATE.trimestersConfig = JSON.parse(event.newValue);
      }
      detectActiveTrimester();
      filterTeacherGrades();
    } catch (e) {}
  }
});

// Synchronisation discrète toutes les 4 secondes
setInterval(async () => {
  if (db && navigator.onLine) {
    try {
      const { data, error } = await db.from("timetables").select("*");
      if (!error && Array.isArray(data) && data.length > 0) {
        if (JSON.stringify(data) !== JSON.stringify(APP_STATE.timetables)) {
          APP_STATE.timetables = data;
          localStorage.setItem("riviera_cached_timetables", JSON.stringify(data));
          renderAdminTimetable();
          renderTeacherTimetable();
        }
      }
    } catch (e) {}
  }
}, 4000);

function updateTeacherViews() {
  const curCls = document.getElementById("teacher-select-class")?.value || 
                 document.getElementById("teacher-classes-view-select")?.value || "6e";
  populateTeacherClassStudentsView(curCls);
  filterTeacherGrades();
  updateTeacherDashboardKPIs();
  calculateTeacherStats();
  renderTeacherTimetable();
}

// ==========================================================
// NAVIGATION & INTERFACE
// ==========================================================
function setupNavigation() {
  document.querySelectorAll(".sidebar-nav .nav-link").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      if (!target) return;
      document.querySelectorAll(".sidebar-nav .nav-link").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      switchSection(target);
      if (window.innerWidth <= 900) {
        document.getElementById("app-layout")?.classList.remove("sidebar-mobile-open");
      }
    });
  });
}

function switchSection(sectionId) {
  document.querySelectorAll(".content-section").forEach(sec => sec.classList.add("d-none"));
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove("d-none");
    if (sectionId === "section-admin-grades-view") renderAdminGradesView();
    if (sectionId === "section-admin-timetables") renderAdminTimetable();
    if (sectionId === "section-admin-derogations") renderAdminPendingRequests();
    if (sectionId === "section-teacher-timetable") renderTeacherTimetable();
  }
}

function setupSidebarToggle() {
  const layout = document.getElementById("app-layout");
  const toggleBtn = document.getElementById("btn-toggle-sidebar");

  toggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!layout) return;
    if (window.innerWidth <= 900) layout.classList.toggle("sidebar-mobile-open");
    else layout.classList.toggle("sidebar-hidden");
  });

  // Fermer le menu mobile si on tape à côté sur l'écran
  document.addEventListener("click", (e) => {
    if (!layout || !layout.classList.contains("sidebar-mobile-open")) return;
    if (!e.target.closest("#app-sidebar") && !e.target.closest("#btn-toggle-sidebar")) {
      layout.classList.remove("sidebar-mobile-open");
    }
  });

  // Fermer aussi avec la touche Échap ou si l'écran redevient grand
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") layout?.classList.remove("sidebar-mobile-open");
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) layout?.classList.remove("sidebar-mobile-open");
  });
}

function setupGlobalModalCloses() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.add("d-none"));
  });
}

function setupActionMenusGlobalClose() {
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".action-menu-container")) {
      document.querySelectorAll(".action-dropdown-menu").forEach(m => m.classList.remove("show"));
      document.querySelectorAll(".btn-action-dots").forEach(b => b.classList.remove("active"));
    }
  });
}

window.toggleActionMenu = function(menuId, event) {
  event.stopPropagation();
  const menu = document.getElementById(menuId);
  if (!menu) return;
  const isAlreadyOpen = menu.classList.contains("show");
  document.querySelectorAll(".action-dropdown-menu").forEach(m => m.classList.remove("show"));
  document.querySelectorAll(".btn-action-dots").forEach(b => b.classList.remove("active"));
  if (!isAlreadyOpen) {
    menu.classList.add("show");
    event.currentTarget.classList.add("active");
  }
};

// ==========================================================
// SYSTÈME DE L'EMPLOI DU TEMPS (MANIPULATION DIRECTE AU CLIC)
// ==========================================================
function setupTimetableSystem() {
  const modal = document.getElementById("modal-timetable-admin");
  const form = document.getElementById("form-admin-timetable");
  const viewModeSel = document.getElementById("admin-timetable-view-mode");
  const teacherFilterBox = document.getElementById("box-filter-admin-tt-teacher");
  const classFilterBox = document.getElementById("box-filter-admin-tt-class");
  const teacherSel = document.getElementById("admin-timetable-teacher-select");
  const classSel = document.getElementById("admin-timetable-class-select");
  const presetSlotSel = document.getElementById("tt-modal-slot-preset");
  const customHoursRow = document.getElementById("tt-custom-hours-row");

  // Bascule Mode Professeur / Mode Classe pour l'administrateur
  viewModeSel?.addEventListener("change", () => {
    const isTeacherMode = viewModeSel.value === "teacher";
    if (teacherFilterBox) teacherFilterBox.classList.toggle("d-none", !isTeacherMode);
    if (classFilterBox) classFilterBox.classList.toggle("d-none", isTeacherMode);
    renderAdminTimetable();
  });

  teacherSel?.addEventListener("change", renderAdminTimetable);
  classSel?.addEventListener("change", renderAdminTimetable);

  // Gestion des créneaux horaires dans la modale
  presetSlotSel?.addEventListener("change", (e) => {
    if (e.target.value === "custom") {
      if (customHoursRow) customHoursRow.style.display = "flex";
    } else {
      if (customHoursRow) customHoursRow.style.display = "none";
      const [start, end] = e.target.value.split("|");
      const startInp = document.getElementById("tt-modal-start");
      const endInp = document.getElementById("tt-modal-end");
      if (startInp) startInp.value = start;
      if (endInp) endInp.value = end;
    }
  });

  document.getElementById("btn-open-timetable-modal")?.addEventListener("click", () => {
    openTimetableModalForSlot("Lundi", "07:00 - 08:55", null);
  });

  document.getElementById("btn-close-timetable-modal")?.addEventListener("click", () => {
    modal?.classList.add("d-none");
  });

  document.getElementById("btn-delete-course-modal")?.addEventListener("click", async () => {
    const courseId = document.getElementById("tt-modal-id")?.value;
    if (!courseId) return;
    if (confirm("Confirmez-vous le retrait de ce cours de l'emploi du temps ?")) {
      await deleteTimetableCourse(courseId);
      modal?.classList.add("d-none");
    }
  });

  // Enregistrement (Création ou Modification d'un cours)
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const courseId = document.getElementById("tt-modal-id")?.value;
    const cls = document.getElementById("tt-modal-class").value;
    const day = document.getElementById("tt-modal-day").value;
    const start = document.getElementById("tt-modal-start").value;
    const end = document.getElementById("tt-modal-end").value;
    const sub = document.getElementById("tt-modal-subject").value;
    const teacher = document.getElementById("tt-modal-teacher").value;
    const warning = document.getElementById("tt-conflict-warning");

    // Détection rigoureuse des conflits d'horaires
    const conflict = APP_STATE.timetables.find(t => 
      String(t.id) !== String(courseId) &&
      t.day === day &&
      ((t.class_name === cls) || (t.teacher_name === teacher)) &&
      ((start >= t.start_time && start < t.end_time) || (end > t.start_time && end <= t.end_time))
    );

    if (conflict) {
      if (warning) {
        warning.textContent = `⚠️ Conflit d'horaire : ${conflict.teacher_name} ou la classe ${conflict.class_name} a déjà cours (${conflict.subject_name} : ${conflict.start_time}-${conflict.end_time}) !`;
        warning.classList.remove("d-none");
      }
      return;
    }
    if (warning) warning.classList.add("d-none");

    const payload = {
      class_name: cls,
      day: day,
      start_time: start,
      end_time: end,
      subject_name: sub,
      teacher_name: teacher
    };

    ensureSupabaseClient();
    if (courseId) {
      // Modification d'un cours existant
      const numericId = isNaN(courseId) ? courseId : Number(courseId);
      const idx = APP_STATE.timetables.findIndex(t => String(t.id) === String(courseId));
      if (idx !== -1) {
        APP_STATE.timetables[idx] = { ...APP_STATE.timetables[idx], ...payload };
      }

      if (db && navigator.onLine) {
        try {
          const { error } = await db.from("timetables").update(payload).eq("id", numericId);
          if (error && /fetch|network|offline|timeout/i.test(error.message || "")) {
            queueOfflineAction("UPDATE_TIMETABLE", { id: numericId, ...payload });
          } else if (error) {
            alert("⚠️ Erreur Supabase (modification cours) : " + error.message);
          }
        } catch (err) {
          queueOfflineAction("UPDATE_TIMETABLE", { id: numericId, ...payload });
        }
      } else {
        queueOfflineAction("UPDATE_TIMETABLE", { id: numericId, ...payload });
      }
    } else {
      // Création d'un nouveau cours
      let tempId = Date.now();
      if (db && navigator.onLine) {
        try {
          const { data, error } = await db.from("timetables").insert([payload]).select();
          if (error) {
            if (/fetch|network|offline|timeout/i.test(error.message || "")) {
              queueOfflineAction("INSERT_TIMETABLE", payload);
            } else {
              const { error: insErr } = await db.from("timetables").insert([payload]);
              if (insErr) {
                if (/fetch|network|offline|timeout/i.test(insErr.message || "")) {
                  queueOfflineAction("INSERT_TIMETABLE", payload);
                } else {
                  alert("⚠️ Erreur Supabase (ajout cours) : " + insErr.message);
                }
              }
            }
          } else if (data && data.length > 0) {
            tempId = data[0].id;
          }
        } catch (err) {
          queueOfflineAction("INSERT_TIMETABLE", payload);
        }
      } else {
        queueOfflineAction("INSERT_TIMETABLE", payload);
      }
      APP_STATE.timetables.push({ id: tempId, ...payload });
    }

    try {
      localStorage.setItem("riviera_cached_timetables", JSON.stringify(APP_STATE.timetables));
    } catch (err) {}

    // Positionne automatiquement l'affichage sur le professeur concerné pour voir le cours tout de suite
    const viewMode = document.getElementById("admin-timetable-view-mode")?.value;
    const teacherSelect = document.getElementById("admin-timetable-teacher-select");
    const classSelect = document.getElementById("admin-timetable-class-select");

    if (viewMode === "teacher" && teacherSelect) {
      teacherSelect.value = teacher;
    } else if (viewMode === "class" && classSelect) {
      classSelect.value = cls;
    }

    // Rafraîchissement automatique instantané de toutes les grilles
    renderAdminTimetable();
    renderTeacherTimetable();

    modal?.classList.add("d-none");
    form.reset();
  });
}

// OUVERTURE DE LA MODALE AU CLIC (CRÉATION OU ÉDITION)
window.openTimetableModalForSlot = function(day = "Lundi", timeSlot = "07:00 - 08:55", existingCourseId = null) {
  const modal = document.getElementById("modal-timetable-admin");
  const modalTitle = modal?.querySelector(".modal-header h3");
  const idInput = document.getElementById("tt-modal-id");
  const classSel = document.getElementById("tt-modal-class");
  const daySel = document.getElementById("tt-modal-day");
  const startInput = document.getElementById("tt-modal-start");
  const endInput = document.getElementById("tt-modal-end");
  const subSel = document.getElementById("tt-modal-subject");
  const tchSel = document.getElementById("tt-modal-teacher");
  const btnDelete = document.getElementById("btn-delete-course-modal");
  const warning = document.getElementById("tt-conflict-warning");
  const presetSlotSel = document.getElementById("tt-modal-slot-preset");
  const customHoursRow = document.getElementById("tt-custom-hours-row");

  if (warning) warning.classList.add("d-none");

  // Remplissage dynamique des sélecteurs
  if (classSel) classSel.innerHTML = APP_STATE.classes.map(c => `<option value="${c}">${c}</option>`).join("");
  if (subSel) subSel.innerHTML = APP_STATE.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
  if (tchSel) tchSel.innerHTML = APP_STATE.teachers.map(t => `<option value="${t.name}">${t.name}</option>`).join("");

  const viewMode = document.getElementById("admin-timetable-view-mode")?.value || "teacher";
  const selectedTeacher = document.getElementById("admin-timetable-teacher-select")?.value;
  const selectedClass = document.getElementById("admin-timetable-class-select")?.value || "6e";

  if (existingCourseId) {
    // Mode Modification
    const course = APP_STATE.timetables.find(t => String(t.id) === String(existingCourseId));
    if (!course) return;

    if (modalTitle) modalTitle.textContent = "✏️ Modifier le cours";
    if (idInput) idInput.value = course.id;
    if (classSel) classSel.value = course.class_name;
    if (daySel) daySel.value = course.day;
    if (startInput) startInput.value = course.start_time.slice(0, 5);
    if (endInput) endInput.value = course.end_time.slice(0, 5);
    if (subSel) subSel.value = course.subject_name;
    if (tchSel) tchSel.value = course.teacher_name;

    const matchedPreset = `${course.start_time.slice(0, 5)}|${course.end_time.slice(0, 5)}`;
    if (presetSlotSel) {
      const optionExists = Array.from(presetSlotSel.options).some(o => o.value === matchedPreset);
      if (optionExists) {
        presetSlotSel.value = matchedPreset;
        if (customHoursRow) customHoursRow.style.display = "none";
      } else {
        presetSlotSel.value = "custom";
        if (customHoursRow) customHoursRow.style.display = "flex";
      }
    }
    btnDelete?.classList.remove("d-none");
  } else {
    // Mode Ajout sur un créneau
    if (modalTitle) modalTitle.textContent = "➕ Ajouter un cours";
    if (idInput) idInput.value = "";
    if (daySel) daySel.value = day;

    if (viewMode === "teacher" && selectedTeacher && tchSel) {
      tchSel.value = selectedTeacher;
    }
    if (viewMode === "class" && selectedClass && classSel) {
      classSel.value = selectedClass;
    }

    const [s, e] = timeSlot.split(" - ");
    if (startInput) startInput.value = s.trim();
    if (endInput) endInput.value = e.trim();

    const matchedPreset = `${s.trim()}|${e.trim()}`;
    if (presetSlotSel) {
      const optionExists = Array.from(presetSlotSel.options).some(o => o.value === matchedPreset);
      if (optionExists) {
        presetSlotSel.value = matchedPreset;
        if (customHoursRow) customHoursRow.style.display = "none";
      } else {
        presetSlotSel.value = "custom";
        if (customHoursRow) customHoursRow.style.display = "flex";
      }
    }

    btnDelete?.classList.add("d-none");
  }

  modal?.classList.remove("d-none");
};

// SUPPRESSION D'UN COURS PAR L'ADMINISTRATEUR
window.deleteTimetableCourse = async function(courseId, event) {
  if (event) event.stopPropagation();

  const numericId = isNaN(courseId) ? courseId : Number(courseId);
  if (db && navigator.onLine) {
    try {
      const { error } = await db.from("timetables").delete().eq("id", numericId);
      if (error) queueOfflineAction("DELETE_TIMETABLE", { id: numericId });
    } catch (e) {
      queueOfflineAction("DELETE_TIMETABLE", { id: numericId });
    }
  } else {
    queueOfflineAction("DELETE_TIMETABLE", { id: numericId });
  }

  APP_STATE.timetables = APP_STATE.timetables.filter(c => String(c.id) !== String(courseId));
  try {
    localStorage.setItem("riviera_cached_timetables", JSON.stringify(APP_STATE.timetables));
  } catch (e) {}

  renderAdminTimetable();
  renderTeacherTimetable();
};

// RENDU DE L'EMPLOI DU TEMPS CÔTÉ ADMINISTRATEUR (VUE PROFESSEUR OU CLASSE)
// RENDU DE L'EMPLOI DU TEMPS CÔTÉ ADMINISTRATEUR (VUE PROFESSEUR OU CLASSE)
function renderAdminTimetable() {
  const tbody = document.getElementById("admin-timetable-tbody");
  const teacherSelect = document.getElementById("admin-timetable-teacher-select");
  const classSelect = document.getElementById("admin-timetable-class-select");
  if (!tbody) return;

  // Peuplement dynamique des professeurs (en conservant le choix actuel)
  if (teacherSelect && APP_STATE.teachers.length > 0) {
    const prevTeacher = teacherSelect.value;
    teacherSelect.innerHTML = APP_STATE.teachers.map(t => `<option value="${t.name}">${t.name} (${t.subjects || 'Général'})</option>`).join("");
    if (prevTeacher && APP_STATE.teachers.some(t => t.name === prevTeacher)) {
      teacherSelect.value = prevTeacher;
    }
  }

  // Peuplement dynamique des classes (en conservant le choix actuel)
  if (classSelect && APP_STATE.classes.length > 0) {
    const prevClass = classSelect.value;
    classSelect.innerHTML = APP_STATE.classes.map(c => `<option value="${c}">${c}</option>`).join("");
    if (prevClass && APP_STATE.classes.includes(prevClass)) {
      classSelect.value = prevClass;
    }
  }

  const viewMode = document.getElementById("admin-timetable-view-mode")?.value || "teacher";
  const selectedTeacher = teacherSelect?.value || (APP_STATE.teachers[0] ? APP_STATE.teachers[0].name : "");
  const selectedClass = classSelect?.value || (APP_STATE.classes[0] || "6e");

  tbody.innerHTML = TIMETABLE_SLOTS.map(slot => {
    const [slotStart, slotEnd] = slot.split(" - ").map(s => s.trim());

    const dayCols = TIMETABLE_DAYS.map(day => {
      // Correspondance exacte avec le créneau horaire
      const courses = APP_STATE.timetables.filter(t => {
        const matchesDay = t.day === day;
        const cStart = (t.start_time || "").slice(0, 5);
        const matchesSlot = cStart === slotStart || (t.start_time && t.start_time.startsWith(slotStart.slice(0, 2)));

        if (viewMode === "teacher") {
          return matchesDay && matchesSlot && t.teacher_name === selectedTeacher;
        } else {
          return matchesDay && matchesSlot && t.class_name === selectedClass;
        }
      });

      if (courses.length > 0) {
        return `
          <td class="timetable-cell-filled">
            ${courses.map(c => `
              <div class="tt-course-tag editable" onclick="openTimetableModalForSlot('${day}', '${slot}', '${c.id}')" title="Cliquer pour modifier ce cours">
                <strong>${c.subject_name}</strong>
                <span>${viewMode === 'teacher' ? `🏫 Classe : ${c.class_name}` : `👨‍🏫 ${c.teacher_name}`}</span>
                <span class="tt-time-pill bold">🕒 ${slotStart} - ${slotEnd}</span>
                <button type="button" class="btn-del-tt" onclick="deleteTimetableCourse('${c.id}', event)" title="Supprimer ce cours">✕</button>
              </div>
            `).join("")}
          </td>
        `;
      } else {
        return `
          <td class="timetable-cell-empty text-center" onclick="openTimetableModalForSlot('${day}', '${slot}', null)" title="Cliquer pour affecter un cours sur ce créneau (${slot})">
            ${viewMode === 'teacher' ? `<span class="badge-slot-libre">LIBRE</span>` : `<span class="tt-empty-action">+ Affecter</span>`}
          </td>
        `;
      }
    }).join("");

    return `<tr><td class="text-center bold" style="background: #f8fafc; color: var(--primary-deep); font-size: 0.86rem;">${slot}</td>${dayCols}</tr>`;
  }).join("");
}

// RENDU DE L'EMPLOI DU TEMPS ENSEIGNANT (STRICTEMENT INDIVIDUEL + CRÉNEAUX ALIGNÉS)
function renderTeacherTimetable() {
  const tbody = document.getElementById("teacher-timetable-tbody");
  if (!tbody) return;

  const currentTeacherName = APP_STATE.currentUser?.name;
  if (!currentTeacherName) return;

  tbody.innerHTML = TIMETABLE_SLOTS.map(slot => {
    const [slotStart, slotEnd] = slot.split(" - ").map(s => s.trim());

    const dayCols = TIMETABLE_DAYS.map(day => {
      const courses = APP_STATE.timetables.filter(t => {
        const matchesTeacher = t.teacher_name === currentTeacherName;
        const matchesDay = t.day === day;
        const cStart = (t.start_time || "").slice(0, 5);
        const matchesSlot = cStart === slotStart || (t.start_time && t.start_time.startsWith(slotStart.slice(0, 2)));
        return matchesTeacher && matchesDay && matchesSlot;
      });

      if (courses.length > 0) {
        return `
          <td class="timetable-teacher-busy">
            ${courses.map(c => `
              <div class="tt-course-tag prof-view">
                <strong class="prof-subject-name">${c.subject_name}</strong>
                <span class="badge badge-primary prof-class-pill">Classe : ${c.class_name}</span>
                <span class="prof-time-span bold">🕒 ${slotStart} - ${slotEnd}</span>
              </div>
            `).join("")}
          </td>
        `;
      } else {
        return `
          <td class="timetable-teacher-free">
            <span class="badge-slot-libre">LIBRE</span>
          </td>
        `;
      }
    }).join("");

    return `<tr><td class="text-center bold" style="background: #f8fafc; color: var(--primary-deep); font-size: 0.86rem;">${slot}</td>${dayCols}</tr>`;
  }).join("");
}



// ==========================================================
// GESTION DES ÉLÈVES & PROFESSEURS
// ==========================================================
function setupStudentFilters() {
  document.getElementById("filter-student-search")?.addEventListener("input", renderStudentsTable);
  document.getElementById("filter-student-class")?.addEventListener("change", renderStudentsTable);

  const sortSelect = document.getElementById("filter-student-sort");
  sortSelect?.addEventListener("change", renderStudentsTable);

  // Tri rapide au clic direct sur l'en-tête "Matricule ⬍"
  document.getElementById("th-sort-matricule")?.addEventListener("click", () => {
    if (!sortSelect) return;
    sortSelect.value = sortSelect.value === "mat-asc" ? "mat-desc" : "mat-asc";
    renderStudentsTable();
  });

  // Tri rapide au clic direct sur l'en-tête "Nom ⬍"
  document.getElementById("th-sort-lastname")?.addEventListener("click", () => {
    if (!sortSelect) return;
    sortSelect.value = sortSelect.value === "name-asc" ? "name-desc" : "name-asc";
    renderStudentsTable();
  });
}

function generateNextMatricule() {
  const currentYear = new Date().getFullYear();
  let maxNum = 0;
  APP_STATE.students.forEach(s => {
    if (s.matricule) {
      const match = s.matricule.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  return "M" + currentYear + String(maxNum + 1).padStart(3, "0");
}

function setupInlineRowAdditions() {
  document.getElementById("btn-add-student-inline")?.addEventListener("click", () => {
    const tbody = document.getElementById("students-table-body");
    if (document.getElementById("row-new-student")) return;

    const nextMatricule = generateNextMatricule();
    const tr = document.createElement("tr");
    tr.id = "row-new-student";
    tr.className = "new-row-inline";

    tr.innerHTML = `
      <td><strong>${nextMatricule}</strong></td>
      <td><input type="text" id="new-std-lastname" placeholder="NOM" required></td>
      <td><input type="text" id="new-std-firstname" placeholder="Prénom" required></td>
      <td>
        <select id="new-std-gender">
          <option value="Féminin">Féminin</option>
          <option value="Masculin">Masculin</option>
        </select>
      </td>
      <td><input type="text" id="new-std-dob" placeholder="Ex: 12 mars 2014"></td>
      <td><input type="text" id="new-std-pob" placeholder="Ex: Lomé"></td>
      <td>
        <select id="new-std-class">
          ${APP_STATE.classes.map(c => `<option value="${c}">${c}</option>`).join("")}
        </select>
      </td>
      <td><span class="badge badge-success">Nouveau</span></td>
      <td class="text-center">
        <button class="btn-inline-action btn-inline-save" id="btn-save-inline-student" title="Enregistrer">✔</button>
        <button class="btn-inline-action btn-inline-cancel" id="btn-cancel-inline-student" title="Annuler">✖</button>
      </td>
    `;

    tbody.prepend(tr);
    document.getElementById("new-std-lastname").focus();

    document.getElementById("btn-save-inline-student").addEventListener("click", async () => {
      const btnSave = document.getElementById("btn-save-inline-student");
      const lName = document.getElementById("new-std-lastname").value.trim().toUpperCase();
      const fName = document.getElementById("new-std-firstname").value.trim();
      const gender = document.getElementById("new-std-gender").value;
      const dobVal = document.getElementById("new-std-dob").value.trim();
      const pobVal = document.getElementById("new-std-pob").value.trim();
      const cls = document.getElementById("new-std-class").value;

      if (!lName || !fName) return alert("Veuillez renseigner le Nom et le Prénom.");

      btnSave.disabled = true;
      btnSave.textContent = "⏳";

      const newStudentPayload = {
        matricule: nextMatricule,
        last_name: lName,
        first_name: fName,
        gender: gender,
        dob: dobVal,
        pob: pobVal,
        class_name: cls,
        status: "Passant",
        counsel_decision: "Admis(e)"
      };

      let insertedId = Date.now();

      if (db && navigator.onLine) {
        try {
          const { data, error } = await db.from("students").insert([newStudentPayload]).select();
          if (error) {
            console.error("❌ Erreur insertion élève Supabase :", error);
            queueOfflineAction("INSERT_STUDENT", newStudentPayload);
          } else if (data && data.length > 0) {
            insertedId = data[0].id;
          }
        } catch (fetchErr) {
          queueOfflineAction("INSERT_STUDENT", newStudentPayload);
        }
      } else {
        queueOfflineAction("INSERT_STUDENT", newStudentPayload);
      }

      const studentObj = {
        id: insertedId,
        matricule: nextMatricule,
        lastName: lName,
        firstName: fName,
        sex: gender,
        dob: dobVal,
        pob: pobVal,
        class: cls,
        status: "Passant",
        decision: "Admis(e)"
      };

      if (!APP_STATE.students.some(s => s.matricule === nextMatricule)) {
        APP_STATE.students.push(studentObj);
      }

      try { localStorage.setItem("riviera_cached_students", JSON.stringify(APP_STATE.students)); } catch (e) {}

      tr.remove();
      refreshUI();
    });

    document.getElementById("btn-cancel-inline-student").addEventListener("click", () => tr.remove());
  });

  document.getElementById("btn-add-teacher-inline")?.addEventListener("click", () => {
    const tbody = document.getElementById("teachers-table-body");
    if (document.getElementById("row-new-teacher")) return;

    const tr = document.createElement("tr");
    tr.id = "row-new-teacher";
    tr.className = "new-row-inline";

    tr.innerHTML = `
      <td><input type="text" id="new-tch-name" placeholder="Nom du Professeur (ex: M. Koffi)" required></td>
      <td><input type="text" id="new-tch-subjects" placeholder="Matières (ex: Mathématiques)"></td>
      <td><input type="text" id="new-tch-classes" placeholder="Classes (ex: 6e, 5e)"></td>
      <td class="text-center text-muted">À définir</td>
      <td class="text-center">
        <button class="btn-inline-action btn-inline-save" id="btn-save-inline-teacher" title="Enregistrer">✔</button>
        <button class="btn-inline-action btn-inline-cancel" id="btn-cancel-inline-teacher" title="Annuler">✖</button>
      </td>
    `;

    tbody.prepend(tr);
    document.getElementById("new-tch-name").focus();

    document.getElementById("btn-save-inline-teacher").addEventListener("click", async () => {
      const btnSave = document.getElementById("btn-save-inline-teacher");
      const name = document.getElementById("new-tch-name").value.trim();
      const subs = document.getElementById("new-tch-subjects").value.trim() || "Général";
      const cls = document.getElementById("new-tch-classes").value.trim() || "6e";

      if (!name) return alert("Veuillez renseigner le nom du professeur.");

      btnSave.disabled = true;
      btnSave.textContent = "⏳";

      const newTchPayload = { name: name, access_code: "prof123", subjects: subs, classes: cls };
      let insertedId = Date.now();

      if (db && navigator.onLine) {
        try {
          const { data, error } = await db.from("teachers").insert([newTchPayload]).select();
          if (error) queueOfflineAction("INSERT_TEACHER", newTchPayload);
          else if (data && data.length > 0) insertedId = data[0].id;
        } catch (fetchErr) {
          queueOfflineAction("INSERT_TEACHER", newTchPayload);
        }
      } else {
        queueOfflineAction("INSERT_TEACHER", newTchPayload);
      }

      const teacherObj = { id: insertedId, ...newTchPayload };
      APP_STATE.teachers.push(teacherObj);
      try { localStorage.setItem("riviera_cached_teachers", JSON.stringify(APP_STATE.teachers)); } catch (e) {}

      tr.remove();
      refreshUI();
    });

    document.getElementById("btn-cancel-inline-teacher").addEventListener("click", () => tr.remove());
  });
}

function renderStudentsTable() {
  const tbody = document.getElementById("students-table-body");
  if (!tbody) return;

  const search = (document.getElementById("filter-student-search")?.value || "").toLowerCase().trim();
  const cls = document.getElementById("filter-student-class")?.value || "";
  const sortOption = document.getElementById("filter-student-sort")?.value || "mat-asc";

  let list = APP_STATE.students.filter(s => {
    const matchCls = !cls || s.class === cls;
    const lName = (s.lastName || "").toLowerCase();
    const fName = (s.firstName || "").toLowerCase();
    const mat = (s.matricule || "").toLowerCase();
    const matchTxt = !search || lName.includes(search) || fName.includes(search) || mat.includes(search);
    return matchCls && matchTxt;
  });

  // Tri intelligent et sécurisé
  list.sort((a, b) => {
    if (sortOption === "mat-asc") {
      return (a.matricule || "").localeCompare(b.matricule || "", undefined, { numeric: true, sensitivity: "base" });
    } else if (sortOption === "mat-desc") {
      return (b.matricule || "").localeCompare(a.matricule || "", undefined, { numeric: true, sensitivity: "base" });
    } else if (sortOption === "name-desc") {
      return (b.lastName || "").localeCompare(a.lastName || "");
    } else {
      return (a.lastName || "").localeCompare(b.lastName || "");
    }
  });

  tbody.innerHTML = list.map((s, idx) => `
    <tr>
      <td><strong>${s.matricule}</strong></td>
      <td><strong>${s.lastName}</strong></td>
      <td>${s.firstName}</td>
      <td>${s.sex || '-'}</td>
      <td>${s.dob || '-'}</td>
      <td>${s.pob || '-'}</td>
      <td><span class="badge badge-secondary">${s.class}</span></td>
      <td><span class="badge badge-success">${s.status}</span></td>
      <td class="text-center">
        <div class="action-menu-container">
          <button class="btn-action-dots" onclick="toggleActionMenu('std-m-${idx}', event)">⋮</button>
          <div id="std-m-${idx}" class="action-dropdown-menu">
            <button class="action-dropdown-item" onclick="openEditStudentModal('${s.matricule}')">✏️ Modifier</button>
            <button class="action-dropdown-item" onclick="openStudentBulletin('${s.matricule}')">📄 Voir Bulletin</button>
            <button class="action-dropdown-item danger" onclick="deleteStudentConfirmed('${s.matricule}')">🗑️ Supprimer</button>
          </div>
        </div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="9" class="text-center text-muted">Aucun élève trouvé.</td></tr>`;
}

window.openEditStudentModal = function(matricule) {
  const student = APP_STATE.students.find(s => s.matricule === matricule);
  if (!student) return;

  const modal = document.getElementById("modal-edit-student");
  const origMatInput = document.getElementById("edit-std-matricule-original");
  const matInput = document.getElementById("edit-std-matricule");
  const classSel = document.getElementById("edit-std-class");
  const lNameInput = document.getElementById("edit-std-lastname");
  const fNameInput = document.getElementById("edit-std-firstname");
  const genderSel = document.getElementById("edit-std-gender");
  const statusSel = document.getElementById("edit-std-status");
  const dobInput = document.getElementById("edit-std-dob");
  const pobInput = document.getElementById("edit-std-pob");

  if (origMatInput) origMatInput.value = student.matricule;
  if (matInput) matInput.value = student.matricule;
  if (classSel) {
    classSel.innerHTML = APP_STATE.classes.map(c => `<option value="${c}">${c}</option>`).join("");
    classSel.value = student.class;
  }
  if (lNameInput) lNameInput.value = student.lastName;
  if (fNameInput) fNameInput.value = student.firstName;
  if (genderSel) genderSel.value = student.sex || "Féminin";
  if (statusSel) statusSel.value = student.status || "Passant";
  if (dobInput) dobInput.value = student.dob || "";
  if (pobInput) pobInput.value = student.pob || "";

  modal?.classList.remove("d-none");
};

function setupEditStudentModal() {
  const modal = document.getElementById("modal-edit-student");
  const form = document.getElementById("form-edit-student");
  const btnClose = document.getElementById("btn-close-edit-student-modal");
  const btnCancel = document.getElementById("btn-cancel-edit-student");

  const closeModal = () => modal?.classList.add("d-none");
  btnClose?.addEventListener("click", closeModal);
  btnCancel?.addEventListener("click", closeModal);

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById("btn-submit-edit-student");
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "⏳ Enregistrement...";
    }

    const origMat = document.getElementById("edit-std-matricule-original").value;
    const newMat = document.getElementById("edit-std-matricule").value.trim();
    const cls = document.getElementById("edit-std-class").value;
    const lName = document.getElementById("edit-std-lastname").value.trim().toUpperCase();
    const fName = document.getElementById("edit-std-firstname").value.trim();
    const gender = document.getElementById("edit-std-gender").value;
    const status = document.getElementById("edit-std-status").value;
    const dob = document.getElementById("edit-std-dob").value.trim();
    const pob = document.getElementById("edit-std-pob").value.trim();

    if (!newMat || !lName || !fName) {
      alert("Le matricule, le nom et le prénom sont obligatoires.");
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "💾 Enregistrer les modifications";
      }
      return;
    }

    const payload = {
      matricule: newMat,
      last_name: lName,
      first_name: fName,
      gender: gender,
      class_name: cls,
      status: status,
      dob: dob,
      pob: pob
    };

    let saveSuccess = true;

    if (db && navigator.onLine) {
      try {
        const { error } = await db.from("students").update(payload).eq("matricule", origMat);
        if (error) {
          saveSuccess = false;
          console.error("❌ Erreur mise à jour Supabase :", error);
          queueOfflineAction("UPDATE_STUDENT", { originalMatricule: origMat, ...payload });
        }
      } catch (err) {
        saveSuccess = false;
        queueOfflineAction("UPDATE_STUDENT", { originalMatricule: origMat, ...payload });
      }
    } else {
      // Support hors-ligne garanti
      queueOfflineAction("UPDATE_STUDENT", { originalMatricule: origMat, ...payload });
    }

    // Mise à jour immédiate de la mémoire locale
    const idx = APP_STATE.students.findIndex(s => s.matricule === origMat);
    if (idx !== -1) {
      APP_STATE.students[idx] = {
        ...APP_STATE.students[idx],
        matricule: newMat,
        lastName: lName,
        firstName: fName,
        sex: gender,
        class: cls,
        status: status,
        dob: dob,
        pob: pob
      };
      try {
        localStorage.setItem("riviera_cached_students", JSON.stringify(APP_STATE.students));
      } catch (e) {}
    }

    // Si le matricule a été modifié, mettre à jour les liaisons locales
    if (origMat !== newMat) {
      APP_STATE.grades.forEach(g => {
        if (g.student_matricule === origMat) g.student_matricule = newMat;
      });
      APP_STATE.attendance.forEach(a => {
        if (a.student_matricule === origMat) {
          a.student_matricule = newMat;
          a.student_name = `${lName} ${fName}`;
        }
      });
      try {
        localStorage.setItem("riviera_cached_grades", JSON.stringify(APP_STATE.grades));
        localStorage.setItem("riviera_cached_attendance", JSON.stringify(APP_STATE.attendance));
      } catch (e) {}
    }

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "💾 Enregistrer les modifications";
    }

    closeModal();
    refreshUI();

    if (saveSuccess) {
      alert("✅ Fiche élève modifiée et enregistrée avec succès !");
    } else {
      alert("ℹ️ Fiche élève modifiée localement. Synchronisation avec Supabase dès que la connexion est rétablie.");
    }
  });
}

// Initialisation immédiate des écouteurs de la modale
setupEditStudentModal();

window.openStudentBulletin = function(matricule) {
  document.querySelector('[data-target="section-admin-bulletins"]')?.click();
  const sel = document.getElementById("bulletin-select-student");
  if (sel) sel.value = matricule;
  loadBulletinForStudent(matricule);
};

window.deleteStudentConfirmed = async function(matricule) {
  if (confirm(`Confirmez-vous la suppression de l'élève (${matricule}) ?`)) {
    if (db && navigator.onLine) {
      try {
        await db.from("students").delete().eq("matricule", matricule);
      } catch (e) {
        queueOfflineAction("DELETE_STUDENT", { matricule });
      }
    } else {
      queueOfflineAction("DELETE_STUDENT", { matricule });
    }
    APP_STATE.students = APP_STATE.students.filter(x => x.matricule !== matricule);
    try { localStorage.setItem("riviera_cached_students", JSON.stringify(APP_STATE.students)); } catch (e) {}
    refreshUI();
  }
};

window.deleteTeacherConfirmed = async function(teacherId) {
  if (confirm("Confirmez-vous la suppression de ce professeur ?")) {
    ensureSupabaseClient();
    if (db && navigator.onLine) {
      try { await db.from("teachers").delete().eq("id", teacherId); } catch (e) { queueOfflineAction("DELETE_TEACHER", { id: teacherId }); }
    } else {
      queueOfflineAction("DELETE_TEACHER", { id: teacherId });
    }
    APP_STATE.teachers = APP_STATE.teachers.filter(x => x.id !== teacherId);
    try { localStorage.setItem("riviera_cached_teachers", JSON.stringify(APP_STATE.teachers)); } catch (e) {}
    refreshUI();
  }
};

function renderTeachersTable() {
  const tbody = document.getElementById("teachers-table-body");
  if (!tbody) return;

  tbody.innerHTML = APP_STATE.teachers.map((t, idx) => `
    <tr>
      <td><strong>${t.name}</strong></td>
      <td><span class="badge badge-secondary">${t.subjects || 'Général'}</span></td>
      <td><span class="badge badge-primary">${t.classes || 'Toutes'}</span></td>
      <td class="text-center">
        <button class="btn btn-sm btn-secondary" onclick="openTeacherAssignModal(${t.id})">✏️ Modifier / Attributions</button>
      </td>
      <td class="text-center">
        <div class="action-menu-container">
          <button class="btn-action-dots" onclick="toggleActionMenu('teacher-menu-${idx}', event)">⋮</button>
          <div id="teacher-menu-${idx}" class="action-dropdown-menu">
            <button class="action-dropdown-item" onclick="openTeacherAssignModal(${t.id})">✏️ Modifier la fiche</button>
            <button class="action-dropdown-item danger" onclick="deleteTeacherConfirmed(${t.id})">🗑️ Supprimer</button>
          </div>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderClassesAndSubjectsTables() {
  const cBody = document.getElementById("classes-table-body");
  const sBody = document.getElementById("subjects-table-body");

  // Rendu du tableau des Classes avec boutons Modifier et Supprimer
  if (cBody) {
    cBody.innerHTML = APP_STATE.classes.map(c => `
      <tr>
        <td><strong>${c}</strong></td>
        <td class="text-center" style="white-space: nowrap;">
          <button class="btn btn-sm btn-secondary" onclick="openClassModal('${c}')" title="Modifier la classe">✏️</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteClassConfirmed('${c}')" title="Supprimer la classe">🗑️</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="2" class="text-center text-muted">Aucune classe enregistrée.</td></tr>`;
  }

  // Rendu du tableau des Matières & Coefficients avec boutons Modifier et Supprimer
  if (sBody) {
    sBody.innerHTML = APP_STATE.subjects.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td><span class="badge badge-primary bold">Coef ${s.coef}</span></td>
        <td class="text-center" style="white-space: nowrap;">
          <button class="btn btn-sm btn-secondary" onclick="openSubjectModal('${s.name}')" title="Modifier la matière et son coefficient">✏️</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteSubjectConfirmed('${s.name}')" title="Supprimer la matière">🗑️</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="3" class="text-center text-muted">Aucune matière enregistrée.</td></tr>`;
  }
}

// -------------------------------------------------------------
// GESTION DES CLASSES (AJOUT / MODIFICATION / SUPPRESSION)
// -------------------------------------------------------------
window.openClassModal = function(className = null) {
  const modal = document.getElementById("modal-manage-class");
  const title = document.getElementById("modal-class-title");
  const nameInput = document.getElementById("manage-class-name");
  const oldNameInput = document.getElementById("manage-class-old-name");

  if (className) {
    if (title) title.textContent = "✏️ Modifier la Classe";
    if (nameInput) nameInput.value = className;
    if (oldNameInput) oldNameInput.value = className;
  } else {
    if (title) title.textContent = "➕ Ajouter une Classe";
    if (nameInput) nameInput.value = "";
    if (oldNameInput) oldNameInput.value = "";
  }

  modal?.classList.remove("d-none");
  nameInput?.focus();
};

window.deleteClassConfirmed = async function(className) {
  if (confirm(`Confirmez-vous la suppression de la classe "${className}" ?`)) {
    APP_STATE.classes = APP_STATE.classes.filter(c => c !== className);
    ensureSupabaseClient();
    if (db && navigator.onLine) {
      try { await db.from("classes").delete().eq("name", className); } catch (e) { queueOfflineAction("DELETE_CLASS", { name: className }); }
    } else {
      queueOfflineAction("DELETE_CLASS", { name: className });
    }

    try { localStorage.setItem("riviera_cached_classes", JSON.stringify(APP_STATE.classes)); } catch (e) {}
    refreshUI();
  }
};

// -------------------------------------------------------------
// GESTION DES MATIÈRES & COEFFICIENTS
// -------------------------------------------------------------
window.openSubjectModal = function(subjectName = null) {
  const modal = document.getElementById("modal-manage-subject");
  const title = document.getElementById("modal-subject-title");
  const nameInput = document.getElementById("manage-subject-name");
  const coefInput = document.getElementById("manage-subject-coef");
  const oldNameInput = document.getElementById("manage-subject-old-name");

  if (subjectName) {
    const existing = APP_STATE.subjects.find(s => s.name === subjectName);
    if (title) title.textContent = "✏️ Modifier la Matière & Coef";
    if (nameInput) nameInput.value = subjectName;
    if (coefInput) coefInput.value = existing ? existing.coef : 2;
    if (oldNameInput) oldNameInput.value = subjectName;
  } else {
    if (title) title.textContent = "➕ Ajouter une Matière";
    if (nameInput) nameInput.value = "";
    if (coefInput) coefInput.value = 2;
    if (oldNameInput) oldNameInput.value = "";
  }

  modal?.classList.remove("d-none");
  nameInput?.focus();
};

window.deleteSubjectConfirmed = async function(subjectName) {
  if (confirm(`Confirmez-vous la suppression de la matière "${subjectName}" ?`)) {
    APP_STATE.subjects = APP_STATE.subjects.filter(s => s.name !== subjectName);
    ensureSupabaseClient();
    if (db && navigator.onLine) {
      try { await db.from("subjects").delete().eq("name", subjectName); } catch (e) { queueOfflineAction("DELETE_SUBJECT", { name: subjectName }); }
    } else {
      queueOfflineAction("DELETE_SUBJECT", { name: subjectName });
    }

    try { localStorage.setItem("riviera_cached_subjects", JSON.stringify(APP_STATE.subjects)); } catch (e) {}
    refreshUI();
  }
};

// -------------------------------------------------------------
// INITIALISATION DES ÉCOUTEURS POUR CLASSES ET MATIÈRES
// -------------------------------------------------------------
function setupClassAndSubjectManagement() {
  // Boutons d'ouverture depuis la page
  document.getElementById("btn-add-class-item")?.addEventListener("click", () => openClassModal());
  document.getElementById("btn-add-subject-item")?.addEventListener("click", () => openSubjectModal());

  // Fermetures modale classe
  const classModal = document.getElementById("modal-manage-class");
  const closeClass = () => classModal?.classList.add("d-none");
  document.getElementById("btn-close-class-modal")?.addEventListener("click", closeClass);
  document.getElementById("btn-cancel-class-modal")?.addEventListener("click", closeClass);

  // Soumission modale classe
  document.getElementById("form-manage-class")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("manage-class-name");
    const oldNameInput = document.getElementById("manage-class-old-name");
    const newName = nameInput ? nameInput.value.trim() : "";
    const oldName = oldNameInput ? oldNameInput.value.trim() : "";

    if (!newName) return;

    if (oldName) {
      // Modification
      const idx = APP_STATE.classes.indexOf(oldName);
      if (idx !== -1) APP_STATE.classes[idx] = newName;

      // Répercussion automatique sur les élèves de cette classe
      APP_STATE.students.forEach(s => {
        if (s.class === oldName) s.class = newName;
      });

      ensureSupabaseClient();
      if (db && navigator.onLine) {
        try { await db.from("classes").update({ name: newName }).eq("name", oldName); } catch (err) { queueOfflineAction("UPDATE_CLASS", { oldName, newName }); }
      } else {
        queueOfflineAction("UPDATE_CLASS", { oldName, newName });
      }
    } else {
      if (!APP_STATE.classes.includes(newName)) {
        APP_STATE.classes.push(newName);
        ensureSupabaseClient();
        if (db && navigator.onLine) {
          try { await db.from("classes").insert([{ name: newName }]); } catch (err) { queueOfflineAction("INSERT_CLASS", { name: newName }); }
        } else {
          queueOfflineAction("INSERT_CLASS", { name: newName });
        }
      }
    }

    try {
      localStorage.setItem("riviera_cached_classes", JSON.stringify(APP_STATE.classes));
      localStorage.setItem("riviera_cached_students", JSON.stringify(APP_STATE.students));
    } catch (err) {}

    closeClass();
    refreshUI();
    alert("✅ Classe enregistrée avec succès !");
  });

  // Fermetures modale matière
  const subjectModal = document.getElementById("modal-manage-subject");
  const closeSubject = () => subjectModal?.classList.add("d-none");
  document.getElementById("btn-close-subject-modal")?.addEventListener("click", closeSubject);
  document.getElementById("btn-cancel-subject-modal")?.addEventListener("click", closeSubject);

  // Soumission modale matière
  document.getElementById("form-manage-subject")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("manage-subject-name");
    const coefInput = document.getElementById("manage-subject-coef");
    const oldNameInput = document.getElementById("manage-subject-old-name");

    const newName = nameInput ? nameInput.value.trim() : "";
    const newCoef = coefInput ? parseInt(coefInput.value, 10) || 1 : 1;
    const oldName = oldNameInput ? oldNameInput.value.trim() : "";

    if (!newName) return;

    if (oldName) {
      // Modification
      const sub = APP_STATE.subjects.find(s => s.name === oldName);
      if (sub) {
        sub.name = newName;
        sub.coef = newCoef;
      }
      ensureSupabaseClient();
      if (db && navigator.onLine) {
        try { await db.from("subjects").update({ name: newName, default_coef: newCoef }).eq("name", oldName); } catch (err) { queueOfflineAction("UPDATE_SUBJECT", { oldName, newName, default_coef: newCoef }); }
      } else {
        queueOfflineAction("UPDATE_SUBJECT", { oldName, newName, default_coef: newCoef });
      }
    } else {
      const exists = APP_STATE.subjects.some(s => s.name === newName);
      if (!exists) {
        APP_STATE.subjects.push({ name: newName, coef: newCoef });
        ensureSupabaseClient();
        if (db && navigator.onLine) {
          try { await db.from("subjects").insert([{ name: newName, default_coef: newCoef }]); } catch (err) { queueOfflineAction("INSERT_SUBJECT", { name: newName, default_coef: newCoef }); }
        } else {
          queueOfflineAction("INSERT_SUBJECT", { name: newName, default_coef: newCoef });
        }
      }
    }

    try { localStorage.setItem("riviera_cached_subjects", JSON.stringify(APP_STATE.subjects)); } catch (err) {}

    closeSubject();
    refreshUI();
    alert("✅ Matière et coefficient enregistrés avec succès !");
  });
}

// Lancement immédiat des écouteurs
setupClassAndSubjectManagement();

function setupTeacherAssignmentsModal() {
  const modal = document.getElementById("modal-teacher-assignment");
  document.getElementById("btn-close-assign-modal")?.addEventListener("click", () => modal.classList.add("d-none"));
  document.getElementById("btn-cancel-assign")?.addEventListener("click", () => modal.classList.add("d-none"));

  document.getElementById("btn-save-assign")?.addEventListener("click", async () => {
    if (!APP_STATE.currentTeacherAssignId) return;

    const btnSave = document.getElementById("btn-save-assign");
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = "⏳ Enregistrement...";
    }

    const nameInput = document.getElementById("assign-teacher-name-input");
    const newName = nameInput ? nameInput.value.trim() : "";

    if (!newName) {
      alert("Le nom du professeur ne peut pas être vide.");
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = "💾 Enregistrer les modifications";
      }
      return;
    }

    const checkedClasses = Array.from(document.querySelectorAll("#assign-classes-checkboxes input:checked")).map(cb => cb.value).join(", ") || "Aucune";
    const checkedSubjects = Array.from(document.querySelectorAll("#assign-subjects-checkboxes input:checked")).map(cb => cb.value).join(", ") || "Aucune";

    const teacher = APP_STATE.teachers.find(x => x.id === APP_STATE.currentTeacherAssignId);
    const oldName = teacher ? teacher.name : "";

    const payload = {
      name: newName,
      classes: checkedClasses,
      subjects: checkedSubjects
    };

    let saveSuccess = true;

    if (db && navigator.onLine) {
      try {
        const { error } = await db.from("teachers").update(payload).eq("id", APP_STATE.currentTeacherAssignId);
        if (error) {
          saveSuccess = false;
          console.error("❌ Erreur modification professeur Supabase :", error);
          queueOfflineAction("UPDATE_TEACHER", { id: APP_STATE.currentTeacherAssignId, ...payload });
        }
      } catch (e) {
        saveSuccess = false;
        queueOfflineAction("UPDATE_TEACHER", { id: APP_STATE.currentTeacherAssignId, ...payload });
      }
    } else {
      // Support hors-ligne garanti
      queueOfflineAction("UPDATE_TEACHER", { id: APP_STATE.currentTeacherAssignId, ...payload });
    }

    // Mise à jour de l'état local
    if (teacher) {
      teacher.name = newName;
      teacher.classes = checkedClasses;
      teacher.subjects = checkedSubjects;
    }

    // Si le nom du professeur a changé, mettre à jour ses cours et ses notes associées
    if (oldName && oldName !== newName) {
      APP_STATE.timetables.forEach(t => {
        if (t.teacher_name === oldName) t.teacher_name = newName;
      });
      APP_STATE.grades.forEach(g => {
        if (g.teacher_name === oldName) g.teacher_name = newName;
      });

      try {
        localStorage.setItem("riviera_cached_timetables", JSON.stringify(APP_STATE.timetables));
        localStorage.setItem("riviera_cached_grades", JSON.stringify(APP_STATE.grades));
      } catch (e) {}
    }

    try {
      localStorage.setItem("riviera_cached_teachers", JSON.stringify(APP_STATE.teachers));
    } catch (e) {}

    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = "💾 Enregistrer les modifications";
    }

    modal.classList.add("d-none");
    refreshUI();

    if (saveSuccess) {
      alert("✅ Informations du professeur mises à jour avec succès !");
    } else {
      alert("ℹ️ Modifications enregistrées localement (mode hors-ligne actif). Synchronisation automatique dès que la connexion est rétablie.");
    }
  });
}

window.openTeacherAssignModal = function(teacherId) {
  const teacher = APP_STATE.teachers.find(t => t.id === teacherId);
  if (!teacher) return;
  APP_STATE.currentTeacherAssignId = teacherId;

  // Remplissage du champ Nom & Prénoms
  const nameInput = document.getElementById("assign-teacher-name-input");
  if (nameInput) nameInput.value = teacher.name;

  const currentClasses = (teacher.classes || "").split(",").map(c => c.trim());
  const currentSubjects = (teacher.subjects || "").split(",").map(s => s.trim());

  document.getElementById("assign-classes-checkboxes").innerHTML = APP_STATE.classes.map(c => `
    <label class="checkbox-item"><input type="checkbox" value="${c}" ${currentClasses.includes(c) ? "checked" : ""}> ${c}</label>
  `).join("");

  document.getElementById("assign-subjects-checkboxes").innerHTML = APP_STATE.subjects.map(s => `
    <label class="checkbox-item"><input type="checkbox" value="${s.name}" ${currentSubjects.includes(s.name) ? "checked" : ""}> ${s.name}</label>
  `).join("");

  document.getElementById("modal-teacher-assignment")?.classList.remove("d-none");
};

// ==========================================================
// IMPORT EXCEL
// ==========================================================
function setupExcelImport() {
  const modal = document.getElementById("modal-excel-import");
  document.getElementById("btn-open-excel-modal")?.addEventListener("click", () => modal.classList.remove("d-none"));
  document.getElementById("btn-close-excel-modal")?.addEventListener("click", () => modal.classList.add("d-none"));
  document.getElementById("btn-cancel-excel")?.addEventListener("click", () => modal.classList.add("d-none"));

  const fileInput = document.getElementById("excel-file-input");
  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (!rawJson || rawJson.length < 2) return alert("Fichier vide ou invalide.");

        // Détection intelligente des colonnes d'après les en-têtes
        const headers = rawJson[0].map(h => String(h || "").trim().toLowerCase());
        const colMat = headers.findIndex(h => h.includes("mat") || h.includes("num"));
        const colNom = headers.findIndex(h => h.includes("nom") || h.includes("last"));
        const colPrenom = headers.findIndex(h => h.includes("prenom") || h.includes("prénom") || h.includes("first"));
        const colSexe = headers.findIndex(h => h.includes("sexe") || h.includes("sex") || h.includes("genre"));
        const colDob = headers.findIndex(h => h.includes("date") || h.includes("naiss") || h.includes("dob") || h.includes("né"));
        const colPob = headers.findIndex(h => h.includes("lieu") || h.includes("pob") || h.includes("ville") || h.includes("à"));
        const colClass = headers.findIndex(h => h.includes("class") || h.includes("niveau"));

        APP_STATE.parsedExcelStudents = [];
        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || !row.length) continue;

          // Récupération du Nom et Prénom
          const lName = String(row[colNom >= 0 ? colNom : 0] || "").trim().toUpperCase();
          const fName = String(row[colPrenom >= 0 ? colPrenom : 1] || "").trim();

          if (lName) {
            // Sexe : laissé vide ou normalisé seulement si renseigné
            const rawSex = colSexe >= 0 && row[colSexe] ? String(row[colSexe]).trim() : "";
            let sexVal = "";
            if (rawSex) {
              sexVal = rawSex.toUpperCase().startsWith("F") ? "Féminin" : "Masculin";
            }

            // Date et Lieu : laissés strictement vides si absents du fichier
            const dobVal = colDob >= 0 && row[colDob] !== undefined && row[colDob] !== null ? String(row[colDob]).trim() : "";
            const pobVal = colPob >= 0 && row[colPob] !== undefined && row[colPob] !== null ? String(row[colPob]).trim() : "";
            const classVal = colClass >= 0 && row[colClass] ? String(row[colClass]).trim() : "6e";
            const matVal = colMat >= 0 && row[colMat] ? String(row[colMat]).trim() : "";

            APP_STATE.parsedExcelStudents.push({
              matricule: matVal,
              lastName: lName,
              firstName: fName,
              sex: sexVal,
              dob: dobVal,
              pob: pobVal,
              class: classVal
            });
          }
        }

        if (APP_STATE.parsedExcelStudents.length === 0) {
          return alert("Aucune ligne d'élève détectée dans le fichier.");
        }

        document.getElementById("excel-preview-container")?.classList.remove("d-none");
        document.getElementById("excel-rows-count").textContent = APP_STATE.parsedExcelStudents.length;
        document.getElementById("excel-preview-tbody").innerHTML = APP_STATE.parsedExcelStudents.map(s => `
          <tr>
            <td><strong>${s.lastName}</strong></td>
            <td>${s.firstName}</td>
            <td>${s.sex || '-'}</td>
            <td>${s.dob || '-'}</td>
            <td>${s.pob || '-'}</td>
            <td><span class="badge badge-secondary">${s.class}</span></td>
            <td><span class="badge badge-success">Prêt</span></td>
          </tr>
        `).join("");

        document.getElementById("btn-confirm-excel-import").disabled = false;
      } catch (err) {
        alert("Erreur de lecture du fichier Excel : " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  });

  document.getElementById("btn-confirm-excel-import")?.addEventListener("click", async () => {
    const btnConfirm = document.getElementById("btn-confirm-excel-import");
    btnConfirm.disabled = true;
    btnConfirm.textContent = "⏳ Importation en cours...";

    const currentYear = new Date().getFullYear();
    let maxNum = 0;
    APP_STATE.students.forEach(s => {
      if (s.matricule) {
        const match = s.matricule.match(/\d+$/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });

    const toInsert = APP_STATE.parsedExcelStudents.map(s => {
      let finalMatricule = s.matricule;
      if (!finalMatricule) {
        maxNum++;
        finalMatricule = "M" + currentYear + String(maxNum).padStart(3, "0");
      }

      return {
        matricule: finalMatricule,
        last_name: s.lastName,
        first_name: s.firstName,
        gender: s.sex || "",
        dob: s.dob || "",
        pob: s.pob || "",
        class_name: s.class || "6e",
        status: "Passant",
        counsel_decision: "Admis(e)"
      };
    });

    let saveSuccess = true;

    if (db && navigator.onLine) {
      try {
        const { error } = await db.from("students").insert(toInsert);
        if (error) {
          saveSuccess = false;
          console.error("❌ Erreur Supabase lors de l'import :", error);
          toInsert.forEach(s => queueOfflineAction("INSERT_STUDENT", s));
        }
      } catch (err) {
        saveSuccess = false;
        toInsert.forEach(s => queueOfflineAction("INSERT_STUDENT", s));
      }
    } else {
      // Support hors-ligne garanti
      toInsert.forEach(s => queueOfflineAction("INSERT_STUDENT", s));
    }

    // Ajout immédiat en mémoire locale
    toInsert.forEach(s => {
      APP_STATE.students.push({
        id: Date.now() + Math.random(),
        matricule: s.matricule,
        lastName: s.last_name,
        firstName: s.first_name,
        sex: s.gender,
        dob: s.dob,
        pob: s.pob,
        class: s.class_name,
        status: s.status,
        decision: s.counsel_decision
      });
    });

    try {
      localStorage.setItem("riviera_cached_students", JSON.stringify(APP_STATE.students));
    } catch (e) {}

    btnConfirm.disabled = false;
    btnConfirm.textContent = "Confirmer l'importation dans Supabase";
    modal.classList.add("d-none");
    refreshUI();

    if (saveSuccess) {
      alert(`✅ ${toInsert.length} élève(s) importé(s) et synchronisé(s) avec succès !`);
    } else {
      alert(`ℹ️ ${toInsert.length} élève(s) importé(s) localement (mode hors-ligne actif). Synchronisation automatique dès que le réseau est disponible.`);
    }
  });
}

// ==========================================================
// BULLETINS OFFICIELS
// ==========================================================
async function loadBulletinForStudent(matricule) {
  const student = APP_STATE.students.find(s => s.matricule === matricule);
  if (!student) return;

  const currentTrimester = document.getElementById("bulletin-filter-trimester")?.value || APP_STATE.currentTrimester;
  const classStudents = APP_STATE.students.filter(s => s.class === student.class);

  // 1. MÉTADONNÉES DE L'ÉLÈVE
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "-";
  };

  setEl("b-meta-matricule", student.matricule);
  setEl("b-meta-class", student.class);
  setEl("b-meta-dob", student.dob);
  setEl("b-meta-pob", student.pob);
  setEl("b-meta-gender", student.sex);
  setEl("b-meta-total-eff", classStudents.length);
  setEl("b-meta-trimester", currentTrimester);
  setEl("b-student-name", `${student.lastName} ${student.firstName}`);
  setEl("b-meta-status", student.status || "Passant");

  const dateBottom = document.getElementById("bulletin-date-bottom");
  if (dateBottom) {
    const today = new Date();
    dateBottom.textContent = today.toLocaleDateString("fr-FR");
  }

  // Enseignant titulaire de la classe
  const titulaire = APP_STATE.teachers.find(t => (t.classes || "").split(",").map(c => c.trim()).includes(student.class));
  setEl("bulletin-titulaire-name", titulaire ? titulaire.name : "Le Professeur Principal");

  // 2. NOTES DE L'ÉLÈVE POUR LE TRIMESTRE SÉLECTIONNÉ
  let studentGrades = APP_STATE.grades.filter(g => g.student_matricule === matricule && g.trimester === currentTrimester);

  let totalPoints = 0;
  let totalCoef = 0;

  // Calcul des rangs par matière par rapport à tous les élèves de la classe
  const tbody = document.getElementById("b-grades-tbody");
  if (tbody) {
    tbody.innerHTML = APP_STATE.subjects.map(sub => {
      const g = studentGrades.find(x => x.subject_name === sub.name);
      const interro = g ? Number(g.interro) || 0 : 0;
      const devoir = g ? Number(g.devoir) || 0 : 0;
      const compo = g ? Number(g.compo) || 0 : 0;
      const moyClasse = g ? (interro + devoir) / 2 : 0;
      const moyGene = g ? (moyClasse + compo) / 2 : 0;
      const coef = sub.coef || 1;
      const points = moyGene * coef;

      if (g) {
        totalPoints += points;
        totalCoef += coef;
      }

      // Calcul du vrai rang pour cette matière parmi tous les élèves de la même classe
      const classMoyList = classStudents.map(st => {
        const sg = APP_STATE.grades.find(x => x.student_matricule === st.matricule && x.subject_name === sub.name && x.trimester === currentTrimester);
        if (!sg) return { mat: st.matricule, moy: -1 };
        const mCls = ((Number(sg.interro) || 0) + (Number(sg.devoir) || 0)) / 2;
        const mGen = (mCls + (Number(sg.compo) || 0)) / 2;
        return { mat: st.matricule, moy: mGen };
      }).filter(item => item.moy >= 0);

      classMoyList.sort((a, b) => b.moy - a.moy);
      const rankIdx = classMoyList.findIndex(item => item.mat === matricule);
      const subjectRank = rankIdx >= 0 ? `${rankIdx + 1}e` : "-";

      // Professeur enseignant cette discipline
      const teacher = APP_STATE.teachers.find(t =>
        (t.subjects || "").includes(sub.name) &&
        (t.classes || "").split(",").map(c => c.trim()).includes(student.class)
      ) || APP_STATE.teachers.find(t => (t.subjects || "").includes(sub.name));

      const hasNotes = g !== undefined;

      return `
        <tr>
          <td class="col-matiere">${sub.name}</td>
          <td>${hasNotes ? interro.toFixed(2).replace('.', ',') : '-'}</td>
          <td>${hasNotes ? devoir.toFixed(2).replace('.', ',') : '-'}</td>
          <td><strong>${hasNotes ? moyClasse.toFixed(2).replace('.', ',') : '-'}</strong></td>
          <td>${hasNotes ? compo.toFixed(2).replace('.', ',') : '-'}</td>
          <td><strong>${hasNotes ? moyGene.toFixed(2).replace('.', ',') : '-'}</strong></td>
          <td>${coef}</td>
          <td><strong>${hasNotes ? points.toFixed(2).replace('.', ',') : '-'}</strong></td>
          <td>${hasNotes ? subjectRank : '-'}</td>
          <td class="col-apprec">${hasNotes ? suggestAppreciation(moyGene) : '-'}</td>
          <td class="col-prof">${teacher ? teacher.name : 'Le Professeur'}</td>
        </tr>
      `;
    }).join("");
  }

  // 3. MOYENNE DU TRIMESTRE ET RANG GÉNÉRAL
  const trimAverage = totalCoef > 0 ? (totalPoints / totalCoef) : 0;
  setEl("b-total-points", totalPoints > 0 ? totalPoints.toFixed(2).replace('.', ',') : "-");
  setEl("b-total-coef", totalCoef > 0 ? totalCoef.toString() : "-");
  setEl("b-trim-average", totalCoef > 0 ? trimAverage.toFixed(2).replace('.', ',') : "-");

  // Calcul du classement général de la classe pour ce trimestre
  const computeClassAveragesForTrimester = (trimName) => {
    return classStudents.map(st => {
      const sGrades = APP_STATE.grades.filter(g => g.student_matricule === st.matricule && g.trimester === trimName);
      if (sGrades.length === 0) return { matricule: st.matricule, avg: -1 };
      let pts = 0, cfs = 0;
      APP_STATE.subjects.forEach(sb => {
        const sg = sGrades.find(x => x.subject_name === sb.name);
        if (sg) {
          const mg = (((Number(sg.interro) || 0) + (Number(sg.devoir) || 0)) / 2 + (Number(sg.compo) || 0)) / 2;
          pts += mg * sb.coef;
          cfs += sb.coef;
        }
      });
      return { matricule: st.matricule, avg: cfs > 0 ? pts / cfs : -1 };
    }).filter(x => x.avg >= 0);
  };

  const rankedStudentsCurrentTrim = computeClassAveragesForTrimester(currentTrimester);
  rankedStudentsCurrentTrim.sort((a, b) => b.avg - a.avg);
  setEl("b-meta-ranked-eff", rankedStudentsCurrentTrim.length);

  const myRankIdx = rankedStudentsCurrentTrim.findIndex(x => x.matricule === matricule);
  const myRank = myRankIdx >= 0 ? `${myRankIdx + 1}e` : "-";
  setEl("b-trim-rank", myRank);

  // 4. RÉCAPITULATION DES 3 TRIMESTRES & ANNUEL
  const trimesters = [
    { num: 1, name: "1er Trimestre" },
    { num: 2, name: "2ème Trimestre" },
    { num: 3, name: "3ème Trimestre" }
  ];

  let sumAnnualAverages = 0;
  let countTrimestersWithGrades = 0;
  let totalAnnualAbsences = 0;

  trimesters.forEach(t => {
    const rankedList = computeClassAveragesForTrimester(t.name);
    rankedList.sort((a, b) => b.avg - a.avg);

    const studentScore = rankedList.find(x => x.matricule === matricule);
    const hasData = studentScore !== undefined;

    // Calcul des vraies heures d'absence pour l'élève sur cette période
    const studentAbsences = APP_STATE.attendance
      .filter(a => a.student_matricule === matricule)
      .reduce((sum, a) => sum + (Number(a.hours) || 0), 0);

    // Répartition d'absence par trimestre
    const trimAbsences = t.name === currentTrimester ? studentAbsences : 0;
    if (t.name === currentTrimester) totalAnnualAbsences = studentAbsences;

    if (hasData) {
      const avg = studentScore.avg;
      const rank = rankedList.findIndex(x => x.matricule === matricule) + 1;
      const max = rankedList[0]?.avg || 0;
      const min = rankedList[rankedList.length - 1]?.avg || 0;
      const classMean = rankedList.reduce((acc, c) => acc + c.avg, 0) / (rankedList.length || 1);

      sumAnnualAverages += avg;
      countTrimestersWithGrades++;

      setEl(`recap-t${t.num}-moy`, avg.toFixed(2).replace('.', ','));
      setEl(`recap-t${t.num}-rang`, `${rank}e / ${classStudents.length}`);
      setEl(`recap-t${t.num}-app`, suggestAppreciation(avg));
      setEl(`recap-t${t.num}-abs`, trimAbsences);
      setEl(`recap-t${t.num}-min`, min.toFixed(2).replace('.', ','));
      setEl(`recap-t${t.num}-avg`, classMean.toFixed(2).replace('.', ','));
      setEl(`recap-t${t.num}-max`, max.toFixed(2).replace('.', ','));
    } else {
      setEl(`recap-t${t.num}-moy`, "-");
      setEl(`recap-t${t.num}-rang`, "-");
      setEl(`recap-t${t.num}-app`, "-");
      setEl(`recap-t${t.num}-abs`, "0");
      setEl(`recap-t${t.num}-min`, "-");
      setEl(`recap-t${t.num}-avg`, "-");
      setEl(`recap-t${t.num}-max`, "-");
    }
  });

  // Calcul Annuel
  if (countTrimestersWithGrades > 0) {
    const annualAvg = sumAnnualAverages / countTrimestersWithGrades;
    setEl("recap-an-moy", annualAvg.toFixed(2).replace('.', ','));
    setEl("recap-an-app", suggestAppreciation(annualAvg));
    setEl("recap-an-abs", totalAnnualAbsences);
    setEl("bulletin-th-cell", annualAvg >= 12 ? "OUI" : "NON");
  } else {
    setEl("recap-an-moy", "-");
    setEl("recap-an-app", "-");
    setEl("recap-an-abs", "0");
    setEl("bulletin-th-cell", "-");
  }
}

function suggestAppreciation(note20) {
  if (note20 >= 18) return "Excellent travail";
  if (note20 >= 16) return "Très bien";
  if (note20 >= 14) return "Bien";
  if (note20 >= 12) return "Assez bien";
  if (note20 >= 10) return "Passable";
  if (note20 >= 8)  return "Insuffisant";
  if (note20 > 0)   return "Faible";
  return "-";
}

function setupBulletinFilters() {
  // Synchroniser la liste des classes avec les classes réelles existantes
  const classFilter = document.getElementById("bulletin-filter-class");
  if (classFilter) {
    const currentCls = classFilter.value;
    classFilter.innerHTML = APP_STATE.classes.map(c => `<option value="${c}">${c}</option>`).join("");
    if (currentCls && APP_STATE.classes.includes(currentCls)) {
      classFilter.value = currentCls;
    }
  }

  document.getElementById("bulletin-filter-class")?.addEventListener("change", () => {
    populateBulletinStudentDropdown();
  });

  document.getElementById("bulletin-filter-trimester")?.addEventListener("change", () => {
    const sel = document.getElementById("bulletin-select-student");
    if (sel?.value) loadBulletinForStudent(sel.value);
  });
}

function populateBulletinStudentDropdown() {
  const sel = document.getElementById("bulletin-select-student");
  const classFilter = document.getElementById("bulletin-filter-class");
  if (!sel) return;

  // Mise à jour des options de classe si besoin
  if (classFilter && classFilter.children.length === 0) {
    classFilter.innerHTML = APP_STATE.classes.map(c => `<option value="${c}">${c}</option>`).join("");
  }

  const currentCls = classFilter?.value || (APP_STATE.classes[0] || "6e");
  const classStudents = APP_STATE.students.filter(s => s.class === currentCls);

  sel.innerHTML = classStudents.map(s => 
    `<option value="${s.matricule}">${s.lastName} ${s.firstName} (${s.matricule})</option>`
  ).join("") || `<option value="">Aucun élève dans cette classe</option>`;

  sel.onchange = () => loadBulletinForStudent(sel.value);

  if (classStudents.length > 0) {
    loadBulletinForStudent(classStudents[0].matricule);
  }
}

// ==========================================================
// GESTION DES NOTES ENSEIGNANT
// ==========================================================
function setupTeacherGradeSection() {
  const btnSave = document.getElementById("btn-save-teacher-grades");
  const btnPrintSheet = document.getElementById("btn-print-teacher-gradesheet");
  const classSel = document.getElementById("teacher-select-class");
  const subjSel = document.getElementById("teacher-select-subject");
  const trimSel = document.getElementById("teacher-select-trimester");
  const searchInput = document.getElementById("teacher-search-student");

  [classSel, subjSel, trimSel].forEach(s => s?.addEventListener("change", filterTeacherGrades));
  searchInput?.addEventListener("input", filterTeacherGrades);

  btnSave?.addEventListener("click", async () => {
    btnSave.disabled = true;
    btnSave.textContent = "💾 Enregistrement en cours...";

    const inputs = document.querySelectorAll(".teacher-grade-row-input");
    const updates = [];

    inputs.forEach(row => {
      const mat = row.getAttribute("data-student");
      const interro = parseFloat(row.querySelector(".input-interro")?.value) || 0;
      const devoir = parseFloat(row.querySelector(".input-devoir")?.value) || 0;
      const compo = parseFloat(row.querySelector(".input-compo")?.value) || 0;
      const subName = subjSel.value || "Mathématiques";
      const trimester = trimSel.value || APP_STATE.currentTrimester;
      const moyClasse = (interro + devoir) / 2;
      const moyGene = (moyClasse + compo) / 2;
      const subObj = APP_STATE.subjects.find(s => s.name === subName) || { coef: 2 };
      const points = moyGene * subObj.coef;

      updates.push({
        student_matricule: mat,
        subject_name: subName,
        trimester: trimester,
        interro: interro,
        devoir: devoir,
        moy_classe: moyClasse,
        compo: compo,
        moy_gene: moyGene,
        coef: subObj.coef,
        points: points,
        appreciation: suggestAppreciation(moyGene),
        teacher_name: APP_STATE.currentUser?.name || "Enseignant"
      });
    });

    if (updates.length === 0) {
      btnSave.disabled = false;
      btnSave.textContent = "💾 Enregistrer les notes";
      alert("Aucune note à enregistrer.");
      return;
    }

    let saveSuccess = true;
    let errorMessage = "";

    if (db && navigator.onLine) {
      // Enregistrement direct avec vérification stricte du retour Supabase
      const { data, error } = await db
        .from("grades")
        .upsert(updates, { onConflict: "student_matricule,subject_name,trimester" })
        .select();

      if (error) {
        console.error("❌ Erreur Supabase lors de l'enregistrement des notes :", error);
        saveSuccess = false;
        errorMessage = error.message || "Erreur de base de données";
        // Mise en file d'attente pour synchronisation ultérieure
        updates.forEach(u => queueOfflineAction("UPSERT_GRADE", u));
      } else {
        console.log("✅ Notes confirmées enregistrées dans Supabase :", data);
      }
    } else {
      // Mode hors-ligne : mise en file d'attente
      updates.forEach(u => queueOfflineAction("UPSERT_GRADE", u));
    }

    // Mise à jour de l'état local dans tous les cas
    updates.forEach(u => {
      const idx = APP_STATE.grades.findIndex(
        g => g.student_matricule === u.student_matricule &&
             g.subject_name === u.subject_name &&
             g.trimester === u.trimester
      );
      if (idx >= 0) {
        APP_STATE.grades[idx] = { ...APP_STATE.grades[idx], ...u };
      } else {
        APP_STATE.grades.push(u);
      }
    });

    // Sauvegarde dans le cache local du navigateur pour éviter toute perte au rechargement
    try {
      localStorage.setItem("riviera_cached_grades", JSON.stringify(APP_STATE.grades));
    } catch (e) {
      console.warn("Impossible de mettre à jour le cache local des notes :", e);
    }

    btnSave.disabled = false;
    btnSave.textContent = "💾 Enregistrer les notes";

    calculateTeacherStats();
    renderAdminGradesView();

    if (saveSuccess) {
      alert("✅ Notes enregistrées et confirmées dans la base de données !");
    } else {
      alert("⚠️ Les notes ont été conservées localement, mais Supabase a signalé une erreur : " + errorMessage);
    }
  });

  btnPrintSheet?.addEventListener("click", prepareAndPrintGradeSheet);
}

function attachLiveGradeCalculation(row) {
  const inputs = row.querySelectorAll("input[type='number']");
  inputs.forEach(input => {
    input.addEventListener("input", () => {
      const interro = parseFloat(row.querySelector(".input-interro").value) || 0;
      const devoir = parseFloat(row.querySelector(".input-devoir").value) || 0;
      const compo = parseFloat(row.querySelector(".input-compo").value) || 0;
      const moy = ((interro + devoir) / 2 + compo) / 2;

      const moyDisplay = row.querySelector(".grade-calc-moy");
      const appDisplay = row.querySelector(".badge-apprec-suggest");
      if (moyDisplay) moyDisplay.textContent = moy.toFixed(2) + " / 20";
      if (appDisplay) appDisplay.textContent = suggestAppreciation(moy);
    });
  });
}

function filterTeacherGrades() {
  const tbody = document.getElementById("teacher-grades-tbody");
  if (!tbody) return;

  const currentCls = document.getElementById("teacher-select-class")?.value || (APP_STATE.classes[0] || "6e");
  const currentSub = document.getElementById("teacher-select-subject")?.value || (APP_STATE.subjects[0]?.name || "Mathématiques");
  const currentTrim = document.getElementById("teacher-select-trimester")?.value || APP_STATE.currentTrimester;
  const search = (document.getElementById("teacher-search-student")?.value || "").toLowerCase().trim();

  // VÉRIFICATION FIABLE ET INDESTRUCTIBLE DE LA CLÔTURE DU TRIMESTRE
  let isClosed = false;

  try {
    // 1. Vérification dans la liste dédiée des trimestres verrouillés
    const lockedList = JSON.parse(localStorage.getItem("riviera_locked_trimesters") || "[]");
    if (lockedList.includes(currentTrim)) {
      isClosed = true;
    }
  } catch (e) {}

  if (!isClosed) {
    try {
      // 2. Vérification dans le cache permanent des trimestres
      const cached = JSON.parse(localStorage.getItem("riviera_cached_trimesters") || "[]");
      const match = cached.find(t => t.name === currentTrim);
      if (match && match.closed) {
        isClosed = true;
      }
    } catch (e) {}
  }

  if (!isClosed) {
    // 3. Vérification dans la mémoire active
    const trimConfig = APP_STATE.trimestersConfig.find(t => t.name === currentTrim);
    if (trimConfig && trimConfig.closed) {
      isClosed = true;
    }
  }

  // Affichage ou masquage de l'alerte rouge
  const lockAlert = document.getElementById("teacher-grades-lock-alert");
  if (lockAlert) {
    lockAlert.classList.toggle("d-none", !isClosed);
  }

  // Blocage du bouton d'enregistrement
  const btnSave = document.getElementById("btn-save-teacher-grades");
  if (btnSave) {
    btnSave.disabled = isClosed;
    btnSave.style.opacity = isClosed ? "0.5" : "1";
    btnSave.style.cursor = isClosed ? "not-allowed" : "pointer";
    btnSave.title = isClosed ? "Ce trimestre est officiellement clôturé." : "Enregistrer les notes";
  }

  const students = APP_STATE.students.filter(s => {
    const matchCls = s.class === currentCls;
    const lName = (s.lastName || "").toLowerCase();
    const fName = (s.firstName || "").toLowerCase();
    const mat = (s.matricule || "").toLowerCase();
    const matchTxt = !search || lName.includes(search) || fName.includes(search) || mat.includes(search);
    return matchCls && matchTxt;
  });

  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Aucun élève trouvé pour la classe ${currentCls}.</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map((s, idx) => {
    const existing = APP_STATE.grades.find(g => g.student_matricule === s.matricule && g.subject_name === currentSub && g.trimester === currentTrim);
    const intVal = existing && existing.interro !== undefined ? existing.interro : "";
    const devVal = existing && existing.devoir !== undefined ? existing.devoir : "";
    const compVal = existing && existing.compo !== undefined ? existing.compo : "";
    const moyVal = existing && existing.moy_gene !== undefined ? Number(existing.moy_gene).toFixed(2) : "--";

    // Style de verrouillage visuel et physique
    const disabledAttr = isClosed ? 'disabled="disabled"' : '';
    const lockedStyle = isClosed ? 'background-color: #f1f5f9; cursor: not-allowed; color: #64748b; border-color: #cbd5e1;' : '';

    return `
      <tr class="teacher-grade-row-input" data-student="${s.matricule}">
        <td>${idx + 1}</td>
        <td><strong>${s.matricule}</strong></td>
        <td><strong>${s.lastName}</strong></td>
        <td>${s.firstName}</td>
        <td><input type="number" step="0.25" min="0" max="20" class="input-interro input-search" style="max-width:80px; ${lockedStyle}" value="${intVal}" ${disabledAttr}></td>
        <td><input type="number" step="0.25" min="0" max="20" class="input-devoir input-search" style="max-width:80px; ${lockedStyle}" value="${devVal}" ${disabledAttr}></td>
        <td><input type="number" step="0.25" min="0" max="20" class="input-compo input-search" style="max-width:80px; ${lockedStyle}" value="${compVal}" ${disabledAttr}></td>
        <td><strong class="grade-calc-moy">${moyVal} / 20</strong></td>
        <td><span class="badge badge-secondary badge-apprec-suggest">${existing ? suggestAppreciation(existing.moy_gene) : '-'}</span></td>
      </tr>
    `;
  }).join("");

  if (!isClosed) {
    document.querySelectorAll(".teacher-grade-row-input").forEach(row => attachLiveGradeCalculation(row));
  }
}

function prepareAndPrintGradeSheet() {
  const cls = document.getElementById("teacher-select-class")?.value || "6e";
  const sub = document.getElementById("teacher-select-subject")?.value || "Discipline";
  const trim = document.getElementById("teacher-select-trimester")?.value || APP_STATE.currentTrimester;
  const teacherName = APP_STATE.currentUser?.name || "Enseignant";
  const students = APP_STATE.students.filter(s => s.class === cls);

  document.getElementById("gs-meta-class").textContent = cls;
  document.getElementById("gs-meta-subject").textContent = sub;
  document.getElementById("gs-meta-trimester").textContent = trim;
  document.getElementById("gs-meta-teacher").textContent = teacherName;
  document.getElementById("gs-meta-count").textContent = `${students.length} élèves`;

  const tbody = document.getElementById("gs-table-tbody");
  tbody.innerHTML = students.map((s, idx) => {
    const existing = APP_STATE.grades.find(g => g.student_matricule === s.matricule && g.subject_name === sub && g.trimester === trim);
    const hasGrade = existing !== undefined;
    const intVal = hasGrade ? (Number(existing.interro) || 0).toFixed(2) : "-";
    const devVal = hasGrade ? (Number(existing.devoir) || 0).toFixed(2) : "-";
    const compVal = hasGrade ? (Number(existing.compo) || 0).toFixed(2) : "-";
    const moyVal = hasGrade ? (Number(existing.moy_gene) || 0).toFixed(2) : "-";
    const appVal = hasGrade ? suggestAppreciation(Number(existing.moy_gene) || 0) : "-";

    return `
      <tr>
        <td>${idx + 1}</td>
        <td>${s.matricule}</td>
        <td><strong>${s.lastName}</strong></td>
        <td>${s.firstName}</td>
        <td>${intVal}</td>
        <td>${devVal}</td>
        <td>${compVal}</td>
        <td><strong>${moyVal}</strong></td>
        <td>${appVal}</td>
      </tr>
    `;
  }).join("");

  document.body.classList.add("printing-gradesheet");
  window.print();
  window.addEventListener("afterprint", () => document.body.classList.remove("printing-gradesheet"), { once: true });
}

// ==========================================================
// CONSULTATION GLOBALE DES NOTES
// ==========================================================
function setupAdminGradesViewFilter() {
  populateAdminClassesFilter();
  populateAdminSubjectsFilter();

  ["admin-view-class-select", "admin-view-trimester-select", "admin-view-subject-select"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", renderAdminGradesView);
  });
  document.getElementById("admin-view-student-search")?.addEventListener("input", renderAdminGradesView);
}

function populateAdminClassesFilter() {
  const sel = document.getElementById("admin-view-class-select");
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = APP_STATE.classes.map(c => `<option value="${c}">${c}</option>`).join("");
  if (currentVal && APP_STATE.classes.includes(currentVal)) {
    sel.value = currentVal;
  }
}

function populateAdminSubjectsFilter() {
  const sel = document.getElementById("admin-view-subject-select");
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = `<option value="">Toutes les matières</option>` +
    APP_STATE.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
  if (currentVal) sel.value = currentVal;
}

function renderAdminGradesView() {
  const tbody = document.getElementById("admin-grades-view-tbody");
  if (!tbody) return;

  // S'assurer que le sélecteur de classe a bien les classes à jour
  const classSelect = document.getElementById("admin-view-class-select");
  if (classSelect && classSelect.children.length === 0) {
    populateAdminClassesFilter();
  }

  const currentCls = classSelect?.value || (APP_STATE.classes[0] || "6e");
  const currentTrim = document.getElementById("admin-view-trimester-select")?.value || APP_STATE.currentTrimester;
  const currentSub = document.getElementById("admin-view-subject-select")?.value || "";
  const search = (document.getElementById("admin-view-student-search")?.value || "").toLowerCase().trim();

  // Filtrage des élèves concernés
  const students = APP_STATE.students.filter(s => {
    const matchCls = s.class === currentCls;
    const lName = (s.lastName || "").toLowerCase();
    const fName = (s.firstName || "").toLowerCase();
    const mat = (s.matricule || "").toLowerCase();
    const matchTxt = !search || lName.includes(search) || fName.includes(search) || mat.includes(search);
    return matchCls && matchTxt;
  });

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">Aucun élève trouvé dans cette classe.</td></tr>`;
    return;
  }

  const rows = [];
  students.forEach(s => {
    // Récupération des notes depuis le cache local (100% hors-ligne)
    const studentGrades = APP_STATE.grades.filter(g =>
      g.student_matricule === s.matricule &&
      g.trimester === currentTrim &&
      (!currentSub || g.subject_name === currentSub)
    );

    if (studentGrades.length === 0) {
      if (!currentSub) {
        rows.push(`
          <tr>
            <td><strong>${s.matricule}</strong></td>
            <td><strong>${s.lastName}</strong></td>
            <td>${s.firstName}</td>
            <td colspan="8" class="text-muted">Aucune note enregistrée pour ce trimestre.</td>
          </tr>
        `);
      }
    } else {
      studentGrades.forEach(g => {
        const intVal = (Number(g.interro) || 0).toFixed(2).replace('.', ',');
        const devVal = (Number(g.devoir) || 0).toFixed(2).replace('.', ',');
        const moyCls = (Number(g.moy_classe) || 0).toFixed(2).replace('.', ',');
        const compVal = (Number(g.compo) || 0).toFixed(2).replace('.', ',');
        const moyGen = (Number(g.moy_gene) || 0).toFixed(2).replace('.', ',');
        const pts = (Number(g.points) || 0).toFixed(2).replace('.', ',');

        rows.push(`
          <tr>
            <td><strong>${s.matricule}</strong></td>
            <td><strong>${s.lastName}</strong></td>
            <td>${s.firstName}</td>
            <td><strong>${g.subject_name}</strong></td>
            <td>${intVal}</td>
            <td>${devVal}</td>
            <td><strong>${moyCls}</strong></td>
            <td>${compVal}</td>
            <td><strong>${moyGen}</strong></td>
            <td><strong>${pts}</strong></td>
            <td>${g.teacher_name || '-'}</td>
          </tr>
        `);
      });
    }
  });

  tbody.innerHTML = rows.join("") || `<tr><td colspan="11" class="text-center text-muted">Aucune note trouvée pour ces critères.</td></tr>`;
}

// ==========================================================
// PROGRAMMATION ÉVALUATION & COMPTE À REBOURS 12H
// ==========================================================
function setupTeacherEvaluationPrep() {
  document.getElementById("form-teacher-prep-eval")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newRequest = {
      id: Date.now(),
      teacher_name: APP_STATE.currentUser?.name || "Professeur",
      class_name: document.getElementById("prep-eval-class").value,
      subject_name: document.getElementById("prep-eval-subject").value,
      eval_date: document.getElementById("prep-eval-date").value,
      type: document.getElementById("prep-eval-type").value,
      title: document.getElementById("prep-eval-title").value.trim(),
      instructions: document.getElementById("prep-eval-instructions").value.trim(),
      created_at: new Date().toISOString(),
      status: "EN_ATTENTE",
      refusal_reason: null
    };

    if (db && navigator.onLine) {
      try { await db.from("eval_requests").insert([newRequest]); }
      catch (err) { queueOfflineAction("INSERT_EVAL", newRequest); }
    } else {
      queueOfflineAction("INSERT_EVAL", newRequest);
    }

    APP_STATE.evalRequests.unshift(newRequest);
 try { localStorage.setItem("riviera_cached_eval_requests", JSON.stringify(APP_STATE.evalRequests)); } catch (err) {}
 renderTeacherEvalRequests();
    renderAdminPendingRequests();
    alert("✅ Évaluation soumise à la Direction (Validation automatique dans 12h).");
    e.target.reset();
  });
}

function checkAuto12hEvaluations() {
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  const now = Date.now();

  APP_STATE.evalRequests.forEach(async (req) => {
    if (req.status === "EN_ATTENTE") {
      const elapsed = now - new Date(req.created_at).getTime();
      if (elapsed >= TWELVE_HOURS) {
        req.status = "AUTO_12H";
        const calendarEval = {
          title: req.title,
          class_name: req.class_name,
          subject_name: req.subject_name,
          eval_date: req.eval_date,
          type: req.type,
          instructions: req.instructions,
          created_by: `${req.teacher_name} (Auto 12h)`
        };
        if (db && navigator.onLine) {
          await db.from("eval_requests").update({ status: "AUTO_12H" }).eq("id", req.id);
          await db.from("evaluations").insert([calendarEval]);
        }
        APP_STATE.evaluations.push(calendarEval);
        renderCalendar();
      }
    }
  });

  renderAdminPendingRequests();
  renderTeacherEvalRequests();
}

function renderTeacherEvalRequests() {
  const tbodyRequests = document.getElementById("teacher-eval-requests-tbody");
  const tbodyDashboard = document.getElementById("teacher-dashboard-evals-tbody");

  const currentTeacher = APP_STATE.currentUser?.name;
  const myRequests = APP_STATE.evalRequests.filter(r => !currentTeacher || r.teacher_name === currentTeacher);

  // Fonction utilitaire pour générer le badge de décision
  const getDecisionBadge = (status) => {
    if (status === "ACCEPTE") return `<span class="badge badge-success bold">✔ Acceptée</span>`;
    if (status === "AUTO_12H") return `<span class="badge badge-success bold">✔ Validée (Auto 12h)</span>`;
    if (status === "REFUSE") return `<span class="badge badge-danger bold">✖ Refusée</span>`;
    return `<span class="badge badge-warning bold">⏳ En attente (12h)</span>`;
  };

  const getRemarque = (r) => {
    if (r.status === "REFUSE") return `<strong class="text-danger">${r.refusal_reason || 'Non précisé'}</strong>`;
    if (r.status === "ACCEPTE" || r.status === "AUTO_12H") return `<span class="text-success">Inscrite au calendrier</span>`;
    return `<span class="text-muted">En cours d'examen</span>`;
  };

  const rowsHtml = myRequests.map(r => `
    <tr>
      <td>${new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
      <td><strong>${r.class_name}</strong> <small class="text-muted">(${r.subject_name})</small></td>
      <td><strong>${r.eval_date}</strong></td>
      <td><span class="badge badge-secondary">${r.type}</span></td>
      <td>${getDecisionBadge(r.status)}</td>
      <td>${getRemarque(r)}</td>
    </tr>
  `).join("");

  // Rendu dans l'onglet "Programmer Évaluation"
  if (tbodyRequests) {
    tbodyRequests.innerHTML = rowsHtml || `<tr><td colspan="6" class="text-center text-muted">Aucune demande d'évaluation en cours.</td></tr>`;
  }

  // Rendu directement sur le Tableau de bord Enseignant
  if (tbodyDashboard) {
    tbodyDashboard.innerHTML = rowsHtml || `<tr><td colspan="6" class="text-center text-muted">Aucune évaluation soumise pour le moment.</td></tr>`;
  }
}

function setupTeacherDerogations() {
  document.getElementById("btn-open-derogation-modal")?.addEventListener("click", () => {
    document.getElementById("modal-derogation-teacher")?.classList.remove("d-none");
  });
  document.getElementById("btn-close-derogation-modal")?.addEventListener("click", () => {
    document.getElementById("modal-derogation-teacher")?.classList.add("d-none");
  });

  document.getElementById("form-teacher-new-derogation")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector("button[type='submit']");
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "⏳ Transmission en cours...";
    }

    const cls = document.getElementById("derog-class")?.value;
    const sub = document.getElementById("derog-subject")?.value;
    const eventDate = document.getElementById("derog-date")?.value;
    const reason = document.getElementById("derog-reason")?.value?.trim();

    if (!cls || !sub || !eventDate || !reason) {
      alert("Veuillez renseigner tous les champs de la dérogation.");
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Transmettre à la Direction";
      }
      return;
    }

    const payload = {
      teacher_name: APP_STATE.currentUser?.name || "Professeur",
      class_name: cls,
      subject_name: sub,
      event_date: eventDate,
      reason: reason,
      status: "EN_ATTENTE",
      refusal_reason: null,
      created_at: new Date().toISOString()
    };

    let saveSuccess = true;
    let errorMessage = "";
    let insertedRecord = { id: Date.now(), ...payload };

    if (db && navigator.onLine) {
      try {
        const { data, error } = await db.from("derogations").insert([payload]).select();
        if (error) {
          saveSuccess = false;
          errorMessage = error.message;
          queueOfflineAction("INSERT_DEROG", payload);
        } else if (data && data.length > 0) {
          insertedRecord = data[0];
        }
      } catch (err) {
        saveSuccess = false;
        errorMessage = err.message;
        queueOfflineAction("INSERT_DEROG", payload);
      }
    } else {
      queueOfflineAction("INSERT_DEROG", payload);
    }

    APP_STATE.derogations.unshift(insertedRecord);
    try { localStorage.setItem("riviera_cached_derogations", JSON.stringify(APP_STATE.derogations)); } catch (e) {}

    renderTeacherDerogations();
    renderAdminPendingRequests();

    document.getElementById("modal-derogation-teacher")?.classList.add("d-none");
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Transmettre à la Direction";
    }

    if (saveSuccess) {
      alert("✅ Demande de dérogation enregistrée et transmise à la Direction !");
      e.target.reset();
    } else {
      alert("⚠️ Dérogation conservée localement (mode hors-ligne actif).");
    }
  });
}

function renderTeacherDerogations() {
  const tbody = document.getElementById("teacher-derogations-tbody");
  if (!tbody) return;
  const myDerogs = APP_STATE.derogations.filter(d => !APP_STATE.currentUser?.name || d.teacher_name === APP_STATE.currentUser?.name);

  tbody.innerHTML = myDerogs.map(d => {
    let badge = `<span class="badge badge-warning">En attente</span>`;
    if (d.status === "ACCEPTE") badge = `<span class="badge badge-success">Acceptée</span>`;
    else if (d.status === "REFUSE") badge = `<span class="badge badge-danger">Refusée</span>`;

    return `
      <tr>
        <td>${new Date(d.created_at).toLocaleDateString("fr-FR")}</td>
        <td>${d.class_name} (${d.subject_name})</td>
        <td><strong>${d.event_date}</strong></td>
        <td>${d.reason}</td>
        <td>${badge}</td>
        <td>${d.refusal_reason || '-'}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="6" class="text-center text-muted">Aucune demande de dérogation.</td></tr>`;
}

function renderAdminPendingRequests() {
  const tbodyEvals = document.getElementById("admin-pending-evals-tbody");
  const tbodyDerogs = document.getElementById("admin-pending-derogs-tbody");

  if (tbodyEvals) {
    tbodyEvals.innerHTML = APP_STATE.evalRequests.map(r => {
      const elapsed = Date.now() - new Date(r.created_at).getTime();
      const remainingMs = Math.max(0, (12 * 3600 * 1000) - elapsed);
      const remainingHours = Math.floor(remainingMs / (3600 * 1000));
      const remainingMin = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));

      return `
        <tr>
          <td>${new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
          <td><strong>${r.teacher_name}</strong></td>
          <td>${r.class_name}</td>
          <td>${r.subject_name}</td>
          <td><strong>${r.eval_date}</strong> (${r.type})</td>
          <td>${r.status === 'EN_ATTENTE' ? `⏳ ${remainingHours}h ${remainingMin}m` : '-'}</td>
          <td><span class="badge ${r.status === 'ACCEPTE' || r.status === 'AUTO_12H' ? 'badge-success' : r.status === 'REFUSE' ? 'badge-danger' : 'badge-warning'}">${r.status}</span></td>
          <td class="text-center">
            ${r.status === 'EN_ATTENTE' ? `
              <button class="btn btn-sm btn-primary" onclick="adminDecideRequest(${r.id}, 'EVAL', true)">✔ Valider</button>
              <button class="btn btn-sm btn-outline-danger" onclick="openRefusalModal(${r.id}, 'EVAL')">✖ Refuser</button>
            ` : '-'}
          </td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="8" class="text-center text-muted">Aucune évaluation en attente.</td></tr>`;
  }

  if (tbodyDerogs) {
    tbodyDerogs.innerHTML = APP_STATE.derogations.map(d => `
      <tr>
        <td>${new Date(d.created_at).toLocaleDateString("fr-FR")}</td>
        <td><strong>${d.teacher_name}</strong></td>
        <td>${d.class_name} (${d.subject_name})</td>
        <td><strong>${d.event_date}</strong></td>
        <td>${d.reason}</td>
        <td><span class="badge ${d.status === 'ACCEPTE' ? 'badge-success' : d.status === 'REFUSE' ? 'badge-danger' : 'badge-warning'}">${d.status}</span></td>
        <td class="text-center">
          ${d.status === 'EN_ATTENTE' ? `
            <button class="btn btn-sm btn-primary" onclick="adminDecideRequest(${d.id}, 'DEROG', true)">✔ Accepter</button>
            <button class="btn btn-sm btn-outline-danger" onclick="openRefusalModal(${d.id}, 'DEROG')">✖ Refuser</button>
          ` : '-'}
        </td>
      </tr>
    `).join("") || `<tr><td colspan="7" class="text-center text-muted">Aucune dérogation en attente.</td></tr>`;
  }

  // Mise à jour automatique des deux cartes du Tableau de bord Admin
  renderDashboardPendingDerogations();
  renderDashboardPendingEvals();
}

// Fonction dédiée à l'affichage rapide des dérogations sur le Tableau de bord Admin
function renderDashboardPendingDerogations() {
  const tbody = document.getElementById("dashboard-pending-derogations-tbody");
  if (!tbody) return;

  const pending = APP_STATE.derogations.filter(d => d.status === "EN_ATTENTE");

  if (pending.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Aucune dérogation en attente d'approbation.</td></tr>`;
    return;
  }

  tbody.innerHTML = pending.map(d => `
    <tr>
      <td>${new Date(d.created_at).toLocaleDateString("fr-FR")}</td>
      <td><strong>${d.teacher_name}</strong></td>
      <td><span class="badge badge-primary">${d.class_name}</span> <small>${d.subject_name}</small></td>
      <td><strong>${d.event_date}</strong></td>
      <td>${d.reason}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-primary" onclick="adminDecideRequest(${d.id}, 'DEROG', true)" title="Accepter directement">✔ Accepter</button>
        <button class="btn btn-sm btn-outline-danger" onclick="openRefusalModal(${d.id}, 'DEROG')" title="Refuser avec motif">✖ Refuser</button>
      </td>
    </tr>
  `).join("");
}

// Fonction dédiée à l'affichage rapide des demandes d'évaluation sur le Tableau de bord Admin
function renderDashboardPendingEvals() {
  const tbody = document.getElementById("dashboard-pending-evals-tbody");
  if (!tbody) return;

  const pending = APP_STATE.evalRequests.filter(r => r.status === "EN_ATTENTE");

  if (pending.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Aucune demande d'évaluation en attente.</td></tr>`;
    return;
  }

  tbody.innerHTML = pending.map(r => {
    const elapsed = Date.now() - new Date(r.created_at).getTime();
    const remainingMs = Math.max(0, (12 * 3600 * 1000) - elapsed);
    const remainingHours = Math.floor(remainingMs / (3600 * 1000));
    const remainingMin = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));

    return `
      <tr>
        <td>${new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
        <td><strong>${r.teacher_name}</strong></td>
        <td><span class="badge badge-primary">${r.class_name}</span> <small>${r.subject_name}</small></td>
        <td><strong>${r.eval_date}</strong> (${r.type})</td>
        <td><span class="badge badge-warning">⏳ ${remainingHours}h ${remainingMin}m</span></td>
        <td class="text-center">
          <button class="btn btn-sm btn-primary" onclick="adminDecideRequest(${r.id}, 'EVAL', true)" title="Valider directement">✔ Valider</button>
          <button class="btn btn-sm btn-outline-danger" onclick="openRefusalModal(${r.id}, 'EVAL')" title="Refuser avec motif">✖ Refuser</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.adminDecideRequest = async function(id, type, accept) {
  const targetId = isNaN(id) ? id : Number(id);

  if (accept) {
    if (type === "EVAL") {
      const req = APP_STATE.evalRequests.find(x => String(x.id) === String(id));
      if (req) {
        req.status = "ACCEPTE";

        const cal = {
          title: req.title,
          class_name: req.class_name,
          subject_name: req.subject_name,
          eval_date: req.eval_date,
          type: req.type,
          instructions: req.instructions || "",
          created_by: req.teacher_name
        };

        // Sauvegarde définitive dans Supabase
        if (db && navigator.onLine) {
          try {
            const { error: upErr } = await db.from("eval_requests").update({ status: "ACCEPTE" }).eq("id", targetId);
            if (upErr) console.error("❌ Erreur validation eval_requests Supabase :", upErr);

            const { data: calData, error: calErr } = await db.from("evaluations").insert([cal]).select();
            if (!calErr && calData && calData.length > 0) cal.id = calData[0].id;
          } catch (e) {
            console.error("Exception validation évaluation :", e);
          }
        }

        APP_STATE.evaluations.push(cal);
        try {
          localStorage.setItem("riviera_cached_eval_requests", JSON.stringify(APP_STATE.evalRequests));
          localStorage.setItem("riviera_cached_evaluations", JSON.stringify(APP_STATE.evaluations));
        } catch (e) {}

        renderCalendar();
      }
    } else {
      // DÉROGATION ACCEPTÉE
      const d = APP_STATE.derogations.find(x => String(x.id) === String(id));
      if (d) {
        d.status = "ACCEPTE";

        // Sauvegarde définitive dans Supabase
        if (db && navigator.onLine) {
          try {
            const { error: derErr } = await db.from("derogations").update({ status: "ACCEPTE" }).eq("id", targetId);
            if (derErr) console.error("❌ Erreur validation dérogation Supabase :", derErr);
          } catch (e) {
            console.error("Exception validation dérogation :", e);
          }
        }

        try {
          localStorage.setItem("riviera_cached_derogations", JSON.stringify(APP_STATE.derogations));
        } catch (e) {}
      }
    }

    // RETRAIT DÉFINITIF DU TABLEAU DE BORD ADMIN
    renderAdminPendingRequests();
    renderDashboardPendingDerogations();
    renderDashboardPendingEvals();
    renderTeacherEvalRequests();
    renderTeacherDerogations();

    // Signal temps réel immédiat vers l'Espace Enseignant
    try {
      const channel = new BroadcastChannel("riviera_school_sync");
      channel.postMessage({ type: "REQUEST_DECIDED", id: targetId, reqType: type, status: "ACCEPTE" });
    } catch (e) {}
  }
};

window.openRefusalModal = function(id, type) {
  document.getElementById("refusal-target-id").value = id;
  document.getElementById("refusal-target-type").value = type;
  document.getElementById("refusal-reason-text").value = "";
  document.getElementById("modal-refusal-reason")?.classList.remove("d-none");
};

document.getElementById("btn-close-refusal-modal")?.addEventListener("click", () => {
  document.getElementById("modal-refusal-reason")?.classList.add("d-none");
});

document.getElementById("btn-confirm-refusal")?.addEventListener("click", async () => {
  const rawId = document.getElementById("refusal-target-id")?.value;
  const targetId = isNaN(rawId) ? rawId : Number(rawId);
  const type = document.getElementById("refusal-target-type")?.value;
  const reason = document.getElementById("refusal-reason-text")?.value?.trim();

  if (!reason) return alert("Le motif de refus est obligatoire.");

  if (type === "EVAL") {
    const req = APP_STATE.evalRequests.find(x => String(x.id) === String(rawId));
    if (req) {
      req.status = "REFUSE";
      req.refusal_reason = reason;

      if (db && navigator.onLine) {
        try {
          const { error } = await db.from("eval_requests").update({ status: "REFUSE", refusal_reason: reason }).eq("id", targetId);
          if (error) console.error("❌ Erreur refus eval_requests Supabase :", error);
        } catch (e) {}
      }

      try {
        localStorage.setItem("riviera_cached_eval_requests", JSON.stringify(APP_STATE.evalRequests));
      } catch (e) {}
    }
  } else {
    // DÉROGATION REFUSÉE
    const d = APP_STATE.derogations.find(x => String(x.id) === String(rawId));
    if (d) {
      d.status = "REFUSE";
      d.refusal_reason = reason;

      if (db && navigator.onLine) {
        try {
          const { error } = await db.from("derogations").update({ status: "REFUSE", refusal_reason: reason }).eq("id", targetId);
          if (error) console.error("❌ Erreur refus dérogation Supabase :", error);
        } catch (e) {}
      }

      try {
        localStorage.setItem("riviera_cached_derogations", JSON.stringify(APP_STATE.derogations));
      } catch (e) {}
    }
  }

  document.getElementById("modal-refusal-reason")?.classList.add("d-none");

  // RETRAIT DÉFINITIF DU TABLEAU DE BORD ADMIN
  renderAdminPendingRequests();
  renderDashboardPendingDerogations();
  renderDashboardPendingEvals();
  renderTeacherEvalRequests();
  renderTeacherDerogations();

  // Signal temps réel immédiat vers l'Espace Enseignant
  try {
    const channel = new BroadcastChannel("riviera_school_sync");
    channel.postMessage({ type: "REQUEST_DECIDED", id: targetId, reqType: type, status: "REFUSE", reason });
  } catch (e) {}
});

// ==========================================================
// TRIMESTRES & PARAMÈTRES
// ==========================================================
function setupTrimesterSettings() {
  const form = document.getElementById("form-admin-trimesters-dates");
  const toggleBulletin = document.getElementById("toggle-admin-allow-prof-bulletin-print");
if (toggleBulletin) toggleBulletin.checked = APP_STATE.allowProfBulletinPrint;

toggleBulletin?.addEventListener("change", (e) => {
 APP_STATE.allowProfBulletinPrint = e.target.checked;
 try { localStorage.setItem("riviera_allow_prof_bulletin", String(APP_STATE.allowProfBulletinPrint)); } catch (err) {}
 updateTeacherBulletinNavVisibility();
});

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    APP_STATE.trimestersConfig[0].start = document.getElementById("trim-t1-start").value;
    APP_STATE.trimestersConfig[0].end = document.getElementById("trim-t1-end").value;
    APP_STATE.trimestersConfig[1].start = document.getElementById("trim-t2-start").value;
    APP_STATE.trimestersConfig[1].end = document.getElementById("trim-t2-end").value;
    APP_STATE.trimestersConfig[2].start = document.getElementById("trim-t3-start").value;
    APP_STATE.trimestersConfig[2].end = document.getElementById("trim-t3-end").value;

    try {
      localStorage.setItem("riviera_cached_trimesters", JSON.stringify(APP_STATE.trimestersConfig));
    } catch (err) {}

    detectActiveTrimester();
    if (db && navigator.onLine) {
      for (const tc of APP_STATE.trimestersConfig) {
        try { await db.from("trimesters_config").upsert(tc); } catch (err) {}
      }
    }
    alert("✅ Dates des trimestres enregistrées avec succès !");
  });

  // Initialisation et affichage immédiat de l'état des 3 trimestres
  detectActiveTrimester();
}

// FONCTION DE CLÔTURE / DÉVERROUILLAGE EN 1 CLIC (DIRECTION)
window.toggleTrimesterLock = async function(trimId) {
  const trim = APP_STATE.trimestersConfig.find(t => t.id === trimId);
  if (!trim) return;

  // Inversion de l'état (verrouillé <-> déverrouillé)
  trim.closed = !trim.closed;

  // Sauvegarde permanente dans les deux clés de stockage
  const lockedList = APP_STATE.trimestersConfig.filter(t => t.closed).map(t => t.name);

  try {
    localStorage.setItem("riviera_cached_trimesters", JSON.stringify(APP_STATE.trimestersConfig));
    localStorage.setItem("riviera_locked_trimesters", JSON.stringify(lockedList));
  } catch (e) {}

  // ÉMISSION INSTANTANÉE DU SIGNAL VERS TOUTES LES FENÊTRES PROFESSEURS SANS ACTUALISATION
  try {
    const channel = new BroadcastChannel("riviera_school_sync");
    channel.postMessage({
      type: "TRIMESTER_LOCK_CHANGED",
      trimId: trimId,
      trimesterName: trim.name,
      closed: trim.closed
    });
  } catch (e) {}

  // Synchronisation avec Supabase si connecté
ensureSupabaseClient();
if (db && navigator.onLine) {
 try {
   await db.from("trimesters_config").upsert(trim);
 } catch (e) { queueOfflineAction("UPSERT_TRIMESTER", trim); }
} else {
 queueOfflineAction("UPSERT_TRIMESTER", trim);
}

  // Actualisation immédiate sur la fenêtre en cours
  detectActiveTrimester();
  filterTeacherGrades();

  const statusMsg = trim.closed ? "🔒 Clôturé (Verrouillé)" : "🔓 Ouvert pour la saisie des notes";
  alert(`✅ Le ${trim.name} est désormais : ${statusMsg} !`);
};

function detectActiveTrimester() {
  const todayStr = new Date().toISOString().slice(0, 10);
  let activeFound = false;

  APP_STATE.trimestersConfig.forEach(t => {
    const badgeEl = document.getElementById(`badge-trim-t${t.id}-status`);
    const btnEl = document.getElementById(`btn-toggle-trim-${t.id}`);
    const startInput = document.getElementById(`trim-t${t.id}-start`);
    const endInput = document.getElementById(`trim-t${t.id}-end`);

    // Pré-remplissage des dates configurées
    if (startInput && t.start) startInput.value = t.start;
    if (endInput && t.end) endInput.value = t.end;

    const isClosed = Boolean(t.closed);

    if (isClosed) {
      if (badgeEl) {
        badgeEl.textContent = "🔒 Clôturé (Verrouillé)";
        badgeEl.className = "badge badge-danger";
      }
      if (btnEl) {
        btnEl.textContent = `🔓 Ré-ouvrir le ${t.id === 1 ? '1er' : t.id + 'ème'} Trimestre`;
        btnEl.className = "btn btn-sm btn-outline-success";
      }
    } else {
      // Trimestre ouvert
      if (todayStr >= t.start && todayStr <= t.end) {
        APP_STATE.currentTrimester = t.name;
        activeFound = true;
        if (badgeEl) {
          badgeEl.textContent = "Actif (Ouvert)";
          badgeEl.className = "badge badge-success";
        }
      } else {
        if (badgeEl) {
          badgeEl.textContent = "Ouvert (À venir)";
          badgeEl.className = "badge badge-secondary";
        }
      }

      if (btnEl) {
        btnEl.textContent = `🔒 Clôturer le ${t.id === 1 ? '1er' : t.id + 'ème'} Trimestre`;
        btnEl.className = "btn btn-sm btn-outline-danger";
      }
    }
  });

  if (!activeFound) {
    const firstOpen = APP_STATE.trimestersConfig.find(t => !t.closed);
    if (firstOpen) APP_STATE.currentTrimester = firstOpen.name;
  }

  const topBadge = document.getElementById("topbar-current-trimester");
  if (topBadge) topBadge.textContent = APP_STATE.currentTrimester;
  const kpiEl = document.getElementById("kpi-active-trimester");
  if (kpiEl) kpiEl.textContent = APP_STATE.currentTrimester.slice(0, 3);
}

// ==========================================================
// AFFICHER / MASQUER LES CODES D'ACCÈS (ICÔNE ŒIL)
// ==========================================================
function setupPasswordVisibilityToggles() {
  document.querySelectorAll(".btn-toggle-password").forEach(btn => {
    btn.addEventListener("click", () => {
      const wrapper = btn.closest(".password-input-wrapper");
      const input = wrapper?.querySelector("input");
      if (!input) return;

      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.textContent = isHidden ? "🙈" : "👁️";
      btn.setAttribute("aria-label", isHidden ? "Masquer le code d'accès" : "Afficher le code d'accès");
      btn.title = isHidden ? "Masquer le code" : "Afficher le code";
    });
  });
}

function resetPasswordInputsVisibility() {
  document.querySelectorAll(".password-input-wrapper").forEach(wrapper => {
    const input = wrapper.querySelector("input");
    const btn = wrapper.querySelector(".btn-toggle-password");
    if (input) input.type = "password";
    if (btn) {
      btn.textContent = "👁️";
      btn.setAttribute("aria-label", "Afficher le code d'accès");
      btn.title = "Afficher / Masquer le code";
    }
  });
}

// ==========================================================
// GESTION DES MOTS DE PASSE
// ==========================================================
function setupPasswordModals() {
  // 1. MODALE DU BOUTON CLÉ 🔑 DANS LA BARRE DU HAUT (POUR ADMIN ET PROFESSEUR)
  document.getElementById("btn-open-pwd-modal-top")?.addEventListener("click", () => {
    document.getElementById("modal-top-change-pwd")?.classList.remove("d-none");
  });
  document.getElementById("btn-close-top-pwd")?.addEventListener("click", () => {
    document.getElementById("modal-top-change-pwd")?.classList.add("d-none");
  });

  document.getElementById("form-top-change-pwd")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const oldCode = document.getElementById("top-old-code")?.value;
    const newCode = document.getElementById("top-new-code")?.value;
    const confirmCode = document.getElementById("top-confirm-code")?.value;

    if (!newCode || newCode.length < 4) {
      return alert("Le nouveau code d'accès doit contenir au moins 4 caractères.");
    }
    if (newCode !== confirmCode) {
      return alert("La confirmation ne correspond pas au nouveau code d'accès.");
    }

    // A. Cas DIRECTION (ADMIN)
    if (APP_STATE.currentUser?.role === "admin") {
      const currentValidCode = APP_STATE.adminAccessCode || "admin123";
      if (oldCode !== currentValidCode) {
        return alert("Ancien code Administrateur incorrect.");
      }

      APP_STATE.adminAccessCode = newCode;
      try {
        localStorage.setItem("riviera_admin_code", newCode);
      } catch (err) {}

      document.getElementById("modal-top-change-pwd")?.classList.add("d-none");
      e.target.reset();
      alert("✅ Code d'accès Direction mis à jour avec succès !");
      return;
    }

    // B. Cas ENSEIGNANT
    const teacher = APP_STATE.currentUser?.teacherObj || APP_STATE.teachers.find(t => t.id === APP_STATE.currentUser?.id);
    if (teacher) {
      const currentValidCode = teacher.access_code || "prof123";
      if (oldCode !== currentValidCode) {
        return alert("Ancien code d'accès enseignant incorrect.");
      }

      teacher.access_code = newCode;

      // Sauvegarde locale permanente
      try {
        localStorage.setItem("riviera_cached_teachers", JSON.stringify(APP_STATE.teachers));
      } catch (err) {}

      // Sauvegarde dans Supabase avec support hors-ligne
      if (db && navigator.onLine) {
        try {
          const { error } = await db.from("teachers").update({ access_code: newCode }).eq("id", teacher.id);
          if (error) queueOfflineAction("UPDATE_TEACHER", { id: teacher.id, access_code: newCode });
        } catch (err) {
          queueOfflineAction("UPDATE_TEACHER", { id: teacher.id, access_code: newCode });
        }
      } else {
        queueOfflineAction("UPDATE_TEACHER", { id: teacher.id, access_code: newCode });
      }

      document.getElementById("modal-top-change-pwd")?.classList.add("d-none");
      e.target.reset();
      alert(`✅ Code d'accès de ${teacher.name} mis à jour avec succès !`);
    }
  });

  // 2. FORMULAIRE DANS L'ESPACE ENSEIGNANT ("🔑 Mon Code d'accès")
  document.getElementById("form-change-access-code")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const oldCode = document.getElementById("input-old-access-code")?.value;
    const newCode = document.getElementById("input-new-access-code")?.value;
    const confirmCode = document.getElementById("input-confirm-access-code")?.value;
    const msg = document.getElementById("msg-code-change");
    const err = document.getElementById("err-code-change");

    if (err) err.classList.add("d-none");
    if (msg) msg.classList.add("d-none");

    if (!newCode || newCode.length < 4) {
      if (err) {
        err.textContent = "Le nouveau code doit contenir au moins 4 caractères.";
        err.classList.remove("d-none");
      }
      return;
    }

    if (newCode !== confirmCode) {
      if (err) {
        err.textContent = "La confirmation ne correspond pas au nouveau code.";
        err.classList.remove("d-none");
      }
      return;
    }

    const teacher = APP_STATE.currentUser?.teacherObj || APP_STATE.teachers.find(t => t.id === APP_STATE.currentUser?.id);
    if (!teacher) return;

    const currentValidCode = teacher.access_code || "prof123";
    if (oldCode !== currentValidCode) {
      if (err) {
        err.textContent = "Ancien code d'accès incorrect.";
        err.classList.remove("d-none");
      }
      return;
    }

    teacher.access_code = newCode;

    // Sauvegarde permanente dans le cache local
    try {
      localStorage.setItem("riviera_cached_teachers", JSON.stringify(APP_STATE.teachers));
    } catch (e) {}

    // Mise à jour Supabase + file d'attente hors-ligne
    if (db && navigator.onLine) {
      try {
        const { error } = await db.from("teachers").update({ access_code: newCode }).eq("id", teacher.id);
        if (error) queueOfflineAction("UPDATE_TEACHER", { id: teacher.id, access_code: newCode });
      } catch (fetchErr) {
        queueOfflineAction("UPDATE_TEACHER", { id: teacher.id, access_code: newCode });
      }
    } else {
      queueOfflineAction("UPDATE_TEACHER", { id: teacher.id, access_code: newCode });
    }

    if (msg) {
      msg.textContent = "✅ Votre code d'accès a été modifié avec succès !";
      msg.classList.remove("d-none");
      setTimeout(() => msg?.classList.add("d-none"), 4000);
    }

    e.target.reset();
    resetPasswordInputsVisibility();
  });
}

// ==========================================================
// SAUVEGARDE & RESTAURATION
// ==========================================================
function setupBackupAndRestore() {
  document.getElementById("btn-export-full-backup")?.addEventListener("click", () => {
    const fullBackup = {
      institution: "Complexe Scolaire RIVIERA II",
      backup_timestamp: new Date().toISOString(),
      academic_year: APP_STATE.academicYear,
      data: {
        classes: APP_STATE.classes,
        subjects: APP_STATE.subjects,
        teachers: APP_STATE.teachers,
        students: APP_STATE.students,
        grades: APP_STATE.grades,
        evaluations: APP_STATE.evaluations,
        timetables: APP_STATE.timetables,
        trimesters: APP_STATE.trimestersConfig
      }
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const dl = document.createElement("a");
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `riviera_backup_${new Date().toISOString().slice(0, 10)}.json`);
    dl.click();
    dl.remove();
  });

  document.getElementById("btn-open-restore-modal")?.addEventListener("click", () => document.getElementById("modal-restore-backup")?.classList.remove("d-none"));
  document.getElementById("btn-close-restore-modal")?.addEventListener("click", () => document.getElementById("modal-restore-backup")?.classList.add("d-none"));

  const fileInput = document.getElementById("restore-backup-file");
  const adminCodeInput = document.getElementById("restore-admin-code");
  const btnExec = document.getElementById("btn-execute-restore");

  const checkRestoreReady = () => {
    btnExec.disabled = !(fileInput.files.length > 0 && adminCodeInput.value.length >= 4);
  };
  fileInput?.addEventListener("change", checkRestoreReady);
  adminCodeInput?.addEventListener("input", checkRestoreReady);

  btnExec?.addEventListener("click", () => {
    if (adminCodeInput.value !== APP_STATE.adminAccessCode) return alert("Code Administrateur incorrect.");

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.data || !parsed.data.students) throw new Error("Format de sauvegarde invalide.");
        if (confirm("⚠️ Confirmation : Remplacer toutes les données actuelles ?")) {
          APP_STATE.students = parsed.data.students;
          APP_STATE.grades = parsed.data.grades || [];
          APP_STATE.teachers = parsed.data.teachers || [];
          APP_STATE.evaluations = parsed.data.evaluations || [];
          APP_STATE.timetables = parsed.data.timetables || [];
          try {
            localStorage.setItem("riviera_cached_students", JSON.stringify(APP_STATE.students));
            localStorage.setItem("riviera_cached_teachers", JSON.stringify(APP_STATE.teachers));
            localStorage.setItem("riviera_cached_timetables", JSON.stringify(APP_STATE.timetables));
          } catch (err) {}
          refreshUI();
          alert("✅ Restauration réussie !");
          document.getElementById("modal-restore-backup")?.classList.add("d-none");
        }
      } catch (err) {
        alert("Erreur de sauvegarde : " + err.message);
      }
    };
    reader.readAsText(file);
  });
}

function setupPrintButtons() {
  document.getElementById("btn-print-bulletin")?.addEventListener("click", () => window.print());
}

// ==========================================================
// COMMUNICATIONS & ANNONCES
// ==========================================================
function setupAnnouncementSystem() {
  const modal = document.getElementById("modal-announcement-admin");
  const targetSelect = document.getElementById("modal-ann-target");

  // Remplissage dynamique des destinataires selon les classes réelles
  document.getElementById("btn-open-announcement-modal")?.addEventListener("click", () => {
    if (targetSelect) {
      targetSelect.innerHTML = `<option value="ALL">📢 Tous les professeurs</option>` +
        APP_STATE.classes.map(c => `<option value="${c}">Professeurs de ${c}</option>`).join("");
    }
    modal?.classList.remove("d-none");
  });

  document.getElementById("btn-close-announcement-modal")?.addEventListener("click", () => modal?.classList.add("d-none"));

  // Publication d'une annonce (Direction)
  document.getElementById("form-admin-new-announcement")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector("button[type='submit']");
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "⏳ Diffusion en cours...";
    }

    const title = document.getElementById("modal-ann-title")?.value.trim();
    const target = document.getElementById("modal-ann-target")?.value || "ALL";
    const content = document.getElementById("modal-ann-content")?.value.trim();

    if (!title || !content) {
      alert("Veuillez renseigner un titre et un contenu.");
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Diffuser l'annonce";
      }
      return;
    }

    const ann = {
      id: Date.now(),
      title: title,
      target_audience: target,
      content: content,
      author: "Direction",
      created_at: new Date().toISOString()
    };

    // Sauvegarde immédiate dans l'état et le cache local (100% hors-ligne)
    APP_STATE.announcements.unshift(ann);
    try {
      localStorage.setItem("riviera_cached_announcements", JSON.stringify(APP_STATE.announcements));
    } catch (err) {}

    // Ajout d'une notification locale
    APP_STATE.notifications.unshift({
      id: Date.now(),
      type: "ANNONCE",
      message: `Direction : ${ann.title}`,
      created_at: new Date().toISOString()
    });

    // Envoi en ligne ou mise en file d'attente hors-ligne
    if (db && navigator.onLine) {
      try {
        const { data, error } = await db.from("announcements").insert([ann]).select();
        if (!error && data && data.length > 0) ann.id = data[0].id;

        // Diffusion d'une notification générale
        await db.from("notifications").insert([{
          type: "COMMUNIQUÉ",
          message: `${ann.title} : ${ann.content.slice(0, 80)}...`,
          recipient_role: "TEACHER"
        }]);
      } catch (err) {
        queueOfflineAction("INSERT_ANNOUNCEMENT", ann);
      }
    } else {
      queueOfflineAction("INSERT_ANNOUNCEMENT", ann);
    }

    // ÉMISSION INSTANTANÉE EN DIRECT SANS ACTUALISATION VERS TOUTES LES FENÊTRES PROFESSEURS
    try {
      const channel = new BroadcastChannel("riviera_school_sync");
      channel.postMessage({
        type: "NEW_ANNOUNCEMENT",
        announcement: ann
      });
    } catch (err) {}

    renderAnnouncements();
    renderNotifications();

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Diffuser l'annonce";
    }

    modal?.classList.add("d-none");
    e.target.reset();
    alert("✅ Communiqué diffusé en temps réel avec succès !");
  });

  // Cloche des notifications
  const notifBell = document.getElementById("btn-notifications-bell");
  const notifPanel = document.getElementById("notif-dropdown-panel");

  notifBell?.addEventListener("click", (e) => {
    e.stopPropagation();
    notifPanel?.classList.toggle("d-none");
  });

  document.addEventListener("click", (e) => {
    if (notifPanel && !notifPanel.classList.contains("d-none")) {
      if (!e.target.closest(".notif-wrapper")) {
        notifPanel.classList.add("d-none");
      }
    }
  });

  document.getElementById("btn-clear-notifs")?.addEventListener("click", async () => {
    if (db && navigator.onLine) {
      try {
        await db.from("notifications").update({ is_read: true }).eq("is_read", false);
      } catch (e) {}
    }
    APP_STATE.notifications = [];
    renderNotifications();
    notifPanel?.classList.add("d-none");
  });
}

function renderAnnouncements() {
  const adminList = document.getElementById("announcements-admin-tbody");
  const teacherList = document.getElementById("teacher-announcements-list");
  const dashList = document.getElementById("dashboard-announcements-stream");

  // Affichage dans le tableau d'administration des annonces
  if (adminList) {
    adminList.innerHTML = APP_STATE.announcements.map(a => `
      <tr>
        <td>${new Date(a.created_at || Date.now()).toLocaleDateString("fr-FR")}</td>
        <td><strong>${a.title}</strong></td>
        <td>${a.content}</td>
        <td><span class="badge badge-primary">${a.target_audience === 'ALL' ? 'Tous les profs' : `Professeurs de ${a.target_audience}`}</span></td>
        <td>${a.author || 'Direction'}</td>
        <td class="text-center"><button class="btn btn-sm btn-outline-danger" onclick="deleteAnnouncement(${a.id})" title="Supprimer">✕</button></td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="text-center text-muted">Aucune annonce publiée.</td></tr>`;
  }

  // Affichage sur le tableau de bord Direction
  if (dashList) {
    dashList.innerHTML = APP_STATE.announcements.slice(0, 3).map(a => `
      <li><strong>${a.title}</strong> : <p class="text-muted small">${a.content}</p></li>
    `).join("") || `<li class="text-muted">Aucun communiqué publié.</li>`;
  }

  // Affichage en direct sur l'Espace Enseignant (filtré selon ses classes ou pour tous)
  if (teacherList) {
    const profClasses = (APP_STATE.currentUser?.teacherObj?.classes || "").split(",").map(c => c.trim());
    const relevant = APP_STATE.announcements.filter(a =>
      a.target_audience === "ALL" ||
      profClasses.includes(a.target_audience) ||
      !APP_STATE.currentUser?.teacherObj
    );

    teacherList.innerHTML = relevant.map(a => `
      <li style="padding: 10px 0; border-bottom: 1px solid var(--border-color);">
        <div class="flex-between mb-1">
          <span class="badge badge-primary">${a.target_audience === 'ALL' ? 'Tous les professeurs' : `Classe de ${a.target_audience}`}</span>
          <small class="text-muted">${new Date(a.created_at || Date.now()).toLocaleDateString("fr-FR")}</small>
        </div>
        <strong style="color: var(--primary-deep); font-size: 1rem;">${a.title}</strong>
        <p class="text-muted mt-1" style="font-size: 0.92rem; line-height: 1.4;">${a.content}</p>
      </li>
    `).join("") || `<li class="text-muted">Aucun nouveau communiqué pour vos classes.</li>`;
  }
}

window.deleteAnnouncement = async function(id) {
  if (confirm("Confirmez-vous la suppression de ce communiqué ?")) {
    ensureSupabaseClient();
 if (db && navigator.onLine) {
   try { await db.from("announcements").delete().eq("id", id); } catch (e) { queueOfflineAction("DELETE_ANNOUNCEMENT", { id }); }
 } else {
   queueOfflineAction("DELETE_ANNOUNCEMENT", { id });
 }

    APP_STATE.announcements = APP_STATE.announcements.filter(x => x.id !== id);
    try {
      localStorage.setItem("riviera_cached_announcements", JSON.stringify(APP_STATE.announcements));
    } catch (e) {}

    // Émission du retrait en direct
    try {
      const channel = new BroadcastChannel("riviera_school_sync");
      channel.postMessage({ type: "DELETE_ANNOUNCEMENT", id });
    } catch (e) {}

    renderAnnouncements();
  }
};

// GESTIONNAIRE UNIVERSEL DE NOTIFICATIONS (LOCAL + SUPABASE + BROADCAST EN DIRECT)
window.pushNotification = async function(type, message, targetRole = "ALL") {
  const notif = {
    id: Date.now() + Math.random(),
    type: type,
    message: message,
    recipient_role: targetRole,
    created_at: new Date().toISOString()
  };

  // Ajout immédiat en mémoire locale
  APP_STATE.notifications.unshift(notif);
  try {
    localStorage.setItem("riviera_cached_notifications", JSON.stringify(APP_STATE.notifications));
  } catch (e) {}

  // Envoi dans Supabase si connecté
  if (db && navigator.onLine) {
    try {
      await db.from("notifications").insert([{
        type: type,
        message: message,
        recipient_role: targetRole
      }]);
    } catch (e) {}
  }

  // Émission instantanée sans actualisation vers tous les écrans ouverts
  try {
    const channel = new BroadcastChannel("riviera_school_sync");
    channel.postMessage({ type: "NEW_APP_NOTIFICATION", notif });
  } catch (e) {}

  renderNotifications();
};

function renderNotifications() {
  const badge = document.getElementById("notif-badge-count");
  const list = document.getElementById("notif-list-items");
  if (!badge || !list) return;

  const userRole = APP_STATE.currentUser?.role === "admin" ? "ADMIN" : "TEACHER";

  // Récupération depuis le cache permanent si besoin
  if ((!APP_STATE.notifications || APP_STATE.notifications.length === 0)) {
    try {
      const cached = localStorage.getItem("riviera_cached_notifications");
      if (cached) APP_STATE.notifications = JSON.parse(cached);
    } catch (e) {}
  }

  // Filtrage selon le destinataire (ADMIN, TEACHER ou ALL)
  const visibleNotifs = APP_STATE.notifications.filter(n =>
    !n.recipient_role ||
    n.recipient_role === "ALL" ||
    n.recipient_role === userRole
  );

  const count = visibleNotifs.length;

  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;
    badge.classList.remove("d-none");
  } else {
    badge.classList.add("d-none");
  }

  if (visibleNotifs.length === 0) {
    list.innerHTML = `<li class="notif-empty" style="padding: 16px; text-align: center; color: var(--text-muted);">Aucune nouvelle notification.</li>`;
    return;
  }

  list.innerHTML = visibleNotifs.slice(0, 15).map(n => {
    let icon = "🔔";
    if (n.type.includes("NOTE")) icon = "✍️";
    else if (n.type.includes("ABSENCE")) icon = "🕒";
    else if (n.type.includes("DÉROGATION") || n.type.includes("DEROG")) icon = "⚖️";
    else if (n.type.includes("ÉVALUATION") || n.type.includes("EVAL")) icon = "📝";
    else if (n.type.includes("COMMUNIQUÉ") || n.type.includes("ANNONCE")) icon = "📢";

    const timeStr = new Date(n.created_at || Date.now()).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    return `
      <li style="padding: 10px 14px; border-bottom: 1px solid var(--border-color); font-size: 0.86rem;">
        <div class="flex-between mb-1">
          <strong style="color: var(--primary-deep); font-size: 0.84rem;">${icon} ${n.type}</strong>
          <small class="text-muted" style="font-size: 0.72rem;">${timeStr}</small>
        </div>
        <p style="margin: 0; color: var(--text-main); line-height: 1.35;">${n.message}</p>
      </li>
    `;
  }).join("");
}

// ==========================================================
// CALENDRIER SCOLAIRE
// ==========================================================
function setupCalendarSystem() {
  document.getElementById("btn-cal-prev")?.addEventListener("click", () => {
    APP_STATE.calendarDate.setMonth(APP_STATE.calendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("btn-cal-next")?.addEventListener("click", () => {
    APP_STATE.calendarDate.setMonth(APP_STATE.calendarDate.getMonth() + 1);
    renderCalendar();
  });

  // Modale classique d'évaluation (Direction)
  document.getElementById("btn-open-eval-modal")?.addEventListener("click", () => document.getElementById("modal-eval-admin")?.classList.remove("d-none"));
  document.getElementById("btn-close-eval-modal")?.addEventListener("click", () => document.getElementById("modal-eval-admin")?.classList.add("d-none"));

  document.getElementById("form-admin-new-eval")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ev = {
      id: Date.now(),
      title: document.getElementById("modal-eval-title").value.trim(),
      class_name: document.getElementById("modal-eval-class").value,
      subject_name: document.getElementById("modal-eval-subject").value,
      eval_date: document.getElementById("modal-eval-date").value,
      type: document.getElementById("modal-eval-type").value,
      instructions: document.getElementById("modal-eval-instructions").value.trim(),
      created_by: "Direction"
    };

    if (db && navigator.onLine) {
      try {
        const { data, error } = await db.from("evaluations").insert([ev]).select();
        if (!error && data && data.length > 0) ev.id = data[0].id;
      } catch (err) {}
    }

    APP_STATE.evaluations.push(ev);
    try { localStorage.setItem("riviera_cached_evaluations", JSON.stringify(APP_STATE.evaluations)); } catch (e) {}

    renderCalendar();
    document.getElementById("modal-eval-admin")?.classList.add("d-none");
    e.target.reset();
    alert("✅ Évaluation programmée avec succès !");
  });

  // Fermeture de la modale du jour sélectionné
  const dayModal = document.getElementById("modal-calendar-day");
  document.getElementById("btn-close-cal-day-modal")?.addEventListener("click", () => {
    dayModal?.classList.add("d-none");
  });

  // Soumission de la programmation rapide pour le jour cliqué
  document.getElementById("form-cal-day-quick-eval")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector("button[type='submit']");
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "⏳ Publication en cours...";
    }

    const targetDate = document.getElementById("cal-day-quick-date")?.value;
    const title = document.getElementById("cal-day-quick-title")?.value?.trim();
    const cls = document.getElementById("cal-day-quick-class")?.value;
    const sub = document.getElementById("cal-day-quick-subject")?.value;
    const type = document.getElementById("cal-day-quick-type")?.value;
    const instructions = document.getElementById("cal-day-quick-instructions")?.value?.trim() || "";

    if (!targetDate || !title || !cls || !sub) {
      alert("Veuillez remplir tous les champs obligatoires.");
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "💾 Publier l'évaluation au calendrier";
      }
      return;
    }

    const newEval = {
      id: Date.now(),
      title: title,
      class_name: cls,
      subject_name: sub,
      eval_date: targetDate,
      type: type,
      instructions: instructions,
      created_by: "Direction"
    };

    if (db && navigator.onLine) {
      try {
        const { data, error } = await db.from("evaluations").insert([newEval]).select();
        if (!error && data && data.length > 0) newEval.id = data[0].id;
      } catch (err) {}
    }

    APP_STATE.evaluations.push(newEval);
    try { localStorage.setItem("riviera_cached_evaluations", JSON.stringify(APP_STATE.evaluations)); } catch (e) {}

    // Rafraîchir le calendrier et la liste du jour dans la modale
    renderCalendar();
    refreshDayModalEvents(targetDate);

    // Réinitialiser les champs de saisie pour une éventuelle autre programmation
    document.getElementById("cal-day-quick-title").value = "";
    document.getElementById("cal-day-quick-instructions").value = "";

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "💾 Publier l'évaluation au calendrier";
    }

    alert(`✅ Évaluation publiée avec succès pour le ${targetDate} !`);
  });
}

// Fonction appelée lors du clic direct sur une date du calendrier
window.openCalendarDayModal = function(dateStr) {
  const modal = document.getElementById("modal-calendar-day");
  if (!modal) return;

  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const formattedDate = dateObj.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // Titre en clair avec majuscule
  const dateTitleEl = document.getElementById("cal-day-modal-date-text");
  if (dateTitleEl) {
    dateTitleEl.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  // Initialisation du champ date masqué
  const hiddenDateInput = document.getElementById("cal-day-quick-date");
  if (hiddenDateInput) hiddenDateInput.value = dateStr;

  // Remplissage dynamique des sélecteurs de classes et matières
  const clsSelect = document.getElementById("cal-day-quick-class");
  const subSelect = document.getElementById("cal-day-quick-subject");
  if (clsSelect) {
    clsSelect.innerHTML = APP_STATE.classes.map(c => `<option value="${c}">${c}</option>`).join("");
  }
  if (subSelect) {
    subSelect.innerHTML = APP_STATE.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
  }

  // Nettoyage des champs de texte
  const titleInput = document.getElementById("cal-day-quick-title");
  const instInput = document.getElementById("cal-day-quick-instructions");
  if (titleInput) titleInput.value = "";
  if (instInput) instInput.value = "";

  // Affichage des évaluations existantes pour cette date
  refreshDayModalEvents(dateStr);

  modal.classList.remove("d-none");
};

// Met à jour la liste des évaluations à l'intérieur de la modale du jour
function refreshDayModalEvents(dateStr) {
  const tbody = document.getElementById("cal-day-modal-events-tbody");
  if (!tbody) return;

  const evalsThisDay = APP_STATE.evaluations.filter(e => e.eval_date === dateStr);

  if (evalsThisDay.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Aucune évaluation prévue pour ce jour.</td></tr>`;
    return;
  }

  tbody.innerHTML = evalsThisDay.map(ev => `
    <tr>
      <td><strong>${ev.title}</strong></td>
      <td><span class="badge badge-primary">${ev.class_name}</span></td>
      <td>${ev.subject_name}</td>
      <td><span class="badge badge-secondary">${ev.type}</span></td>
      <td class="text-center">
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteEvaluationFromModal(${ev.id}, '${dateStr}')" title="Supprimer">🗑️</button>
      </td>
    </tr>
  `).join("");
}

// Suppression d'une évaluation depuis la modale du jour
window.deleteEvaluationFromModal = async function(id, dateStr) {
  ensureSupabaseClient();
 if (db && navigator.onLine) {
   try { await db.from("evaluations").delete().eq("id", id); } catch (e) { queueOfflineAction("DELETE_CALENDAR_EVAL", { id }); }
 } else {
   queueOfflineAction("DELETE_CALENDAR_EVAL", { id });
 }

    APP_STATE.evaluations = APP_STATE.evaluations.filter(x => x.id !== id);
    try { localStorage.setItem("riviera_cached_evaluations", JSON.stringify(APP_STATE.evaluations)); } catch (e) {}

    renderCalendar();
    refreshDayModalEvents(dateStr);
  }
};

function renderCalendar() {
  const grid = document.getElementById("calendar-days-grid");
  const title = document.getElementById("calendar-month-year-title");
  if (!grid || !title) return;

  const current = APP_STATE.calendarDate;
  const year = current.getFullYear();
  const month = current.getMonth();
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  title.textContent = `${monthNames[month]} ${year}`;

  const firstDay = (new Date(year, month, 1).getDay() || 7) - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  grid.innerHTML = "";

  // Jours du mois précédent
  for (let i = firstDay - 1; i >= 0; i--) {
    grid.innerHTML += `<div class="calendar-day-cell other-month"><span class="cal-day-num">${prevMonthDays - i}</span></div>`;
  }

  // Jours du mois en cours avec écouteur de clic interactif
  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const evalsThisDay = APP_STATE.evaluations.filter(e => e.eval_date === dateStr);
    let pills = evalsThisDay.map(ev => `<span class="cal-event-pill eval" title="${ev.title}">📝 ${ev.class_name}: ${ev.title}</span>`).join("");

    grid.innerHTML += `
      <div class="calendar-day-cell ${isToday ? 'today' : ''}" onclick="openCalendarDayModal('${dateStr}')" title="Cliquer pour afficher et programmer le ${d} ${monthNames[month]} ${year}">
        <span class="cal-day-num">${d}</span>
        ${pills}
      </div>
    `;
  }

  renderEvaluationsTable();
}

function renderEvaluationsTable() {
  const tbody = document.getElementById("evaluations-table-body");
  if (!tbody) return;

  tbody.innerHTML = APP_STATE.evaluations.map(ev => `
    <tr>
      <td><strong>${ev.eval_date}</strong></td>
      <td>08:00</td>
      <td><strong>${ev.title}</strong></td>
      <td><span class="badge badge-secondary">${ev.type}</span></td>
      <td><span class="badge badge-primary">${ev.class_name}</span></td>
      <td>${ev.subject_name}</td>
      <td>${ev.created_by || 'Direction'}</td>
      <td><span class="badge badge-success">Validée</span></td>
      <td class="text-center"><button class="btn btn-sm btn-outline-danger" onclick="deleteEvaluation(${ev.id})">✕</button></td>
    </tr>
  `).join("") || `<tr><td colspan="9" class="text-center text-muted">Aucune évaluation enregistrée.</td></tr>`;
}

window.deleteEvaluation = async function(id) {
  if (confirm("Supprimer cette évaluation ?")) {
    if (db && navigator.onLine) {
      try { await db.from("evaluations").delete().eq("id", id); } catch (e) {}
    }
    APP_STATE.evaluations = APP_STATE.evaluations.filter(x => x.id !== id);
    try { localStorage.setItem("riviera_cached_evaluations", JSON.stringify(APP_STATE.evaluations)); } catch (e) {}
    renderCalendar();
  }
};

// ==========================================================
// ABSENCES
// ==========================================================
function setupTeacherAttendanceForm() {
  document.getElementById("form-teacher-attendance")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector("button[type='submit']");
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "⏳ Envoi en cours...";
    }

    const cls = document.getElementById("att-teacher-class-select")?.value;
    const mat = document.getElementById("att-teacher-student-select")?.value;
    const date = document.getElementById("att-teacher-date")?.value;
    const hours = parseInt(document.getElementById("att-teacher-hours")?.value, 10) || 1;
    const reason = document.getElementById("att-teacher-reason")?.value?.trim() || "Non justifiée";

    if (!cls || !mat || !date) {
      alert("Veuillez remplir tous les champs obligatoires (Classe, Élève, Date).");
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Transmettre l'absence à la Direction";
      }
      return;
    }

    const student = APP_STATE.students.find(s => s.matricule === mat);
    const stdName = student ? `${student.lastName} ${student.firstName}` : mat;

    const record = {
      student_matricule: mat,
      student_name: stdName,
      class_name: cls,
      date: date,
      hours: hours,
      reason: reason,
      recorded_by: APP_STATE.currentUser?.name || "Professeur"
    };

    let saveSuccess = true;
    let errorDetail = "";

    ensureSupabaseClient();
    if (db && navigator.onLine) {
      try {
        const { error: attError } = await db.from("attendance").insert([record]);
        if (attError) {
          saveSuccess = false;
          errorDetail = attError.message;
          queueOfflineAction("INSERT_ATTENDANCE", record);
        } else {
          await db.from("notifications").insert([{
            type: "ABSENCE",
            message: `${stdName} (${cls}) : ${hours}h d'absence signalée(s) le ${date}.`,
            recipient_role: "ADMIN"
          }]);
        }
      } catch (err) {
        saveSuccess = false;
        errorDetail = err.message;
        queueOfflineAction("INSERT_ATTENDANCE", record);
      }
    } else {
      saveSuccess = false;
      queueOfflineAction("INSERT_ATTENDANCE", record);
    }

    // Ajout dans l'état local
    APP_STATE.attendance.unshift(record);
    try {
      localStorage.setItem("riviera_cached_attendance", JSON.stringify(APP_STATE.attendance));
    } catch (e) {}

    renderAttendanceTable();

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Transmettre l'absence à la Direction";
    }

    if (saveSuccess) {
      alert("✅ Absence transmise et enregistrée dans Supabase !");
      e.target.reset();
    } else {
      alert("⚠️ L'absence a été enregistrée localement, mais Supabase a signalé une erreur : " + errorDetail);
    }
  });
}

function renderAttendanceTable() {
  const tbody = document.getElementById("admin-attendance-tbody");
  const dashStream = document.getElementById("dashboard-absences-stream");

  if (tbody) {
    tbody.innerHTML = APP_STATE.attendance.map(a => `
      <tr>
        <td>${a.date}</td>
        <td><strong>${a.student_name}</strong></td>
        <td><span class="badge badge-secondary">${a.class_name}</span></td>
        <td>${a.hours}h</td>
        <td>${a.reason || '-'}</td>
        <td>${a.recorded_by}</td>
        <td><span class="badge badge-warning">Signalée</span></td>
      </tr>
    `).join("") || `<tr><td colspan="7" class="text-center text-muted">Aucune absence signalée.</td></tr>`;
  }

  if (dashStream) {
    dashStream.innerHTML = APP_STATE.attendance.slice(0, 4).map(a => `
      <li><strong>${a.student_name}</strong> (${a.class_name}) — <span>${a.hours}h d'absence le ${a.date}</span></li>
    `).join("") || `<li class="text-muted">Aucune absence récente.</li>`;
  }
}

// ==========================================================
// SÉLECTEURS ET STATISTIQUES ENSEIGNANT
// ==========================================================
function populateSelectDropdowns() {
  const mCls = document.getElementById("modal-eval-class");
  const mSub = document.getElementById("modal-eval-subject");
  if (mCls) mCls.innerHTML = APP_STATE.classes.map(c => `<option value="${c}">${c}</option>`).join("");
  if (mSub) mSub.innerHTML = APP_STATE.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join("");

  const pCls = document.getElementById("prep-eval-class");
  const pSub = document.getElementById("prep-eval-subject");
  if (pCls) pCls.innerHTML = APP_STATE.classes.map(c => `<option value="${c}">${c}</option>`).join("");
  if (pSub) pSub.innerHTML = APP_STATE.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join("");

  const ttCls = document.getElementById("tt-modal-class");
  const ttSub = document.getElementById("tt-modal-subject");
  const ttTch = document.getElementById("tt-modal-teacher");
  if (ttCls) ttCls.innerHTML = APP_STATE.classes.map(c => `<option value="${c}">${c}</option>`).join("");
  if (ttSub) ttSub.innerHTML = APP_STATE.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
  if (ttTch) ttTch.innerHTML = APP_STATE.teachers.map(t => `<option value="${t.name}">${t.name}</option>`).join("");

  const derCls = document.getElementById("derog-class");
  const derSub = document.getElementById("derog-subject");
  if (derCls) derCls.innerHTML = APP_STATE.classes.map(c => `<option value="${c}">${c}</option>`).join("");
  if (derSub) derSub.innerHTML = APP_STATE.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
}

function populateTeacherSelectors(teacher) {
  const teacherClasses = (teacher.classes || "6e").split(",").map(c => c.trim());
  const teacherSubjects = (teacher.subjects || "Mathématiques").split(",").map(s => s.trim());

  ["teacher-select-class", "teacher-classes-view-select", "att-teacher-class-select", "stats-select-class"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = teacherClasses.map(c => `<option value="${c}">${c}</option>`).join("");
  });

  ["teacher-select-subject", "stats-select-subject"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = teacherSubjects.map(s => `<option value="${s}">${s}</option>`).join("");
  });

  const statsTrimSelect = document.getElementById("stats-select-trimester");
  if (statsTrimSelect) {
    statsTrimSelect.value = APP_STATE.currentTrimester;
  }

  // Écouteurs de changement pour recalcul immédiat des statistiques
  ["stats-select-class", "stats-select-subject", "stats-select-trimester"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.onchange = () => calculateTeacherStats();
    }
  });

  populateTeacherClassStudentsView(teacherClasses[0]);
  filterTeacherGrades();
  calculateTeacherStats();

  document.getElementById("teacher-classes-view-select")?.addEventListener("change", (e) => {
    populateTeacherClassStudentsView(e.target.value);
  });
}

function populateTeacherClassStudentsView(className) {
  const tbody = document.getElementById("teacher-class-students-tbody");
  if (!tbody) return;

  const students = APP_STATE.students.filter(s => s.class === className);
  tbody.innerHTML = students.map((s, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${s.matricule}</strong></td>
      <td><strong>${s.lastName}</strong></td>
      <td>${s.firstName}</td>
      <td>${s.sex || '-'}</td>
      <td>${s.dob || '-'}</td>
      <td><span class="badge badge-success">${s.status || 'Passant'}</span></td>
    </tr>
  `).join("") || `<tr><td colspan="7" class="text-center text-muted">Aucun élève dans cette classe.</td></tr>`;

  const attSel = document.getElementById("att-teacher-student-select");
  if (attSel) attSel.innerHTML = students.map(s => `<option value="${s.matricule}">${s.lastName} ${s.firstName} (${s.matricule})</option>`).join("");
}

function updateTeacherDashboardKPIs() {
  const t = APP_STATE.currentUser?.teacherObj;
  if (!t) return;
  const classes = (t.classes || "6e").split(",").map(c => c.trim());
  const myStudents = APP_STATE.students.filter(s => classes.includes(s.class));
  const myEvals = APP_STATE.evalRequests.filter(r => r.teacher_name === t.name && r.status === "EN_ATTENTE");

  document.getElementById("kpi-teacher-classes-count").textContent = classes.length;
  document.getElementById("kpi-teacher-classes-list").textContent = `Classes : ${classes.join(", ")}`;
  document.getElementById("kpi-teacher-students-count").textContent = myStudents.length;
  document.getElementById("kpi-teacher-subjects-count").textContent = t.subjects ? t.subjects.split(",").length : 1;
  document.getElementById("kpi-teacher-subjects-list").textContent = t.subjects || "Général";
  document.getElementById("kpi-teacher-evals-count").textContent = myEvals.length;
}

// MOTEUR RÉACTIF DE CALCUL DES STATISTIQUES PÉDAGOGIQUES
function calculateTeacherStats() {
  const cls = document.getElementById("stats-select-class")?.value || (APP_STATE.classes[0] || "6e");
  const sub = document.getElementById("stats-select-subject")?.value || (APP_STATE.subjects[0]?.name || "Mathématiques");
  const trim = document.getElementById("stats-select-trimester")?.value || APP_STATE.currentTrimester;

  const students = APP_STATE.students.filter(s => s.class === cls);
  const tbody = document.getElementById("stats-students-tbody");

  // Liaison de chaque élève avec ses notes réelles
  const evaluatedList = students.map(s => {
    const g = APP_STATE.grades.find(x => x.student_matricule === s.matricule && x.subject_name === sub && x.trimester === trim);
    const hasGrade = g !== undefined;
    const intVal = g ? (Number(g.interro) || 0) : null;
    const devVal = g ? (Number(g.devoir) || 0) : null;
    const compVal = g ? (Number(g.compo) || 0) : null;
    const moyVal = g ? (Number(g.moy_gene) || 0) : null;

    return {
      student: s,
      hasGrade: hasGrade,
      interro: intVal,
      devoir: devVal,
      compo: compVal,
      moy: moyVal
    };
  });

  const withGrades = evaluatedList.filter(x => x.hasGrade && x.moy !== null);

  // Remplissage des 4 indicateurs KPI
  const avgEl = document.getElementById("stats-class-avg");
  const effEl = document.getElementById("stats-class-eff");
  const maxEl = document.getElementById("stats-class-max");
  const maxStudentEl = document.getElementById("stats-student-max");
  const minEl = document.getElementById("stats-class-min");
  const minStudentEl = document.getElementById("stats-student-min");
  const rateEl = document.getElementById("stats-success-rate");
  const ratioEl = document.getElementById("stats-success-ratio");

  if (withGrades.length === 0) {
    if (avgEl) avgEl.textContent = "--";
    if (effEl) effEl.textContent = `0 noté(s) / ${students.length} élève(s)`;
    if (maxEl) maxEl.textContent = "--";
    if (maxStudentEl) maxStudentEl.textContent = "-";
    if (minEl) minEl.textContent = "--";
    if (minStudentEl) minStudentEl.textContent = "-";
    if (rateEl) rateEl.textContent = "0 %";
    if (ratioEl) ratioEl.textContent = `0 admis sur ${students.length} élève(s)`;

    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Aucune note saisie pour la classe ${cls} en ${sub} (${trim}).</td></tr>`;
    }
    return;
  }

  // Tri par moyenne décroissante
  withGrades.sort((a, b) => b.moy - a.moy);

  const sumMoy = withGrades.reduce((sum, item) => sum + item.moy, 0);
  const classAvg = sumMoy / withGrades.length;
  const highest = withGrades[0];
  const lowest = withGrades[withGrades.length - 1];
  const admitted = withGrades.filter(x => x.moy >= 10).length;
  const successRate = (admitted / withGrades.length) * 100;

  if (avgEl) avgEl.textContent = classAvg.toFixed(2).replace('.', ',');
  if (effEl) effEl.textContent = `${withGrades.length} noté(s) sur ${students.length} élève(s)`;
  if (maxEl) maxEl.textContent = highest.moy.toFixed(2).replace('.', ',');
  if (maxStudentEl) maxStudentEl.textContent = `${highest.student.lastName} ${highest.student.firstName}`;
  if (minEl) minEl.textContent = lowest.moy.toFixed(2).replace('.', ',');
  if (minStudentEl) minStudentEl.textContent = `${lowest.student.lastName} ${lowest.student.firstName}`;
  if (rateEl) rateEl.textContent = `${successRate.toFixed(1)} %`;
  if (ratioEl) ratioEl.textContent = `${admitted} admis sur ${withGrades.length} noté(s)`;

  // Tableau détaillé du classement
  if (tbody) {
    evaluatedList.sort((a, b) => {
      if (a.hasGrade && !b.hasGrade) return -1;
      if (!a.hasGrade && b.hasGrade) return 1;
      return (b.moy || 0) - (a.moy || 0);
    });

    tbody.innerHTML = evaluatedList.map((item, idx) => {
      const s = item.student;
      const rank = item.hasGrade ? `${idx + 1}e` : "-";
      const intStr = item.interro !== null ? item.interro.toFixed(2).replace('.', ',') : "-";
      const devStr = item.devoir !== null ? item.devoir.toFixed(2).replace('.', ',') : "-";
      const compStr = item.compo !== null ? item.compo.toFixed(2).replace('.', ',') : "-";
      const moyStr = item.moy !== null ? item.moy.toFixed(2).replace('.', ',') : "-";
      const app = item.moy !== null ? suggestAppreciation(item.moy) : "-";
      const moyColor = item.moy !== null ? (item.moy >= 10 ? "text-success bold" : "text-danger bold") : "";

      return `
        <tr>
          <td><strong>${rank}</strong></td>
          <td><strong>${s.matricule}</strong></td>
          <td><strong>${s.lastName}</strong> ${s.firstName}</td>
          <td>${intStr}</td>
          <td>${devStr}</td>
          <td>${compStr}</td>
          <td class="${moyColor}">${moyStr}</td>
          <td><span class="badge ${item.moy >= 10 ? 'badge-success' : item.moy !== null ? 'badge-danger' : 'badge-secondary'}">${app}</span></td>
        </tr>
      `;
    }).join("");
  }
}

function renderAllTables() {
  renderStudentsTable();
  renderTeachersTable();
  renderClassesAndSubjectsTables();
  renderAnnouncements();
  renderAdminGradesView();
  renderAttendanceTable();
}

// ==========================================================
// SERVICE WORKER PWA
// ==========================================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("✅ PWA Riviera II : Prêt"))
      .catch((err) => console.warn("Erreur PWA :", err));
  });
}