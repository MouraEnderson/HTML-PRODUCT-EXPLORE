#!/usr/bin/env node
/**
 * Probe CAS — usa o MESMO código do Render (threeDxCasAuth.js).
 * Uso:
 *   THREEDX_USERNAME=... THREEDX_PASSWORD=... node scripts/postman-cas-probe.mjs
 */

import { probeCasAuth, getCasCredentials } from '../src/services/threeDxCasAuth.js';

const config = {
  spaceUrl:
    process.env.THREEDX_SPACE_URL ||
    process.env.SPACE_URL ||
    'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia',
  passportUrl: process.env.THREEDX_PASSPORT_URL || 'https://r1132100929518-eu1.iam.3dexperience.3ds.com',
  securityContext:
    process.env.THREEDX_SECURITY_CONTEXT ||
    process.env.SECURITY_CONTEXT ||
    'ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO',
  username: String(process.env.THREEDX_USERNAME || '').trim(),
  password: String(process.env.THREEDX_PASSWORD || '').trim()
};

const ROOT_ID = process.env.ROOT_ID || '63FC553465A62400699E0792000086AB';

function isLoginPage(text) {
  return /login \| 3dexperience id|title>login/i.test(String(text || ''));
}

async function main() {
  const report = {
    source: 'postman-cas-probe',
    usesSameCodeAsRender: true,
    config: {
      spaceUrl: config.spaceUrl,
      passportUrl: config.passportUrl,
      securityContext: config.securityContext,
      usernameConfigured: Boolean(config.username),
      passwordConfigured: Boolean(config.password)
    },
    steps: [],
    ok: false
  };

  if (!config.username || !config.password) {
    console.error('FAIL: set THREEDX_USERNAME and THREEDX_PASSWORD');
    process.exit(1);
  }

  const casProbe = await probeCasAuth(config);
  report.steps.push({
    step: '0-ticket',
    ok: Boolean(casProbe.ticketOk),
    status: casProbe.steps?.[0]?.ticketStatus || 0,
    lt: Boolean(casProbe.steps?.[0]?.hasLt),
    selectedPassport: casProbe.selectedPassport || null
  });

  if (!casProbe.ticketOk) {
    report.error = casProbe.error || 'Login ticket unavailable';
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  try {
    const creds = await getCasCredentials(config, { forceRefresh: true });
    report.steps.push({
      step: '1-cas-login',
      ok: true,
      hasCookie: Boolean(creds.cookie),
      hasCsrf: Boolean(creds.csrfToken)
    });
    report.steps.push({
      step: '2-csrf',
      ok: Boolean(creds.csrfToken),
      csrfHeaderName: creds.csrfHeaderName || 'ENO_CSRF_TOKEN'
    });

    const engUrl = `${config.spaceUrl.replace(/\/$/, '')}/resources/v1/modeler/dseng/dseng:EngItem/${encodeURIComponent(ROOT_ID)}`;
    const engRes = await fetch(engUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Cookie: creds.cookie,
        SecurityContext: config.securityContext,
        [creds.csrfHeaderName || 'ENO_CSRF_TOKEN']: creds.csrfToken || ''
      }
    });
    const engText = await engRes.text();
    report.steps.push({
      step: '3-engitem',
      ok: engRes.status === 200,
      status: engRes.status,
      body: engText.slice(0, 220).replace(/\s+/g, ' ')
    });
    report.ok = engRes.status === 200;
    if (!report.ok && isLoginPage(engText)) {
      report.error = 'EngItem returned login page — session invalid';
    }
  } catch (error) {
    const msg = String(error?.message || error);
    report.casLoginOk = false;
    report.casLoginError = msg;
    report.error = msg;
    report.steps.push({ step: '1-cas-login', ok: false, error: msg });
    if (/CAS login rejected/i.test(msg)) {
      report.hint = 'Senha ou usuário incorretos — ou MFA bloqueando login programático';
    } else if (/tenant .* does not exist/i.test(msg)) {
      report.hint = '3DSpace rejeitou tenant — problema plataforma/tenant (igual Render)';
    }
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
