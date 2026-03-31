// Garden Faery Booking System — Google Apps Script
// Deploy this as a web app under gardenfaeryy@gmail.com
// Set: Execute as ME, Anyone can access

var CALENDAR_ID = 'gardenfaeryy@gmail.com';
var SHEET_ID = '1Ii_JYwzMfUtCj_5kWUcwUB7cHFwqykYNgvGwIvsRsOw'; // Existing Garden Faery sheet
var OWNER_EMAIL = 'gardenfaeryy@gmail.com';

// Available time blocks per day of week (0=Sun, 1=Mon, ... 6=Sat)
var SCHEDULE = {
  1: [{ start: '13:30', end: '16:00' }],                                    // Monday
  2: [{ start: '09:00', end: '14:00' }],                                    // Tuesday
  3: [{ start: '09:00', end: '14:00' }, { start: '14:30', end: '16:30' }],  // Wednesday
  4: [{ start: '09:00', end: '14:00' }],                                    // Thursday
  5: [{ start: '09:00', end: '14:00' }, { start: '14:30', end: '16:30' }]   // Friday
};

// Consultation: 30 min slots within the same schedule windows
var CONSULT_DURATION_MIN = 30;

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'getAvailability') {
      return getAvailability(data);
    } else if (data.action === 'book') {
      return bookAppointment(data);
    }

    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doGet(e) {
  var action = e.parameter.action;
  var dateStr = e.parameter.date;
  var type = e.parameter.type || 'visit';

  if (action === 'getAvailability') {
    return getAvailability({ date: dateStr, type: type });
  }

  return jsonResponse({ error: 'Use action=getAvailability&date=YYYY-MM-DD&type=visit|consult' });
}

// Get available slots for a given date
function getAvailability(data) {
  var dateStr = data.date; // YYYY-MM-DD
  var type = data.type || 'visit'; // 'visit' or 'consult'
  var date = new Date(dateStr + 'T00:00:00-07:00');
  var dayOfWeek = date.getDay();

  // Check if we have blocks for this day
  if (!SCHEDULE[dayOfWeek]) {
    return jsonResponse({ available: [] });
  }

  var cal = CalendarApp.getCalendarById(CALENDAR_ID);
  var blocks = SCHEDULE[dayOfWeek];
  var available = [];

  if (type === 'visit') {
    // For visits: return full blocks that are completely free
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var startTime = parseTime(dateStr, block.start);
      var endTime = parseTime(dateStr, block.end);

      var events = cal.getEvents(startTime, endTime);
      if (events.length === 0) {
        available.push({
          start: block.start,
          end: block.end,
          label: formatTimeRange(block.start, block.end)
        });
      }
    }
  } else if (type === 'consult') {
    // For consults: return 30-min slots within blocks that are free
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var slotStart = parseTime(dateStr, block.start);
      var blockEnd = parseTime(dateStr, block.end);

      while (slotStart.getTime() + (CONSULT_DURATION_MIN * 60000) <= blockEnd.getTime()) {
        var slotEnd = new Date(slotStart.getTime() + (CONSULT_DURATION_MIN * 60000));
        var events = cal.getEvents(slotStart, slotEnd);

        if (events.length === 0) {
          var startStr = formatTime(slotStart);
          var endStr = formatTime(slotEnd);
          available.push({
            start: startStr,
            end: endStr,
            label: formatTimeRange(startStr, endStr)
          });
        }

        // Move to next 30-min slot
        slotStart = new Date(slotStart.getTime() + (CONSULT_DURATION_MIN * 60000));
      }
    }
  }

  return jsonResponse({ available: available, date: dateStr, type: type });
}

