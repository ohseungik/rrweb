// 세션 스토리지 키
const RECORDING_STATE_KEY = 'rrweb_recording_state';
const EVENTS_STORAGE_KEY = 'rrweb_events';
const LOGS_STORAGE_KEY = 'rrweb_logs';

// rrwebRecord 기반 녹화 함수 정의
let events = [];
let logs = [];
let stopFn = null;

// 저장소에서 이벤트 로드
function loadEventsFromStorage() {
  try {
    const stored = sessionStorage.getItem(EVENTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load events from storage:', e);
    return [];
  }
}

// 저장소에서 로그 로드
function loadLogsFromStorage() {
  try {
    const stored = sessionStorage.getItem(LOGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load logs from storage:', e);
    return [];
  }
}

// 저장소에 이벤트 저장
function saveEventsToStorage(eventsToSave) {
  try {
    sessionStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(eventsToSave));
  } catch (e) {
    console.error('Failed to save events to storage:', e);
  }
}

// 저장소에 로그 저장
function saveLogsToStorage(logsToSave) {
  try {
    // 최대 10000개까지만 저장
    const trimmedLogs = logsToSave.slice(-10000);
    sessionStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(trimmedLogs));
  } catch (e) {
    console.error('Failed to save logs to storage:', e);
  }
}

// 녹화 상태 확인
function isRecordingActive() {
  return sessionStorage.getItem(RECORDING_STATE_KEY) === 'true';
}

// 녹화 상태 저장
function setRecordingState(state) {
  sessionStorage.setItem(RECORDING_STATE_KEY, state ? 'true' : 'false');
}

// 로그 추가 함수
function addLog(type, data) {
  const logEntry = {
    type: type,
    timestamp: Date.now(),
    url: window.location.href,
    data: data
  };
  
  logs.push(logEntry);
  saveLogsToStorage(logs);
}

// Console.log 가로채기
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

function interceptConsole() {
  console.log = function(...args) {
    if (isRecordingActive()) {
      addLog('console.log', {
        level: 'log',
        message: args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          } catch {
            return String(arg);
          }
        })
      });
    }
    originalConsoleLog.apply(console, args);
  };

  console.error = function(...args) {
    if (isRecordingActive()) {
      addLog('console.error', {
        level: 'error',
        message: args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          } catch {
            return String(arg);
          }
        })
      });
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = function(...args) {
    if (isRecordingActive()) {
      addLog('console.warn', {
        level: 'warn',
        message: args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          } catch {
            return String(arg);
          }
        })
      });
    }
    originalConsoleWarn.apply(console, args);
  };

  console.info = function(...args) {
    if (isRecordingActive()) {
      addLog('console.info', {
        level: 'info',
        message: args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          } catch {
            return String(arg);
          }
        })
      });
    }
    originalConsoleInfo.apply(console, args);
  };
}

// XMLHttpRequest 가로채기
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

function interceptXHR() {
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._rrweb_method = method;
    this._rrweb_url = url;
    this._rrweb_startTime = Date.now();
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (isRecordingActive()) {
      const xhr = this;
      const requestData = {
        method: xhr._rrweb_method,
        url: xhr._rrweb_url,
        body: body
      };

      // 요청 로그
      addLog('network.request', {
        type: 'XMLHttpRequest',
        method: xhr._rrweb_method,
        url: xhr._rrweb_url,
        body: body ? (typeof body === 'string' ? body : '[FormData/Blob]') : null,
        timestamp: xhr._rrweb_startTime
      });

      // 응답 가로채기
      const originalOnReadyStateChange = xhr.onreadystatechange;
      
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && isRecordingActive()) {
          const duration = Date.now() - xhr._rrweb_startTime;
          
          addLog('network.response', {
            type: 'XMLHttpRequest',
            method: xhr._rrweb_method,
            url: xhr._rrweb_url,
            status: xhr.status,
            statusText: xhr.statusText,
            response: xhr.responseText ? xhr.responseText.substring(0, 10000) : null, // 처음 10000자만
            duration: duration,
            timestamp: Date.now()
          });
        }

        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(this, arguments);
        }
      };
    }

    return originalXHRSend.apply(this, arguments);
  };
}

// Fetch API 가로채기
const originalFetch = window.fetch;

