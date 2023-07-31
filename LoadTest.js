import {
  Httpx,
  Request,
  Get,
  Post,
} from 'https://jslib.k6.io/httpx/0.0.2/index.js';
import { describe } from 'https://jslib.k6.io/functional/0.0.3/index.js';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';

export const options = {
  scenarios: {
    first_test: {
      //better name
      executor: 'first_test',
      thresholds: {
        http_req_duration: ['p(90)<170'],
        http_req_duration: ['p(95)<190'],
        http_req_duration: ['p(99)<250'],
        rate: 100,
        duration: '20s',
        preAllocatedVUs: 2,
        maxVUs: 10,
      },
    },
    second_test: {
      executor: 'second_test',
      thresholds: {
        checks: [{ threshold: 'rate == 1.00', abortOnFail: false }],
      },
      stages: [
        { duration: '10s', target: 50 },
        { duration: '10s', target: 100 },
        { duration: '10s', target: 100 },
        { duration: '10s', target: 0 },
      ],
    },
  },
};

const WRONGUSERNAME = 'WRONG';
const USERNAME = 'SomaTestUser';
const PASSWORD = 'userpassword';

let session = new Httpx({ baseURL: 'https://test-api.k6.io' });

export default function testSuite() {
  describe(`01 Authenticate with ${USERNAME}`, (t) => {
    let resp = session.post(`/auth/token/login/`, {
      username: USERNAME,
      password: PASSWORD,
    });
    t.expect(resp.status)
      .as('Auth status')
      .toBeBetween(200, 204)
      .and(resp)
      .toHaveValidJson()
      .and(resp.json('access'))
      .as('auth token')
      .toBeTruthy();

    let authToken = resp.json('access');
    session.addHeader('Authorization', `Bearer ${authToken}`);
  });

  describe('02. Fetch public crocs', (t) => {
    let responses = session.batch([
      new Get('/public/crocodiles/1/'),
      new Get('/public/crocodiles/2/'),
      new Get('/public/crocodiles/3/'),
      new Get('/public/crocodiles/4/'),
      new Get('/public/crocodiles/5/'),
      new Get('/public/crocodiles/6/'),
    ]);
    responses.forEach((response) => {
      t.expect(response.status)
        .as('response status')
        .toEqual(200)
        .and(response)
        .toHaveValidJson()
        .and(response.json('age'))
        .as('croc age')
        .toBeGreaterThan(10);
    });
  });

  describe('03. Create a new crocodile', (t) => {
    let payload = {
      name: `first`,
      sex: randomItem(['M', 'F']),
      date_of_birth: '2000-01-01',
    };

    let resp = session.post(`/my/crocodiles/`, payload);

    t.expect(resp.status)
      .as('Croc creation status')
      .toEqual(201)
      .and(resp)
      .toHaveValidJson();

    session.newCrocId = resp.json('id');
  });

  describe('04. Fetch private crocs', (t) => {
    let response = session.get('/my/crocodiles/');
    t.expect(response.status)
      .as('response status')
      .toEqual(200)
      .and(response)
      .toHaveValidJson()
      .and(response.json().length)
      .as('number of crocs')
      .toEqual(1);
  });

  describe('05. Delete the croc', (t) => {
    let resp = session.delete(`/my/crocodiles/${session.newCrocId}/`);

    t.expect(resp.status).as('Croc delete status').toEqual(204);
  });
}
