// ============================================================
// MENSAJES DE UI con paleta formal estilo Apple
// ============================================================

export const mensajes = {
  exito: {
    titulo: 'Listo',
    variante: 'success' as const,
    duracion: 3000
  },
  error: {
    titulo: 'Algo salió mal',
    variante: 'destructive' as const,
    duracion: 5000
  },
  advertencia: {
    titulo: 'Atención',
    variante: 'default' as const,
    duracion: 4000
  },
  info: {
    titulo: 'Información',
    variante: 'default' as const,
    duracion: 3000
  }
}

export const M = {
  // Caja
  cajaNoAbierta: 'El cajero debe abrir la sesión de caja antes de vender.',
  cajaAbierta: 'La caja está abierta. Ya puedes vender.',
  sesionAbierta: 'Sesión de caja abierta correctamente.',
  sesionCerrada: 'Sesión de caja cerrada correctamente.',

  // Pedidos
  pedidoCreado: 'El pedido se registró correctamente.',
  pedidoSinStock: 'El producto no tiene stock suficiente.',
  pedidoCancelado: 'El pedido se canceló y se revirtió el inventario.',
  pedidoSinProductos: 'Agrega al menos un producto al pedido.',

  // Cuentas
  cuentaAbierta: 'Cuenta abierta correctamente.',
  cuentaSinProductos: 'La cuenta no tiene productos. Agrega al menos uno antes de pedir la cuenta.',
  cuentaSolicitada: 'La cuenta se envió a caja.',
  cuentaCobrada: 'La cuenta se cobró correctamente.',
  cuentaCerrada: 'La mesa quedó disponible.',

  // Inventario
  inventarioActualizado: 'El inventario se actualizó.',
  movimientoRegistrado: 'El movimiento se registró correctamente.',
  stockInsuficiente: 'Stock insuficiente para completar la operación.',

  // Generales
  sinPermiso: 'No tienes permisos para esta acción.',
  sesionExpirada: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  errorConexion: 'No se pudo conectar con el servidor. Revisa tu conexión.',
  errorInesperado: 'Ocurrió un error inesperado. Intenta de nuevo.'
}
