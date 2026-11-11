import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 2 },   // ramp up muy suave
    { duration: '40s', target: 5 },   // 5 usuarios maximo
    { duration: '10s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% bajo 3s (mas laxo porque toca BD)
    errors: ['rate<0.02'],             // menos de 2% errores
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://barranco-system.vercel.app';

export default function () {
  // Endpoint liviano que consulta BD (contador). No expone datos.
  const res = http.get(`${BASE_URL}/api/public/products-count`);

  const ok = check(res, {
    'status es 200': (r) => r.status === 200,
    'respuesta bajo 3s': (r) => r.timings.duration < 3000,
    'body contiene count': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.count === 'number' && body.count >= 0;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!ok);
  sleep(3); // 3s entre requests para no saturar Supabase Free
}
