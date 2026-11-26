// Admin modules: Dashboard, Appointments, Patients, Clinic Schedule
// Gumagamit ng localStorage keys: "bookings", "patients", at "blockedDates"

(function () {
  var ADMIN_USER = 'admin';
  var ADMIN_PASS = 'admin';

  // ---------- Helpers ----------
  function $(id) { return document.getElementById(id); }

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (err) { return []; }
  }

  function save(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = (text === undefined || text === null) ? '' : text;
    return div.innerHTML;
  }

  function digits(phone) {
    return String(phone || '').replace(/\D/g, '');
  }

  function todayString() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  var SERVICES = ['General Dentistry', 'Orthodontics', 'Cosmetic Dentistry', 'Pediatric Dentistry'];

  // ---------- Login ----------
  var loginView = $('loginView');
  var dashboardView = $('dashboardView');
  var loginForm = $('loginForm');
  var loginMessage = $('loginMessage');

  function showDashboard() {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
    renderAll();
  }

  function showLogin() {
    dashboardView.style.display = 'none';
    loginView.style.display = 'block';
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var user = $('username').value.trim();
    var pass = $('password').value;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      sessionStorage.setItem('isAdmin', 'yes');
      loginMessage.className = 'form-message';
      loginForm.reset();
      showDashboard();
    } else {
      loginMessage.className = 'form-message error';
      loginMessage.textContent = 'Wrong username or password.';
    }
  });

  $('logoutBtn').addEventListener('click', function () {
    sessionStorage.removeItem('isAdmin');
    showLogin();
  });

  // ---------- Tabs ----------
  var tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.getAttribute('data-tab');
      tabButtons.forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      $('tab-' + name).classList.add('active');
      renderAll();
    });
  });

  // ---------- Patients: auto-add ----------
  function ensurePatient(booking) {
    var patients = load('patients');
    var key = digits(booking.phone);
    var exists = patients.some(function (p) { return digits(p.phone) === key; });
    if (!exists && key) {
      patients.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: booking.name,
        phone: booking.phone,
        email: booking.email,
        notes: ''
      });
      save('patients', patients);
    }
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    var bookings = load('bookings');
    var patients = load('patients');

    function count(status) {
      return bookings.filter(function (b) { return b.status === status; }).length;
    }

    $('statTotal').textContent = bookings.length;
    $('statPending').textContent = count('Pending');
    $('statConfirmed').textContent = count('Confirmed');
    $('statCompleted').textContent = count('Completed');
    $('statCancelled').textContent = count('Cancelled');
    $('statPatients').textContent = patients.length;

    // Appointments ngayong araw
    var today = todayString();
    var todays = bookings.filter(function (b) {
      return b.date === today && b.status !== 'Cancelled';
    }).sort(function (a, b) { return String(a.time).localeCompare(String(b.time)); });

    var todayList = $('todayList');
    todayList.innerHTML = '';
    if (todays.length === 0) {
      todayList.innerHTML = '<li>No appointments today.</li>';
    } else {
      todays.forEach(function (b) {
        var li = document.createElement('li');
        li.innerHTML = '<strong>' + escapeHtml(b.time) + '</strong> - ' +
          escapeHtml(b.name) + ' (' + escapeHtml(b.service) + ', ' + escapeHtml(b.status) + ')';
        todayList.appendChild(li);
      });
    }

    // Bar chart ng bookings kada serbisyo
    var counts = {};
    SERVICES.forEach(function (s) { counts[s] = 0; });
    bookings.forEach(function (b) {
      counts[b.service] = (counts[b.service] || 0) + 1;
    });
    var max = 1;
    Object.keys(counts).forEach(function (k) { if (counts[k] > max) max = counts[k]; });

    var bars = $('serviceBars');
    bars.innerHTML = '';
    Object.keys(counts).forEach(function (name) {
      var pct = Math.round((counts[name] / max) * 100);
      var row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML =
        '<span>' + escapeHtml(name) + '</span>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="bar-value">' + counts[name] + '</span>';
      bars.appendChild(row);
    });
  }

  // ---------- Appointments ----------
  function filteredBookings() {
    var q = $('apptSearch').value.trim().toLowerCase();
    var status = $('apptStatus').value;
    var date = $('apptDate').value;

    return load('bookings').filter(function (b) {
      var text = (b.name + ' ' + b.phone + ' ' + b.email).toLowerCase();
      if (q && text.indexOf(q) === -1) return false;
      if (status && b.status !== status) return false;
      if (date && b.date !== date) return false;
      return true;
    }).sort(function (a, b) {
      return (String(a.date) + String(a.time)).localeCompare(String(b.date) + String(b.time));
    });
  }

  function renderAppointments() {
    var list = filteredBookings();
    var body = $('apptBody');
    body.innerHTML = '';
    $('apptEmpty').style.display = list.length === 0 ? 'block' : 'none';

    list.forEach(function (b) {
      var tr = document.createElement('tr');
      var actions = '<button class="action-btn" data-action="edit" data-id="' + b.id + '">Edit</button>';
      if (b.status === 'Pending') {
        actions += '<button class="action-btn" data-action="confirm" data-id="' + b.id + '">Confirm</button>';
      }
      if (b.status === 'Confirmed') {
        actions += '<button class="action-btn" data-action="complete" data-id="' + b.id + '">Complete</button>';
      }
      actions += '<button class="action-btn danger" data-action="delete" data-id="' + b.id + '">Delete</button>';

      tr.innerHTML =
        '<td>' + escapeHtml(b.name) + '</td>' +
        '<td>' + escapeHtml(b.phone) + '</td>' +
        '<td>' + escapeHtml(b.email) + '</td>' +
        '<td>' + escapeHtml(b.service) + '</td>' +
        '<td>' + escapeHtml(b.date) + '</td>' +
        '<td>' + escapeHtml(b.time) + '</td>' +
        '<td><span class="status ' + escapeHtml(String(b.status).toLowerCase()) + '">' + escapeHtml(b.status) + '</span></td>' +
        '<td>' + actions + '</td>';
      body.appendChild(tr);
    });
  }

  ['apptSearch', 'apptStatus', 'apptDate'].forEach(function (id) {
    $(id).addEventListener('input', renderAppointments);
    $(id).addEventListener('change', renderAppointments);
  });

  $('apptClear').addEventListener('click', function () {
    $('apptSearch').value = '';
    $('apptStatus').value = '';
    $('apptDate').value = '';
    renderAppointments();
  });

  function setStatus(id, status) {
    var bookings = load('bookings');
    bookings.forEach(function (b) {
      if (b.id === id) {
        b.status = status;
        if (status === 'Confirmed' || status === 'Completed') ensurePatient(b);
      }
    });
    save('bookings', bookings);
  }

  $('apptBody').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var id = Number(btn.getAttribute('data-id'));
    var action = btn.getAttribute('data-action');

    if (action === 'confirm') {
      setStatus(id, 'Confirmed');
    } else if (action === 'complete') {
      setStatus(id, 'Completed');
    } else if (action === 'delete') {
      if (!confirm('Delete this appointment?')) return;
      save('bookings', load('bookings').filter(function (b) { return b.id !== id; }));
    } else if (action === 'edit') {
      openApptModal(id);
      return;
    }
    renderAll();
  });

  // NEW FEATURE 1: Add Walk-in Appointment (modal)
  var addApptModal = $('addApptModal');

  $('addApptBtn').addEventListener('click', function () {
    $('addApptForm').reset();
    $('newApptDate').value = todayString();
    $('newApptStatus').value = 'Confirmed';
    addApptModal.classList.add('open');
  });

  $('addApptCancel').addEventListener('click', function () {
    addApptModal.classList.remove('open');
  });

  $('addApptForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var dateVal = $('newApptDate').value;
    var timeVal = $('newApptTime').value;

    // Check kung naka-block ang date
    var blocked = load('blockedDates').filter(function (x) { return x.date === dateVal; })[0];
    if (blocked) {
      alert('Cannot book on ' + dateVal + '. Clinic is closed (' + blocked.reason + ').');
      return;
    }

    // Check kung may existing booking sa parehong date at time
    var bookings = load('bookings');
    var conflict = bookings.some(function (b) {
      return b.date === dateVal && b.time === timeVal && b.status !== 'Cancelled';
    });
    if (conflict && !confirm('Another appointment already exists at this date and time. Proceed anyway?')) {
      return;
    }

    var newBooking = {
      id: Date.now(),
      name: $('newApptName').value.trim(),
      phone: $('newApptPhone').value.trim(),
      email: $('newApptEmail').value.trim(),
      service: $('newApptService').value,
      date: dateVal,
      time: timeVal,
      status: $('newApptStatus').value,
      createdAt: new Date().toLocaleString()
    };

    bookings.push(newBooking);
    save('bookings', bookings);

    if (newBooking.status === 'Confirmed' || newBooking.status === 'Completed') {
      ensurePatient(newBooking);
    }

    addApptModal.classList.remove('open');
    renderAll();
  });

  // Edit appointment (modal)
  var apptModal = $('apptModal');

  function openApptModal(id) {
    var b = load('bookings').filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    $('apptId').value = b.id;
    $('apptWho').textContent = b.name + ' (' + b.phone + ')';
    $('apptService').value = b.service;
    $('apptDateEdit').value = b.date;
    $('apptTimeEdit').value = b.time;
    $('apptStatusEdit').value = b.status;
    apptModal.classList.add('open');
  }

  function closeApptModal() { apptModal.classList.remove('open'); }
  $('apptCancel').addEventListener('click', closeApptModal);

  $('apptForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = Number($('apptId').value);
    var bookings = load('bookings');
    bookings.forEach(function (b) {
      if (b.id === id) {
        b.service = $('apptService').value;
        b.date = $('apptDateEdit').value;
        b.time = $('apptTimeEdit').value;
        b.status = $('apptStatusEdit').value;
        if (b.status === 'Confirmed' || b.status === 'Completed') ensurePatient(b);
      }
    });
    save('bookings', bookings);
    closeApptModal();
    renderAll();
  });

  // Export CSV
  function csvCell(value) {
    return '"' + String(value === undefined || value === null ? '' : value).replace(/"/g, '""') + '"';
  }

  $('exportBtn').addEventListener('click', function () {
    var rows = [['Name', 'Phone', 'Email', 'Service', 'Date', 'Time', 'Status', 'Created']];
    load('bookings').forEach(function (b) {
      rows.push([b.name, b.phone, b.email, b.service, b.date, b.time, b.status, b.createdAt]);
    });
    var csv = rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'appointments.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // ---------- Patients ----------
  function renderPatients() {
    var q = $('patSearch').value.trim().toLowerCase();
    var bookings = load('bookings');
    var patients = load('patients').filter(function (p) {
      return !q || (p.name + ' ' + p.phone + ' ' + p.email).toLowerCase().indexOf(q) !== -1;
    });

    var body = $('patBody');
    body.innerHTML = '';
    $('patEmpty').style.display = patients.length === 0 ? 'block' : 'none';

    patients.forEach(function (p) {
      var key = digits(p.phone);
      var history = bookings.filter(function (b) { return digits(b.phone) === key; })
        .sort(function (a, b) { return (String(b.date) + String(b.time)).localeCompare(String(a.date) + String(a.time)); });

      var historyHtml = history.length === 0 ? 'No appointments yet' : history.map(function (b) {
        return escapeHtml(b.date) + ' ' + escapeHtml(b.time) + ' - ' + escapeHtml(b.service) + ' (' + escapeHtml(b.status) + ')';
      }).join('<br>');

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(p.name) + '</td>' +
        '<td>' + escapeHtml(p.phone) + '</td>' +
        '<td>' + escapeHtml(p.email) + '</td>' +
        '<td class="wrap">' + escapeHtml(p.notes) + '</td>' +
        '<td class="wrap"><div class="history-list">' + historyHtml + '</div></td>' +
        '<td>' +
          '<button class="action-btn" data-action="edit" data-id="' + p.id + '">Edit</button>' +
          '<button class="action-btn danger" data-action="delete" data-id="' + p.id + '">Delete</button>' +
        '</td>';
      body.appendChild(tr);
    });
  }

  $('patSearch').addEventListener('input', renderPatients);

  var patModal = $('patModal');

  function openPatModal(id) {
    var p = load('patients').filter(function (x) { return x.id === id; })[0];
    $('patModalTitle').textContent = p ? 'Edit Patient' : 'Add Patient';
    $('patId').value = p ? p.id : '';
    $('patName').value = p ? p.name : '';
    $('patPhone').value = p ? p.phone : '';
    $('patEmail').value = p ? p.email : '';
    $('patNotes').value = p ? p.notes : '';
    patModal.classList.add('open');
  }

  function closePatModal() { patModal.classList.remove('open'); }
  $('patCancel').addEventListener('click', closePatModal);
  $('addPatientBtn').addEventListener('click', function () { openPatModal(null); });

  $('patForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = $('patId').value ? Number($('patId').value) : null;
    var patients = load('patients');
    var phoneKey = digits($('patPhone').value);

    var duplicate = patients.some(function (p) {
      return digits(p.phone) === phoneKey && p.id !== id;
    });
    if (duplicate) {
      alert('A patient with this phone number already exists.');
      return;
    }

    if (id) {
      patients.forEach(function (p) {
        if (p.id === id) {
          p.name = $('patName').value.trim();
          p.phone = $('patPhone').value.trim();
          p.email = $('patEmail').value.trim();
          p.notes = $('patNotes').value.trim();
        }
      });
    } else {
      patients.push({
        id: Date.now(),
        name: $('patName').value.trim(),
        phone: $('patPhone').value.trim(),
        email: $('patEmail').value.trim(),
        notes: $('patNotes').value.trim()
      });
    }
    save('patients', patients);
    closePatModal();
    renderAll();
  });

  $('patBody').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var id = Number(btn.getAttribute('data-id'));
    var action = btn.getAttribute('data-action');

    if (action === 'edit') {
      openPatModal(id);
    } else if (action === 'delete') {
      if (!confirm('Delete this patient? Their appointments will not be deleted.')) return;
      save('patients', load('patients').filter(function (p) { return p.id !== id; }));
      renderAll();
    }
  });

  // ---------- NEW FEATURE 2: Clinic Schedule (Blocked Dates) ----------
  function renderBlockedDates() {
    var list = load('blockedDates').sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date));
    });
    var body = $('blockBody');
    body.innerHTML = '';
    $('blockEmpty').style.display = list.length === 0 ? 'block' : 'none';

    list.forEach(function (item) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><strong>' + escapeHtml(item.date) + '</strong></td>' +
        '<td>' + escapeHtml(item.reason) + '</td>' +
        '<td><span class="status cancelled">Closed / Blocked</span></td>' +
        '<td><button class="action-btn danger" data-action="unblock" data-id="' + item.id + '">Unblock</button></td>';
      body.appendChild(tr);
    });
  }

  $('addBlockBtn').addEventListener('click', function () {
    var dateVal = $('blockDate').value;
    var reasonVal = $('blockReason').value.trim() || 'Clinic Closed';

    if (!dateVal) {
      alert('Please select a date to block.');
      return;
    }

    var list = load('blockedDates');
    if (list.some(function (x) { return x.date === dateVal; })) {
      alert('This date is already blocked.');
      return;
    }

    list.push({
      id: Date.now(),
      date: dateVal,
      reason: reasonVal
    });
    save('blockedDates', list);
    $('blockDate').value = '';
    $('blockReason').value = '';
    renderBlockedDates();
  });

  $('blockBody').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action="unblock"]');
    if (!btn) return;
    var id = Number(btn.getAttribute('data-id'));
    if (!confirm('Re-open this date for appointments?')) return;
    save('blockedDates', load('blockedDates').filter(function (x) { return x.id !== id; }));
    renderBlockedDates();
  });

  // ---------- Render all ----------
  function renderAll() {
    renderDashboard();
    renderAppointments();
    renderPatients();
    renderBlockedDates();
  }

  // Kung naka-login pa sa session na ito
  if (sessionStorage.getItem('isAdmin') === 'yes') {
    showDashboard();
  }
})();