function interceptFetch() {
  window.fetch = function(url, options = {}) {
    const startTime = Date.now();
    
    if (isRecordingActive()) {
      // 요청 로그
      addLog('network.request', {
        type: 'fetch',
        method: options.method || 'GET',
        url: typeof url === 'string' ? url : url.url,
        headers: options.headers,
        body: options.body ? (typeof options.body === 'string' ? options.body : '[FormData/Blob]') : null,
        timestamp: startTime
      });
    }

    return originalFetch.apply(this, arguments).then(response => {
      if (isRecordingActive()) {
        const duration = Date.now() - startTime;
        
        // 응답을 복제해서 로그에 저장
        response.clone().text().then(responseText => {
          addLog('network.response', {
            type: 'fetch',
            method: options.method || 'GET',
            url: typeof url === 'string' ? url : url.url,
            status: response.status,
            statusText: response.statusText,
            response: responseText ? responseText.substring(0, 10000) : null, // 처음 10000자만
            duration: duration,
            timestamp: Date.now()
          });
        }).catch(err => {
          console.error('Failed to read response:', err);
        });
      }

      return response;
    }).catch(error => {
      if (isRecordingActive()) {
        const duration = Date.now() - startTime;
        
        addLog('network.error', {
          type: 'fetch',
          method: options.method || 'GET',
          url: typeof url === 'string' ? url : url.url,
          error: error.message,
          duration: duration,
          timestamp: Date.now()
        });
      }

      throw error;
    });
  };
}

