const cameraButton = document.querySelector("#camera-button");
const uploadButton = document.querySelector("#upload-button");
const identifyButton = document.querySelector("#identify-button");
const captureButton = document.querySelector("#capture-button");
const fileInput = document.querySelector("#file-input");
const cameraPreview = document.querySelector("#camera-preview");
const photoPreview = document.querySelector("#photo-preview");
const emptyState = document.querySelector("#empty-state");
const stageBadge = document.querySelector("#stage-badge");
const stageBadgeText = document.querySelector("#stage-badge-text");
const statusMessage = document.querySelector("#status-message");
const results = document.querySelector("#results");
const topLabel = document.querySelector("#top-label");
const topConfidence = document.querySelector("#top-confidence");
const confidenceBar = document.querySelector("#confidence-bar");
const alternatives = document.querySelector("#alternatives");

let cameraStream;
let selectedImage;
let modelPromise;

function setStatus(message) {
  statusMessage.textContent = message;
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = undefined;
  }
  cameraPreview.srcObject = null;
  cameraPreview.hidden = true;
  captureButton.hidden = true;
}

function clearResults() {
  results.hidden = true;
  alternatives.replaceChildren();
  confidenceBar.style.width = "0";
}

function showSelectedPhoto(source) {
  stopCamera();
  selectedImage = source;
  photoPreview.src = source;
  photoPreview.hidden = false;
  emptyState.hidden = true;
  stageBadge.hidden = false;
  stageBadgeText.textContent = "Photo ready";
  identifyButton.disabled = false;
  clearResults();
  setStatus("Ready when you are. Your image stays on this device.");
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("Camera access isn't available here. Choose a photo instead.");
    return;
  }

  try {
    stopCamera();
    cameraStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } }
    });
    selectedImage = undefined;
    photoPreview.hidden = true;
    emptyState.hidden = true;
    clearResults();
    cameraPreview.srcObject = cameraStream;
    cameraPreview.hidden = false;
    captureButton.hidden = false;
    stageBadge.hidden = false;
    stageBadgeText.textContent = "Camera is on";
    identifyButton.disabled = true;
    setStatus("Center an object in the frame, then capture your photo.");
  } catch (error) {
    setStatus(error.name === "NotAllowedError"
      ? "Camera permission was denied. You can still choose a photo."
      : "Couldn't start the camera. Try choosing a photo instead.");
  }
}

function capturePhoto() {
  if (!cameraPreview.videoWidth || !cameraPreview.videoHeight) {
    setStatus("The camera is still starting. Try again in a moment.");
    return;
  }

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1280 / Math.max(cameraPreview.videoWidth, cameraPreview.videoHeight));
  canvas.width = Math.round(cameraPreview.videoWidth * scale);
  canvas.height = Math.round(cameraPreview.videoHeight * scale);
  canvas.getContext("2d").drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
  showSelectedPhoto(canvas.toDataURL("image/jpeg", 0.88));
}

function loadModel() {
  if (!modelPromise) {
    if (!window.mobilenet || !window.tf) {
      throw new Error("The AI model library couldn't be loaded. Check your internet connection and try again.");
    }
    modelPromise = window.mobilenet.load();
  }
  return modelPromise;
}

function readableLabel(label) {
  return label.split(",")[0].replaceAll("_", " ");
}

async function identifyObject() {
  if (!selectedImage) return;

  identifyButton.disabled = true;
  identifyButton.querySelector("span").textContent = "Looking closely…";
  setStatus("Loading the AI model. The first scan may take a little longer.");

  try {
    const model = await loadModel();
    const predictions = await model.classify(photoPreview, 3);
    if (!predictions.length) {
      throw new Error("The model couldn't identify this image. Try a clearer photo.");
    }

    const [best, ...otherMatches] = predictions;
    const confidence = Math.round(best.probability * 100);
    topLabel.textContent = readableLabel(best.className);
    topConfidence.textContent = `${confidence}%`;
    confidenceBar.style.width = `${confidence}%`;
    alternatives.replaceChildren(...otherMatches.map((prediction) => {
      const row = document.createElement("div");
      row.className = "alternative";
      const label = document.createElement("span");
      const score = document.createElement("span");
      label.textContent = readableLabel(prediction.className);
      score.textContent = `${Math.round(prediction.probability * 100)}%`;
      row.append(label, score);
      return row;
    }));
    results.hidden = false;
    stageBadgeText.textContent = "Scan complete";
    setStatus(confidence < 15
      ? "This is a low-confidence guess. Try a closer, well-lit photo."
      : "Here's what the AI thinks it spotted.");
  } catch (error) {
    if (error instanceof Error) {
      setStatus(error.message);
    } else {
      setStatus("Something went wrong while identifying the image. Please try again.");
    }
    modelPromise = undefined;
  } finally {
    identifyButton.disabled = false;
    identifyButton.querySelector("span").textContent = "Identify object";
  }
}

cameraButton.addEventListener("click", startCamera);
uploadButton.addEventListener("click", () => fileInput.click());
captureButton.addEventListener("click", capturePhoto);
identifyButton.addEventListener("click", identifyObject);
fileInput.addEventListener("change", () => {
  const [file] = fileInput.files ?? [];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setStatus("Choose an image file to identify.");
    fileInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    if (typeof reader.result === "string") showSelectedPhoto(reader.result);
  });
  reader.addEventListener("error", () => setStatus("Couldn't read that image. Try another photo."));
  reader.readAsDataURL(file);
  fileInput.value = "";
});

window.addEventListener("pagehide", stopCamera);
