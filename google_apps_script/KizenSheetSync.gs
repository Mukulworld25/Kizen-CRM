/**
 * Kizen CRM — Google Sheets Live Sync Apps Script
 * Automatically streams rows added to this sheet to Kizen CRM via Webhook.
 */

// CONFIGURATION
var KIZEN_WEBHOOK_URL = "https://zmqvjtenuxlvwfopfroc.supabase.co/functions/v1/sheet-webhook-intake";
var SHARED_WEBHOOK_SECRET = "YOUR_SHEET_WEBHOOK_SECRET_HERE"; // Copy from Kizen CRM Settings -> Data Intake

/**
 * On Form Submit / Row Edit Trigger Function
 */
function onFormSubmitOrEdit(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      Logger.log("No data rows found.");
      return;
    }

    // First row is headers
    var headers = data[0].map(function(h) { return String(h).trim(); });

    // Remaining rows
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var rowObj = {};
      var isEmptyRow = true;
      for (var j = 0; j < headers.length; j++) {
        var val = data[i][j];
        if (val !== "" && val !== null && val !== undefined) {
          isEmptyRow = false;
        }
        rowObj[headers[j]] = val;
      }
      if (!isEmptyRow) {
        rows.push(rowObj);
      }
    }

    if (rows.length === 0) {
      Logger.log("No non-empty rows to send.");
      return;
    }

    var payload = {
      filename: SpreadsheetApp.getActiveSpreadsheet().getName() + " - " + sheet.getName(),
      headers: headers,
      rows: rows
    };

    var options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "x-webhook-secret": SHARED_WEBHOOK_SECRET
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(KIZEN_WEBHOOK_URL, options);
    Logger.log("Sync Response Code: " + response.getResponseCode());
    Logger.log("Sync Response Body: " + response.getContentText());

  } catch (err) {
    Logger.log("Error in KizenSheetSync: " + err.toString());
  }
}

/**
 * Custom Menu to trigger manual sync from Google Sheets UI
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Kizen CRM Sync")
    .addItem("Sync Now to Kizen CRM", "onFormSubmitOrEdit")
    .addToUi();
}
