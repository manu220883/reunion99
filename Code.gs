// ============================================================
// Code.gs — Google Apps Script Backend
// Eswaramma High School Class of '99 Reunion
// ============================================================
// HOW TO DEPLOY:
//   1. Open your Google Sheet → Extensions → Apps Script
//   2. Replace any existing code with this entire file
//   3. Click "Run" on the setupSheets() function FIRST (one-time setup)
//   4. Deploy → New deployment → Web App
//      Execute as: Me | Who can access: Anyone
//   5. Copy the Web App URL into config.js → API_URL
// ============================================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);

  try {
    // Auto-create sheets if this is the first deployment (setupSheets() not yet run)
    var _ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!_ss.getSheetByName("LocationVotes")) {
      setupSheets();
    }

    // Merge GET params and POST body params
    let p = {};
    if (e && e.parameter) p = Object.assign(p, e.parameter);
    if (e && e.postData && e.postData.contents) {
      try {
        Object.assign(p, JSON.parse(e.postData.contents));
      } catch (_) {
        // Try URL-encoded
        e.postData.contents.split("&").forEach(function (pair) {
          var kv = pair.split("=");
          if (kv[0]) p[decodeURIComponent(kv[0].replace(/\+/g, " "))] =
            decodeURIComponent((kv[1] || "").replace(/\+/g, " "));
        });
      }
    }

    if (!p.action) throw new Error("No action specified");

    var result;
    switch (p.action) {
      case "submitAttendee":     result = submitAttendee(p);     break;
      case "submitLocationVote": result = submitLocationVote(p); break;
      case "submitDateVote":     result = submitDateVote(p);     break;
      case "submitMemory":       result = submitMemory(p);       break;
      case "getAttendees":       result = getAttendees();        break;
      case "getPollResults":     result = getPollResults();      break;
      case "getMemories":        result = getMemories();         break;
      case "getSettings":        result = getSettings();         break;
      default: throw new Error("Unknown action: " + p.action);
    }

    out.setContent(JSON.stringify({ success: true, data: result }));
  } catch (err) {
    out.setContent(JSON.stringify({ success: false, error: err.message }));
  }

  return out;
}

// ── ONE-TIME SETUP ──────────────────────────────────────────
// Run this function once from the Apps Script editor (▶ Run button)
// before deploying as a web app.
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheets = [
    { name: "Attendees",      headers: ["Timestamp","Name","Nickname","Phone","City","Attendance","Message","VoterID"] },
    { name: "LocationVotes",  headers: ["Timestamp","VoterID","Name","Location"] },
    { name: "DateVotes",      headers: ["Timestamp","VoterID","Name","Date"] },
    { name: "Memories",       headers: ["Timestamp","Name","Memory"] },
    { name: "Photos",         headers: ["Timestamp","Name","PhotoURL","Caption"] },
    { name: "Settings",       headers: ["Key","Value"] }
  ];

  sheets.forEach(function (s) {
    var sheet = ss.getSheetByName(s.name) || ss.insertSheet(s.name);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, s.headers.length).setValues([s.headers])
           .setFontWeight("bold").setBackground("#1B2B4B").setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }
  });

  // Default settings (only if Settings sheet is empty)
  var settingsSheet = ss.getSheetByName("Settings");
  if (settingsSheet.getLastRow() <= 1) {
    settingsSheet.getRange(2, 1, 5, 2).setValues([
      ["reunion_date",       "2026-11-21"],
      ["poll_open",          "true"],
      ["registration_open",  "true"],
      ["memories_open",      "true"],
      ["site_title",         "Eswaramma HS – Class of '99 Reunion"]
    ]);
  }

  Logger.log("✅ Sheets setup complete!");
}

