import test from 'node:test';
import assert from 'node:assert/strict';
import {loginErrorMessage} from '../lib/auth-error.ts';

test('hourly email quota takes precedence over generic HTTP 429 advice', () => {
  const message = loginErrorMessage({code:'over_email_send_rate_limit',status:429});
  assert.match(message,/2 correos por hora/);
  assert.match(message,/hasta una hora/);
  assert.doesNotMatch(message,/un minuto/);
});

test('unauthorized address and request throttling give distinct recovery advice', () => {
  assert.match(loginErrorMessage({code:'email_address_not_authorized'}),/todavía no está autorizado/);
  assert.match(loginErrorMessage({status:429}),/demasiados intentos/);
});

test('unknown failures never expose raw provider error details', () => {
  for (const error of [null,undefined,new Error('private diagnostic'),{message:'private diagnostic'}]) {
    const message = loginErrorMessage(error);
    assert.match(message,/conexión/);
    assert.doesNotMatch(message,/private diagnostic/);
  }
});
