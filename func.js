let cmrflinput = document.getElementById('cmrflfileinput');
let rvtinput = document.getElementById('rvtfileinput');

var inputFile = null;
var accessToken = null;
var downloadUrl = null;
var uploadUrl = null;
var workItemID = null;
var bucket = null;
var activityID = null;
var fileContentType = null;

cmrflinput.addEventListener('change', function(){
  bucket = "test_rvtbucket";
  activityID = "ConvertToRVT.ConvertRVT+test";
  fileContentType = "application/zip";
  showLoading();
});
cmrflinput.addEventListener('change', main);

rvtinput.addEventListener('change', function(){
  bucket = "test_importbucket";
  activityID = "ConvertToRVT.ConvertCMRFP+test";
  fileContentType = "application/octet-stream";
  showLoading();
});
rvtinput.addEventListener('change', main);

function main(evt){
  importFile(evt);
}

function showLoading(){
  // $("#coverScreen").show();
  document.getElementById("coverScreen").style.visibility = "visible";
}

function hideLoading(){
  // $("#coverScreen").hide();
  document.getElementById("coverScreen").style.visibility = "hidden";
}

function renameFile(originalFile, newName) {
    return new File([originalFile], newName, {
        type: originalFile.type,
        lastModified: originalFile.lastModified,
    });
}


async function importFile(evt) {
  console.log("Updated");
  inputFile = evt.target.files[0];
  inputFile = renameFile(inputFile, "test_out.cmrfl");
  console.log(inputFile.name);

  var zip = new JSZip();
  var newFile = null;
  var restor_database = "/blob/main/Metric furniture.rft"; // name of the file with extension come from a list here with jquery

  fetch(restor_database) // path of the file
  .then(res => res.arrayBuffer())
  .then(ab => {
  zip.file(restor_database , ab,{binary:true})}); // add the file

  zip.file("Metric Furniture.rft");
  zip.file("test_out.cmrfl", inputFile);
  await zip.generateAsync({ type: 'blob' }).then((blob = Blob) => {
    newFile = new File([blob], "test_out.cmrfl".split('.')[0] + '.zip', {
      lastModified: inputFile.lastModified,
      type: 'application/zip'
    });
  });
  console.log(newFile);
  return;

  // Getting access token
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
  myHeaders.append("Cookie", "PF=lWRxmNZpCHYORClEc21BSU");

  var urlencoded = new URLSearchParams();
  urlencoded.append("client_id", "4XEI8qNKcezWD2POoGMI8QEkYGyfoR0H");
  urlencoded.append("client_secret", "SBrsCN01PpCvZ6H4");
  urlencoded.append("grant_type", "client_credentials");
  urlencoded.append("scope", "code:all data:write data:read bucket:create bucket:delete");

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: urlencoded,
    redirect: 'follow'
  };

  fetch("https://developer.api.autodesk.com/authentication/v1/authenticate", requestOptions)
    .then(response => response.text())
    .then(function(result) {
      result = JSON.parse(result)
      accessToken = result.access_token;
      uploadFile();
    })
    .catch(error => console.log('error', error));
}


function uploadFile(result) {
  console.log("Uploading file");
  var myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer " + accessToken);
  myHeaders.append("Accept-Encoding", "gzip, deflate");
  myHeaders.append("Content-Type", fileContentType);
  myHeaders.append("Cookie", "PF=lWRxmNZpCHYORClEc21BSU");

  var file = inputFile;

  var requestOptions = {
    method: 'PUT',
    headers: myHeaders,
    body: file,
    redirect: 'follow'
  };

  fetch("https://developer.api.autodesk.com/oss/v2/buckets/" + bucket + "/objects/test_blank", requestOptions)
    .then(response => response.text())
    .then(function(result) {
      getDownloadUrl();
    })
    .catch(error => console.log('error', error));
}

function getDownloadUrl() {
  console.log("Download URL");
  var myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer " + accessToken);
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Cookie", "PF=lWRxmNZpCHYORClEc21BSU");

  var raw = JSON.stringify({});

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  fetch("https://developer.api.autodesk.com/oss/v2/buckets/" + bucket + "/objects/test_blank/signed", requestOptions)
    .then(response => response.text())
    .then(function(result) {
      result = JSON.parse(result)
      downloadUrl = result.signedUrl;
      getUploadUrl();
    })
    .catch(error => console.log('error', error));
}


function getUploadUrl() {
  console.log("Upload URL");
  var myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer " + accessToken);
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Cookie", "PF=lWRxmNZpCHYORClEc21BSU");

  var raw = JSON.stringify({});

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  fetch("https://developer.api.autodesk.com/oss/v2/buckets/" + bucket + "/objects/test_blank/signed?access=readwrite", requestOptions)
    .then(response => response.text())
    .then(function(result) {
      result = JSON.parse(result)
      uploadUrl = result.signedUrl;
      createWorkItem();
    })
    .catch(error => console.log('error', error));
}

// TODO: Add onComplete callback instead of making separate calls to check status for completion
function createWorkItem() {
  console.log("Creating workitem");
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", "Bearer " + accessToken);
  myHeaders.append("Cookie", "PF=lWRxmNZpCHYORClEc21BSU");

  var raw = JSON.stringify({
    "activityId": activityID,
    "arguments": {
      "rvtFile": {
        "url": downloadUrl
      },
      "result": {
        "verb": "put",
        "url": uploadUrl
      }
    }
  });

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  fetch("https://developer.api.autodesk.com/da/us-east/v3/workitems", requestOptions)
    .then(response => response.text())
    .then(function(result) {
      result = JSON.parse(result)
      workItemID = result.id;
      checkWorkItem();
    })
    .catch(error => console.log('error', error));
}

function checkWorkItem() {
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", "Bearer " + accessToken);

  var requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
  };

  fetch("https://developer.api.autodesk.com/da/us-east/v3/workitems/" + workItemID, requestOptions)
    .then(response => response.text())
    .then(function(result) {
      result = JSON.parse(result);
      if (result.status == "success") {
        window.open(uploadUrl, '_self');
        hideLoading();
        console.log("done");
      }
      else if (result.status == "failedInstructions") {
        console.log("failed");
      }
      else {
        setTimeout(function(){
          console.log("next try");
          checkWorkItem();
        },3000);
      }
    })
    .catch(error => console.log('error', error));
}