// ── SUBMIT ATTENDEE ─────────────────────────────────────────
function submitAttendee(p) {
  var name       = (p.name || "").trim();
  var nickname   = (p.nickname || "").trim();
  var phone      = (p.phone || "").trim();
  var city       = (p.city || "").trim();
  var attendance = (p.attendance || "").trim();
  var message    = (p.message || "").trim();
  var voterId    = (p.voterId || "").trim();

  if (name.length < 2)  throw new Error("Please enter your full name.");
  if (phone.length < 6) throw new Error("Please enter a valid phone / WhatsApp number.");
  if (!attendance)      throw new Error("Please select your attendance.");

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Attendees");
  var data  = sheet.getDataRange().getValues();

  // Duplicate check by phone
  for (var i = 1; i < data.length; i++) {
    if (data[i][3] === phone) throw new Error("You have already registered! See you there ❤️");
  }

  sheet.appendRow([new Date().toISOString(), name, nickname, phone, city, attendance, message, voterId]);
  return { message: "Registration successful!" };
}

// ── SUBMIT LOCATION VOTE ────────────────────────────────────
function submitLocationVote(p) {
  var voterId  = (p.voterId  || "").trim();
  var name     = (p.name     || "Anonymous").trim();
  var location = (p.location || "").trim();

  if (!voterId)  throw new Error("Voter ID missing.");
  if (!location) throw new Error("Please select a location.");

  var valid = ["Bangalore", "Bhadravathi", "Either"];
  if (valid.indexOf(location) === -1) throw new Error("Invalid choice.");

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("LocationVotes");

  sheet.appendRow([new Date().toISOString(), voterId, name, location]);
  return { message: "Vote recorded!" };
}

// ── SUBMIT DATE VOTE ────────────────────────────────────────
function submitDateVote(p) {
  var voterId = (p.voterId || "").trim();
  var name    = (p.name    || "Anonymous").trim();
  var date    = (p.date    || "").trim();

  if (!voterId) throw new Error("Voter ID missing.");
  if (!date)    throw new Error("Please select a date.");

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("DateVotes");

  sheet.appendRow([new Date().toISOString(), voterId, name, date]);
  return { message: "Vote recorded!" };
}

// ── SUBMIT MEMORY ───────────────────────────────────────────
function submitMemory(p) {
  var name   = (p.name   || "").trim();
  var memory = (p.memory || "").trim();

  if (name.length < 2)    throw new Error("Please enter your name.");
  if (memory.length < 10) throw new Error("Please share a memory (at least 10 characters).");

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Memories");
  sheet.appendRow([new Date().toISOString(), name, memory]);
  return { message: "Memory added!" };
}

// ── GET ATTENDEES ───────────────────────────────────────────
function getAttendees() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Attendees");
  var data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  // Columns: 0=Timestamp, 1=Name, 2=Nickname, 3=Phone(hidden), 4=City, 5=Attendance
  return data.slice(1).map(function (row) {
    return { name: row[1], nickname: row[2], city: row[4], attendance: row[5] };
  });
}

// ── GET POLL RESULTS ─────────────────────────────────────────
function getPollResults() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var locSheet = ss.getSheetByName("LocationVotes");
  var locRows  = locSheet.getLastRow() > 1
    ? locSheet.getRange(2, 1, locSheet.getLastRow() - 1, 4).getValues()
    : [];

  var locationCounts = { Bangalore: 0, Bhadravathi: 0, Either: 0 };
  locRows.forEach(function (r) {
    var loc = r[3];
    if (locationCounts.hasOwnProperty(loc)) locationCounts[loc]++;
  });

  var dateSheet = ss.getSheetByName("DateVotes");
  var dateRows  = dateSheet.getLastRow() > 1
    ? dateSheet.getRange(2, 1, dateSheet.getLastRow() - 1, 4).getValues()
    : [];

  var dateCounts = {};
  dateRows.forEach(function (r) {
    var d = r[3];
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  });

  return {
    location:      locationCounts,
    locationTotal: locRows.length,
    dates:         dateCounts,
    dateTotal:     dateRows.length
  };
}

// ── GET MEMORIES ─────────────────────────────────────────────
function getMemories() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Memories");
  var data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).reverse().slice(0, 30).map(function (row) {
    return { timestamp: row[0], name: row[1], memory: row[2] };
  });
}

// ── GET SETTINGS ─────────────────────────────────────────────
function getSettings() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  var data  = sheet.getDataRange().getValues();
  var settings = {};
  data.slice(1).forEach(function (row) {
    if (row[0]) settings[row[0]] = row[1];
  });
  return settings;
}
