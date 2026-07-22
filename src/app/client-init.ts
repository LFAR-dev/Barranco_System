// ============================================================
// INICIALIZACIÓN DEL CLIENTE - SILENCIAR ERRORES
// ============================================================

if (typeof window !== 'undefined') {
  // Método alternativo: Interceptar errores en el nivel más alto
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const msg = message?.toString?.() || '';
    const src = source?.toString?.() || '';
    
    const ignorePatterns = [
      'monica-id',
      'monica-version',
      'Extra attributes from the server',
      'listener indicated an asynchronous response',
      'message channel closed before a response',
      'Unchecked runtime.lastError',
    ];
    
    for (const pattern of ignorePatterns) {
      if (msg.includes(pattern) || src.includes(pattern)) {
        return true; // Retorna true para evitar que el error se propague
      }
    }
    
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // También interceptar errores de React
  const originalConsoleError = console.error;
  console.error = function(...args: any[]) {
    const msg = args[0]?.toString?.() || '';
    const ignorePatterns = [
      'monica-id',
      'monica-version',
      'Extra attributes from the server',
      'listener indicated an asynchronous response',
      'message channel closed before a response',
      'Unchecked runtime.lastError',
    ];
    
    for (const pattern of ignorePatterns) {
      if (msg.includes(pattern)) {
        return;
      }
    }
    originalConsoleError.apply(console, args);
  };

  // Limpiar atributos del body
  function cleanBodyAttributes() {
    const body = document.body;
    if (body) {
      ['monica-id', 'monica-version'].forEach(attr => {
        if (body.hasAttribute(attr)) {
          body.removeAttribute(attr);
        }
      });
    }
  }

  // Ejecutar limpieza
  cleanBodyAttributes();
  
  // Observar cambios
  const observer = new MutationObserver(() => {
    cleanBodyAttributes();
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['monica-id', 'monica-version'],
    subtree: true,
  });

  console.log('✅ Barranco: Sistema de silencio de errores activado');
}