// Book an appointment
function bookAppointment(data) {
  var type = data.type; // 'visit' or 'consult'
  var dateStr = data.date; // YYYY-MM-DD
  var startTimeStr = data.startTime; // HH:MM
  var endTimeStr = data.endTime; // HH:MM
  var name = data.name;
  var email = data.email;
  var phone = data.phone || '';
  var address = data.address || '';
  var notes = data.notes || '';

  var startTime = parseTime(dateStr, startTimeStr);
  var endTime = parseTime(dateStr, endTimeStr);

  // Double-check availability
  var cal = CalendarApp.getCalendarById(CALENDAR_ID);
  var conflicts = cal.getEvents(startTime, endTime);
  if (conflicts.length > 0) {
    return jsonResponse({ success: false, error: 'That slot just got booked. Please pick another time.' });
  }

  // Create the calendar event
  var title = type === 'consult'
    ? 'GF - Consultation - ' + name
    : 'GF - Garden Visit - ' + name;

  var description = 'Booked via gardenfaery.love\n\n'
    + 'Name: ' + name + '\n'
    + 'Email: ' + email + '\n'
    + (phone ? 'Phone: ' + phone + '\n' : '')
    + (address ? 'Address: ' + address + '\n' : '')
    + (notes ? 'Notes: ' + notes + '\n' : '')
    + '\nType: ' + (type === 'consult' ? 'Free Consultation (30 min)' : 'Garden Care Visit');

  var event = cal.createEvent(title, startTime, endTime, {
    description: description,
    location: address
  });

  // Log to Google Sheet
  logBooking(type, dateStr, startTimeStr, endTimeStr, name, email, phone, address, notes);

  // Send confirmation email to client
  sendClientConfirmation(email, name, type, dateStr, startTimeStr, endTimeStr, address);

  // Send notification to Taya
  sendOwnerNotification(name, email, phone, address, notes, type, dateStr, startTimeStr, endTimeStr);

  return jsonResponse({
    success: true,
    message: type === 'consult'
      ? "You're booked! I'll see you in the garden."
      : "You're on the calendar! See you soon."
  });
}

// Log booking to Google Sheet
function logBooking(type, date, start, end, name, email, phone, address, notes) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Bookings');
  if (!sheet) {
    sheet = ss.insertSheet('Bookings');
    sheet.appendRow(['Timestamp', 'Type', 'Date', 'Start', 'End', 'Name', 'Email', 'Phone', 'Address', 'Notes']);
  }
  sheet.appendRow([new Date(), type, date, start, end, name, email, phone, address, notes]);
}

// Email confirmation to client
function sendClientConfirmation(email, name, type, date, start, end, address) {
  var dateObj = new Date(date + 'T12:00:00-07:00');
  var dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dateObj.getDay()];
  var monthName = ['January','February','March','April','May','June','July','August','September','October','November','December'][dateObj.getMonth()];
  var niceDate = dayName + ', ' + monthName + ' ' + dateObj.getDate();
  var timeRange = formatTimeRange(start, end);

  var typeName = type === 'consult' ? 'Free Garden Consultation' : 'Garden Care Visit';

  var subject = 'Garden Faery - ' + typeName + ' Confirmed!';
  var body = 'Hi ' + name + '!\n\n'
    + "You're booked for a " + typeName.toLowerCase() + '.\n\n'
    + 'When: ' + niceDate + ', ' + timeRange + '\n'
    + (address ? 'Where: ' + address + '\n' : '')
    + "\nI'll see you in the garden!\n\n"
    + "Taya\nGarden Faery\ngardenfaery.love";

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    name: 'Garden Faery',
    replyTo: OWNER_EMAIL
  });
}

// Email notification to Taya
function sendOwnerNotification(name, email, phone, address, notes, type, date, start, end) {
  var typeName = type === 'consult' ? 'Consultation' : 'Garden Care Visit';
  var subject = 'New Booking: ' + typeName + ' - ' + name;
  var body = 'New booking from gardenfaery.love!\n\n'
    + 'Type: ' + typeName + '\n'
    + 'Date: ' + date + '\n'
    + 'Time: ' + formatTimeRange(start, end) + '\n'
    + 'Name: ' + name + '\n'
    + 'Email: ' + email + '\n'
    + (phone ? 'Phone: ' + phone + '\n' : '')
    + (address ? 'Address: ' + address + '\n' : '')
    + (notes ? 'Notes: ' + notes + '\n' : '');

  MailApp.sendEmail(OWNER_EMAIL, subject, body);
}

// Helper: parse "HH:MM" into a Date object for a given date string
function parseTime(dateStr, timeStr) {
  var parts = timeStr.split(':');
  var d = new Date(dateStr + 'T' + timeStr + ':00-07:00');
  return d;
}

// Helper: format a Date object as "h:mm am/pm"
function formatTime(d) {
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
}

// Helper: format "HH:MM" as "h:mm am/pm"
function formatTimeLabel(timeStr) {
  var parts = timeStr.split(':');
  var h = parseInt(parts[0]);
  var m = parts[1];
  var ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return h + ':' + m + ' ' + ampm;
}

// Helper: format a range like "9:00 am - 2:00 pm"
function formatTimeRange(start, end) {
  return formatTimeLabel(start) + ' - ' + formatTimeLabel(end);
}

// Helper: return JSON response
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
