/**
 * Vercel Serverless Function — Rapport journalier CRM
 * Déclenché chaque jour à 15h UTC (= 19h La Réunion UTC+4)
 * via vercel.json cron: "0 15 * * *"
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const REUNION_TZ = 'Indian/Reunion';

function reunionDate(date = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: REUNION_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function reunionTime(date = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: REUNION_TZ,
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function todayBoundsReunion() {
  // Get today's start and end in Reunion time, expressed as UTC ISO strings
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: REUNION_TZ }).format(now); // "YYYY-MM-DD"
  const startLocal = new Date(`${dateStr}T00:00:00+04:00`);
  const endLocal   = new Date(`${dateStr}T23:59:59+04:00`);
  return { start: startLocal.toISOString(), end: endLocal.toISOString(), dateStr };
}

function fcfa(n) {
  return Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
}

function statusBadge(status) {
  const map = {
    'Confirmée':  { bg: '#dcfce7', color: '#166534' },
    'En cours':   { bg: '#dbeafe', color: '#1e40af' },
    'Terminée':   { bg: '#f1f5f9', color: '#475569' },
    'Annulée':    { bg: '#fee2e2', color: '#991b1b' },
    'En attente': { bg: '#fef9c3', color: '#854d0e' },
  };
  const s = map[status] || { bg: '#f1f5f9', color: '#64748b' };
  return `<span style="background:${s.bg};color:${s.color};padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">${status}</span>`;
}

export default async function handler(req, res) {
  // Security: allow only Vercel cron calls or GET with secret token
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { start, end, dateStr } = todayBoundsReunion();

    // ── Parallel Supabase queries ──────────────────────────────────────────
    const [
      { data: newToday },
      { data: activeToday },
      { data: endingToday },
      { data: cancelledToday },
      { data: monthConfirmed },
      { data: urgentMaint },
    ] = await Promise.all([
      // Réservations créées aujourd'hui
      supabase.from('reservations')
        .select('id, total_price, status, contacts(name), vehicles(name)')
        .gte('created_at', start).lte('created_at', end),

      // Réservations en cours aujourd'hui (start <= today <= end, non annulées)
      supabase.from('reservations')
        .select('id, total_price, status, start_date, end_date, contacts(name), vehicles(name)')
        .in('status', ['Confirmée', 'En cours'])
        .lte('start_date', end).gte('end_date', start),

      // Réservations se terminant aujourd'hui
      supabase.from('reservations')
        .select('id, total_price, contacts(name), vehicles(name)')
        .eq('status', 'Terminée')
        .gte('end_date', start).lte('end_date', end),

      // Annulées aujourd'hui
      supabase.from('reservations')
        .select('id, total_price, cancellation_penalty, contacts(name), vehicles(name)')
        .eq('status', 'Annulée')
        .gte('updated_at', start).lte('updated_at', end),

      // CA du mois (réservations confirmées/actives/terminées)
      supabase.from('reservations')
        .select('total_price')
        .in('status', ['Confirmée', 'En cours', 'Terminée'])
        .gte('start_date', new Date(dateStr.substring(0, 7) + '-01T00:00:00+04:00').toISOString()),

      // Maintenances urgentes actives
      supabase.from('maintenance_records')
        .select('description, priority, vehicles(name, license_plate)')
        .in('priority', ['urgent', 'high'])
        .neq('status', 'completed')
        .limit(5),
    ]);

    // ── Calculs ────────────────────────────────────────────────────────────
    const caToday = (newToday || [])
      .filter(r => ['Confirmée', 'En cours', 'Terminée'].includes(r.status))
      .reduce((s, r) => s + (Number(r.total_price) || 0), 0);

    const caMois = (monthConfirmed || []).reduce((s, r) => s + (Number(r.total_price) || 0), 0);
    const penalties = (cancelledToday || []).reduce((s, r) => s + (Number(r.cancellation_penalty) || 0), 0);

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      timeZone: REUNION_TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date());

    // ── HTML Email ─────────────────────────────────────────────────────────
    function resaRows(list) {
      if (!list?.length) return '<tr><td colspan="3" style="padding:12px;text-align:center;color:#94a3b8;font-size:13px;">Aucune réservation</td></tr>';
      return list.map(r => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#1e293b;">${r.contacts?.name || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">${r.vehicles?.name || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#1e293b;text-align:right;">${fcfa(r.total_price)}</td>
        </tr>`).join('');
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
<tr><td>
<table width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;margin:0 auto;">

  <!-- Header -->
  <tr>
    <td style="background:#2563eb;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:white;letter-spacing:-0.5px;">🚗 Nouveau Concept</div>
      <div style="font-size:14px;color:#93c5fd;margin-top:6px;">Rapport journalier — ${dateFormatted}</div>
    </td>
  </tr>

  <!-- KPI Row -->
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="30%" style="text-align:center;padding:16px;background:#f0fdf4;border-radius:12px;margin-right:8px;">
            <div style="font-size:22px;font-weight:800;color:#166534;">${fcfa(caToday)}</div>
            <div style="font-size:11px;color:#4ade80;font-weight:600;text-transform:uppercase;margin-top:4px;">CA aujourd'hui</div>
          </td>
          <td width="4%"></td>
          <td width="30%" style="text-align:center;padding:16px;background:#eff6ff;border-radius:12px;">
            <div style="font-size:22px;font-weight:800;color:#1e40af;">${(activeToday || []).length}</div>
            <div style="font-size:11px;color:#60a5fa;font-weight:600;text-transform:uppercase;margin-top:4px;">En location</div>
          </td>
          <td width="4%"></td>
          <td width="30%" style="text-align:center;padding:16px;background:#faf5ff;border-radius:12px;">
            <div style="font-size:22px;font-weight:800;color:#6b21a8;">${fcfa(caMois)}</div>
            <div style="font-size:11px;color:#a78bfa;font-weight:600;text-transform:uppercase;margin-top:4px;">CA du mois</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Nouvelles réservations -->
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
        📋 Nouvelles réservations du jour <span style="background:#dbeafe;color:#1e40af;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;margin-left:8px;">${(newToday || []).length}</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Client</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Véhicule</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Montant</th>
          </tr>
        </thead>
        <tbody>${resaRows(newToday)}</tbody>
      </table>
    </td>
  </tr>

  <!-- Locations en cours -->
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;">
        🔵 Locations actives <span style="background:#dbeafe;color:#1e40af;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;margin-left:8px;">${(activeToday || []).length}</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Client</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Véhicule</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Montant</th>
          </tr>
        </thead>
        <tbody>${resaRows(activeToday)}</tbody>
      </table>
    </td>
  </tr>

  ${(endingToday || []).length > 0 ? `
  <!-- Retours du jour -->
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;">
        🏁 Retours prévus ce soir <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;margin-left:8px;">${endingToday.length}</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Client</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Véhicule</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Montant</th>
        </tr></thead>
        <tbody>${resaRows(endingToday)}</tbody>
      </table>
    </td>
  </tr>` : ''}

  ${(cancelledToday || []).length > 0 ? `
  <!-- Annulations -->
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <div style="font-size:15px;font-weight:700;color:#991b1b;margin-bottom:12px;">
        ❌ Annulations du jour <span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;margin-left:8px;">${cancelledToday.length}</span>
        ${penalties > 0 ? `<span style="font-size:12px;color:#b45309;font-weight:600;margin-left:8px;">· Pénalités retenues : ${fcfa(penalties)}</span>` : ''}
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fca5a5;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#fff5f5;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;">Client</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;">Véhicule</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;">Pénalité</th>
        </tr></thead>
        <tbody>${(cancelledToday || []).map(r => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #fee2e2;font-size:13px;color:#1e293b;">${r.contacts?.name || '—'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #fee2e2;font-size:13px;color:#475569;">${r.vehicles?.name || '—'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #fee2e2;font-size:13px;font-weight:700;color:#991b1b;text-align:right;">${fcfa(r.cancellation_penalty)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </td>
  </tr>` : ''}

  ${(urgentMaint || []).length > 0 ? `
  <!-- Alertes maintenance -->
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <div style="font-size:15px;font-weight:700;color:#c2410c;margin-bottom:12px;">⚠️ Maintenances urgentes</div>
      ${(urgentMaint || []).map(m => `
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin-bottom:8px;font-size:13px;color:#c2410c;">
          <strong>${m.vehicles?.name || '—'}</strong> (${m.vehicles?.license_plate || '—'}) — ${m.description || 'Intervention requise'}
        </div>`).join('')}
    </td>
  </tr>` : ''}

  <!-- Footer -->
  <tr>
    <td style="background:white;border-radius:0 0 16px 16px;padding:24px 40px 32px;">
      <div style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;color:#94a3b8;font-size:12px;">
        Rapport généré le ${dateFormatted} à ${reunionTime()} (heure Réunion)<br>
        <a href="https://nouveauconcept.vercel.app" style="color:#2563eb;font-weight:600;text-decoration:none;">Ouvrir le CRM →</a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    // ── Envoi Resend ───────────────────────────────────────────────────────
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'Nouveau Concept CRM <rapport@nouveauconcept.fr>',
      to: ['kea.gassay@spicorp-invest.com'],
      subject: `📊 Rapport du ${dateFormatted} — CA jour : ${fcfa(caToday)}`,
      html,
    });

    if (sendError) throw sendError;

    console.log('✅ Rapport envoyé:', sendData?.id);
    return res.status(200).json({ ok: true, emailId: sendData?.id, date: dateStr });

  } catch (err) {
    console.error('❌ Erreur rapport journalier:', err);
    return res.status(500).json({ error: err.message });
  }
}