// Axios 인터셉터 (Axios가 로드된 경우)
function interceptAxios() {
  if (window.axios) {
    // 요청 인터셉터
    window.axios.interceptors.request.use(
      config => {
        if (isRecordingActive()) {
          config._rrweb_startTime = Date.now();
          
          addLog('network.request', {
            type: 'axios',
            method: config.method?.toUpperCase(),
            url: config.url,
            headers: config.headers,
            params: config.params,
            data: config.data,
            timestamp: config._rrweb_startTime
          });
        }
        return config;
      },
      error => {
        if (isRecordingActive()) {
          addLog('network.error', {
            type: 'axios',
            error: error.message,
            timestamp: Date.now()
          });
        }
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터
    window.axios.interceptors.response.use(
      response => {
        if (isRecordingActive() && response.config._rrweb_startTime) {
          const duration = Date.now() - response.config._rrweb_startTime;
          
          addLog('network.response', {
            type: 'axios',
            method: response.config.method?.toUpperCase(),
            url: response.config.url,
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            duration: duration,
            timestamp: Date.now()
          });
        }
        return response;
      },
      error => {
        if (isRecordingActive()) {
          const config = error.config || {};
          const duration = config._rrweb_startTime ? Date.now() - config._rrweb_startTime : 0;
          
          addLog('network.error', {
            type: 'axios',
            method: config.method?.toUpperCase(),
            url: config.url,
            status: error.response?.status,
            statusText: error.response?.statusText,
            error: error.message,
            duration: duration,
            timestamp: Date.now()
          });
        }
        return Promise.reject(error);
      }
    );
  }
}

// 전역 에러 핸들러
function interceptErrors() {
  window.addEventListener('error', (event) => {
    if (isRecordingActive()) {
      addLog('error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isRecordingActive()) {
      addLog('unhandledRejection', {
        reason: event.reason,
        promise: String(event.promise)
      });
    }
  });
}

function startRecording() {
  if (stopFn) {
    console.log('⚠️ 이미 녹화 중입니다.');
    return;
  }

  // 기존 저장된 이벤트 및 로그 로드
  const storedEvents = loadEventsFromStorage();
  const storedLogs = loadLogsFromStorage();
  events = storedEvents.length > 0 ? storedEvents : [];
  logs = storedLogs.length > 0 ? storedLogs : [];
  
  console.log(`🎬 녹화 시작 (기존 이벤트: ${events.length}개, 로그: ${logs.length}개)`);

  if (window.rrwebRecord) {
    stopFn = window.rrwebRecord({
      emit(event) {
        events.push(event);
        saveEventsToStorage(events);
      },
      recordLog: true, // rrweb 내장 로그 기록 활성화
      plugins: [
        window.rrwebRecord.getRecordConsolePlugin ? window.rrwebRecord.getRecordConsolePlugin() : null,
      ].filter(Boolean),
    });
    
    setRecordingState(true);
    
    // 인터셉터 활성화
    interceptConsole();
    interceptXHR();
    interceptFetch();
    interceptAxios();
    interceptErrors();
  } else {
    alert('rrwebRecord 라이브러리가 로드되지 않았습니다.');
  }
}

function stopRecording() {
  if (!stopFn) {
    console.log('⚠️ 녹화 중이 아닙니다.');
    return;
  }

  console.log('⏹️ 녹화 중지');
  
  stopFn();
  stopFn = null;
  
  setRecordingState(false);
}

function getEvents() {
  return events;
}

function getLogs() {
  return logs;
}

// 저장소 초기화 (전송 완료 후 호출)
function clearStorage() {
  sessionStorage.removeItem(EVENTS_STORAGE_KEY);
  sessionStorage.removeItem(LOGS_STORAGE_KEY);
  sessionStorage.removeItem(RECORDING_STATE_KEY);
  events = [];
  logs = [];
  console.log('🗑️ 저장소 초기화 완료');
}

// 녹화 재개 (페이지 로드 시 자동 호출)
function resumeRecording() {
  if (isRecordingActive() && !stopFn) {
    console.log('🔄 이전 세션에서 녹화 재개');
    startRecording();
    return true;
  }
  return false;
}

// 버튼 가시성 업데이트
function updateButtonVisibility(isRecording) {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  
  if (startBtn && stopBtn) {
    if (isRecording) {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'flex';
    } else {
      startBtn.style.display = 'flex';
      stopBtn.style.display = 'none';
    }
  }
}

// 버튼 생성 및 이벤트 등록
function setupRecorderUI() {
  const existingContainer = document.getElementById('rrweb-recorder-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  const btnContainer = document.createElement('div');
  btnContainer.id = 'rrweb-recorder-container';
  btnContainer.style.position = 'fixed';
  btnContainer.style.left = '20px';
  btnContainer.style.bottom = '20px';
  btnContainer.style.zIndex = '9999';
  btnContainer.style.display = 'flex';
  btnContainer.style.flexDirection = 'column';
  btnContainer.style.gap = '10px';

  const startBtn = document.createElement('button');
  startBtn.id = 'startBtn';
  startBtn.innerHTML = '<span style="font-size:24px;">+</span>';
  startBtn.style.width = '48px';
  startBtn.style.height = '48px';
  startBtn.style.borderRadius = '50%';
  startBtn.style.background = '#222';
  startBtn.style.color = '#fff';
  startBtn.style.border = 'none';
  startBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  startBtn.style.cursor = 'pointer';
  startBtn.style.display = 'flex';
  startBtn.style.alignItems = 'center';
  startBtn.style.justifyContent = 'center';
  startBtn.style.fontWeight = 'bold';
  startBtn.style.fontSize = '24px';

  const stopBtn = document.createElement('button');
  stopBtn.id = 'stopBtn';
  stopBtn.innerHTML = '<span style="font-size:24px;">&#10005;</span>';
  stopBtn.style.width = '48px';
  stopBtn.style.height = '48px';
  stopBtn.style.borderRadius = '50%';
  stopBtn.style.background = '#e53935';
  stopBtn.style.color = '#fff';
  stopBtn.style.border = 'none';
  stopBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  stopBtn.style.cursor = 'pointer';
  stopBtn.style.display = 'flex';
  stopBtn.style.alignItems = 'center';
  stopBtn.style.justifyContent = 'center';
  stopBtn.style.fontWeight = 'bold';
  stopBtn.style.fontSize = '24px';
  stopBtn.style.display = 'none';

  btnContainer.appendChild(startBtn);
  btnContainer.appendChild(stopBtn);
  document.body.appendChild(btnContainer);

  startBtn.addEventListener('click', () => {
    console.log('🎬 사용자가 녹화 시작 버튼 클릭');
    startRecording();
    updateButtonVisibility(true);
  });

  stopBtn.addEventListener('click', () => {
    console.log('⏹️ 사용자가 녹화 중지 버튼 클릭');
    stopRecording();
    updateButtonVisibility(false);
    
    const currentEvents = getEvents();
    const currentLogs = getLogs();
    console.log(`📦 저장된 이벤트: ${currentEvents.length}개, 로그: ${currentLogs.length}개`);

    fetch('http://192.168.123.44:3000/save-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          events: currentEvents,
          logs: currentLogs,
          sessionInfo: {
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: Date.now()
          }
        }),
    })
    .then(response => {
      if (response.ok) {
        console.log('✅ 이벤트 및 로그 전송 완료');
        clearStorage();
      } else {
        console.error('❌ 전송 실패');
      }
    })
    .catch(error => {
      console.error('❌ 전송 오류:', error);
    });
  });
  
  const wasRecording = resumeRecording();
  updateButtonVisibility(wasRecording);
}

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupRecorderUI);
} else {
  setupRecorderUI();
}

// 디버깅용 전역 함수
window.rrwebRecorderDebug = {
  getEvents,
  getLogs,
  isRecording: isRecordingActive,
  clearStorage,
  getStoredEvents: loadEventsFromStorage,
  getStoredLogs: loadLogsFromStorage,
  eventCount: () => events.length,
  logCount: () => logs.length,
};