const workerCache = new Map();

export function createWorker(type, payload) {
  return new Promise((resolve, reject) => {
    const workerUrl = "./js/workers/data.worker.js";
    let worker = workerCache.get(workerUrl);

    if (!worker) {
      worker = new Worker(workerUrl, { type: "module" });
      workerCache.set(workerUrl, worker);
    }

    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);

    const handleMessage = (e) => {
      if (e.data.id === id) {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);

        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.result);
        }
      }
    };

    const handleError = (e) => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      reject(e);
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    worker.postMessage({ type, payload, id });
  });
}

export function terminateWorker() {
  workerCache.forEach((worker) => {
    worker.terminate();
  });
  workerCache.clear();
}
