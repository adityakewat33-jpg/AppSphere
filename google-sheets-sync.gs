/**
 * AppSphere - Google Sheets Realtime Downloads Counter Webhook
 */

function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // 10 second lock to handle concurrent downloads safely

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // Auto-initialize headers if new sheet
    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
      sheet.appendRow(["App ID", "App Title", "Downloads", "Last Downloaded"]);
      sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#01875f").setFontColor("#ffffff");
      sheet.appendRow(["flapmaster", "FlapMaster Arcade", 0, ""]);
      sheet.appendRow(["statussaver", "Status Saver & Insta Downloader", 0, ""]);
      sheet.appendRow(["blastgrid", "BlastGrid", 0, ""]);
      sheet.appendRow(["arrowjam", "Arrow Jam: Escape & Untangle", 0, ""]);
      sheet.autoResizeColumns(1, 4);
    }

    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "get";
    var appId = (e && e.parameter && e.parameter.appId) ? e.parameter.appId.toLowerCase() : "";

    var data = sheet.getDataRange().getValues();

    // ACTION: Increment download
    if (action === "increment" && appId) {
      var found = false;
      var newCount = 1;
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString().toLowerCase() === appId) {
          found = true;
          newCount = (Number(data[i][2]) || 0) + 1;
          sheet.getRange(i + 1, 3).setValue(newCount);
          sheet.getRange(i + 1, 4).setValue(new Date().toLocaleString());
          break;
        }
      }

      // If app is not yet in sheet, append it
      if (!found) {
        newCount = 1;
        sheet.appendRow([appId, appId, newCount, new Date().toLocaleString()]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        action: "increment",
        appId: appId,
        downloads: newCount
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION: Get all download counts
    var downloadsMap = {};
    for (var j = 1; j < data.length; j++) {
      var rowId = data[j][0] ? data[j][0].toString().toLowerCase() : "";
      if (rowId) {
        downloadsMap[rowId] = Number(data[j][2]) || 0;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      action: "get",
      downloads: downloadsMap
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  return doGet(e);
}
