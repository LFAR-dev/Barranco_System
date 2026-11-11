import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://barranco-system.vercel.app';

export default function () {
  const res = http.get(`${BASE_URL}/api/health`);

  const ok = check(res, {
    'status es 200': (r) => r.status === 200,
    'respuesta bajo 1.5s': (r) => r.timings.duration < 1500,
  });

  errorRate.add(!ok);
  sleep(1);
}
