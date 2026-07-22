// ============================================================
// SILENCIAR ERRORES DE EXTENSIONES DE CHROME Y ARIA
// ============================================================

if (typeof window !== 'undefined') {
  // Guardar referencias originales
  const originalError = console.error;
  const originalWarn = console.warn;

  // Patrones a ignorar - MÁS COMPLETO
  const ignorePatterns = [
    'listener indicated an asynchronous response',
    'message channel closed before a response',
    'Unchecked runtime.lastError',
    'monica-id',
    'monica-version',
    'Extra attributes from the server',
    'A listener indicated an asynchronous response',
    'monica',
    'content_script',
    'chrome-extension',
    'Extension',
    'runtime.lastError',
    'The message channel closed before a response was received',
    'Extension context invalidated',
    'Could not establish connection',
    'aria-hidden',
    'Blocked aria-hidden',
    'aria-hidden on an element because its descendant retained focus',
  ];

  function shouldIgnore(message: string): boolean {
    if (!message) return false;
    const msg = message.toString().toLowerCase();
    for (const pattern of ignorePatterns) {
      if (msg.includes(pattern.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  // Sobrescribir console.error
  console.error = function(...args: any[]) {
    const message = args[0]?.toString?.() || '';
    if (shouldIgnore(message)) {
      return;
    }
    // Verificar si el error viene de una extensión
    const stack = args[1]?.stack?.toString?.() || '';
    if (stack.includes('chrome-extension://') || stack.includes('extensions/')) {
      return;
    }
    originalError.apply(console, args);
  };

  // Sobrescribir console.warn
  console.warn = function(...args: any[]) {
    const message = args[0]?.toString?.() || '';
    if (shouldIgnore(message)) {
      return;
    }
    originalWarn.apply(console, args);
  };

  // Silenciar errores no capturados
  window.addEventListener('unhandledrejection', function(e) {
    const message = e.reason?.message || e.reason || '';
    if (shouldIgnore(message)) {
      e.preventDefault();
      return;
    }
    const stack = e.reason?.stack || '';
    if (stack.includes('chrome-extension://') || stack.includes('extensions/')) {
      e.preventDefault();
      return;
    }
  });

  // Silenciar errores de carga de recursos
  window.addEventListener('error', function(e) {
    const message = e.message || '';
    if (shouldIgnore(message)) {
      e.preventDefault();
      return;
    }
    const filename = e.filename || '';
    if (filename.includes('chrome-extension://') || filename.includes('extensions/')) {
      e.preventDefault();
      return;
    }
  }, true);

  // SOBRESCRIBIR CONSOLE.WARN PARA ARIA-HIDDEN
  const originalConsoleWarn = console.warn;
  console.warn = function(...args: any[]) {
    const message = args[0]?.toString?.() || '';
    if (message.includes('aria-hidden') || 
        message.includes('Blocked aria-hidden') ||
        message.includes('retained focus')) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  console.log('✅ Barranco: Errores de extensiones y aria-hidden silenciados');
}
