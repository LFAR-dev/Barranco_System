'use client'

import { useEffect } from 'react'

export function CleanAttributesProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Función para limpiar atributos de extensiones
    const cleanAttributes = () => {
      const body = document.body;
      const html = document.documentElement;
      
      // Lista de atributos a eliminar
      const attrsToRemove = [
        'monica-id',
        'monica-version',
        'data-monica-id',
        'data-monica-version',
        'monica-extension'
      ];
      
      // Limpiar body
      if (body) {
        attrsToRemove.forEach(attr => {
          if (body.hasAttribute(attr)) {
            body.removeAttribute(attr);
          }
        });
      }
      
      // Limpiar html
      if (html) {
        attrsToRemove.forEach(attr => {
          if (html.hasAttribute(attr)) {
            html.removeAttribute(attr);
          }
        });
      }
      
      // Limpiar todos los elementos que puedan tener estos atributos
      document.querySelectorAll('[monica-id], [monica-version], [data-monica-id], [data-monica-version]').forEach(el => {
        attrsToRemove.forEach(attr => {
          if (el.hasAttribute(attr)) {
            el.removeAttribute(attr);
          }
        });
      });
    };

    // Ejecutar limpieza inmediatamente
    cleanAttributes();

    // Observar cambios en el DOM
    const observer = new MutationObserver(() => {
      cleanAttributes();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'monica-id',
        'monica-version',
        'data-monica-id',
        'data-monica-version'
      ],
      subtree: true,
      childList: true,
    });

    // Limpiar cada 500ms como fallback
    const interval = setInterval(cleanAttributes, 500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}
