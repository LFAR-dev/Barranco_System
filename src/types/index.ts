export interface Product {
  id: string
  nombre: string
  marca: string
  categoria: string
  presentacion: string
  volumen_ml: number
  costo_unitario: number
  precio_venta: number
  stock_actual: number
  stock_minimo: number
  activo: boolean
}

export interface Recipe {
  id: string
  nombre: string
  nombre_corto: string
  categoria: string
  metodo_preparacion: string
  garnish: string
  costo_total: number
  precio_venta: number
  margen_ganancia: number
  activa: boolean
  ingredientes: RecipeIngredient[]
}

export interface RecipeIngredient {
  id: string
  producto_id: string
  producto_nombre: string
  cantidad: number
  unidad: string
}

export interface Sale {
  id: string
  fecha_hora: string
  total: number
  metodo_pago: string
  receta: string
  bartender: string
  sucursal: string
}

export interface Bartender {
  id: string
  nombre_completo: string
  codigo: string
  activo: boolean
  ventas_totales: number
  bebidas_preparadas: number
}

export interface Waste {
  id: string
  producto: string
  cantidad: number
  motivo: string
  valor_perdido: number
  fecha: string
  bartender: string
}

export interface Alert {
  id: string
  tipo: string
  mensaje: string
  nivel: 'baja' | 'media' | 'alta' | 'critica'
  leida: boolean
  fecha_generacion: string
  accion_recomendada: string
}
