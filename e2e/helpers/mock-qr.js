/**
 * Mock QR code scanning by injecting a fake jsQR function
 * that returns a predefined QR code result.
 */
export async function mockQRCodeScan(page, qrCodeData) {
  const mockScript = (qrData) => {
    window.__qrMockData = qrData;
    window.__qrMockEnabled = false;

    const mockJSQR = function () {
      if (window.__qrMockEnabled) {
        return {
          data: window.__qrMockData,
          location: {
            topLeftCorner: { x: 10, y: 10 },
            topRightCorner: { x: 100, y: 10 },
            bottomRightCorner: { x: 100, y: 100 },
            bottomLeftCorner: { x: 10, y: 100 }
          }
        };
      }
      return null;
    };

    // Use defineProperty to handle potential overwrites from CDN script
    Object.defineProperty(window, "jsQR", {
      get: () => mockJSQR,
      set: () => {
        /* Prevent CDN from overwriting if it loads later */
      },
      configurable: true
    });
  };

  // For current page state (already loaded by fixture)
  await page.evaluate(mockScript, qrCodeData);
}

/**
 * Enable QR code mocking (will return the mocked data on next scan)
 */
export async function enableQRMock(page) {
  await page.evaluate(() => {
    window.__qrMockEnabled = true;
  });
}

/**
 * Disable QR code mocking
 */
export async function disableQRMock(page) {
  await page.evaluate(() => {
    window.__qrMockEnabled = false;
  });
}

/**
 * Mock getUserMedia to allow camera-less scanning in tests
 */
export async function mockGetUserMedia(page) {
  // Setup the scripts needed in page context
  await page.evaluate(setupMockUserMedia);
}

/**
 * This function is injected into the page context via page.evaluate
 * It sets up mocks for getUserMedia and video element properties
 */
function setupMockUserMedia() {
  setupGetUserMediaMock();
  setupVideoElementMocks();
}

/**
 * Set up the getUserMedia mock
 */
function setupGetUserMediaMock() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return;
  }

  navigator.mediaDevices.getUserMedia = createMockGetUserMedia();
}

/**
 * Create the mock getUserMedia function
 */
function createMockGetUserMedia() {
  return function (constraints) {
    const canvas = createBlackCanvas();
    return getStreamFromCanvas(canvas);
  };
}

/**
 * Create a black canvas for the mock video stream
 */
function createBlackCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 640, 480);
  return canvas;
}

/**
 * Get or create a stream from the canvas
 */
function getStreamFromCanvas(canvas) {
  try {
    const stream = canvas.captureStream(30);
    return Promise.resolve(stream);
  } catch (e) {
    return Promise.resolve(createMockMediaStream());
  }
}

/**
 * Create a fallback mock MediaStream
 */
function createMockMediaStream() {
  return {
    getTracks: () => [createMockTrack()],
    active: true,
    addTrack: () => {},
    removeTrack: () => {},
    getAudioTracks: () => [],
    getVideoTracks: () => [createMockTrack()]
  };
}

/**
 * Create a mock track object
 */
function createMockTrack() {
  return {
    stop: () => {},
    enabled: true,
    readyState: "live"
  };
}

/**
 * Set up video element property mocks
 */
function setupVideoElementMocks() {
  Object.defineProperty(HTMLVideoElement.prototype, "readyState", {
    get: function () {
      return 4; // HAVE_ENOUGH_DATA
    },
    configurable: true
  });

  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
    get: function () {
      return 640;
    },
    configurable: true
  });

  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", {
    get: function () {
      return 480;
    },
    configurable: true
  });
}

/**
 * Simulate clicking the scan button and waiting for camera to start
 */
export async function startQRScanner(page) {
  await mockGetUserMedia(page);
  await page.click("#qr-action-btn");
  await page.waitForSelector("#qr-scanner:not([hidden])", { timeout: 5000 });
  await page.waitForSelector("#qr-video", { timeout: 5000 });
}
