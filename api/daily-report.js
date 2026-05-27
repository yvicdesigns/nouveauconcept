/**
 * Vercel Serverless Function — Rapport journalier CRM
 * Déclenché chaque jour à 15h UTC (= 19h La Réunion UTC+4)
 * via vercel.json cron: "0 15 * * *"
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const REUNION_TZ = 'Indian/Reunion';

function reunionTime(date = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: REUNION_TZ, hour: '2-digit', minute: '2-digit' }).format(date);
}

function todayBoundsReunion() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: REUNION_TZ }).format(now);
  return {
    start:   new Date(`${dateStr}T00:00:00+04:00`).toISOString(),
    end:     new Date(`${dateStr}T23:59:59+04:00`).toISOString(),
    dateStr,
    monthStr: dateStr.substring(0, 7), // "YYYY-MM"
  };
}

function monthBounds(yearMonth) {
  // yearMonth = "YYYY-MM"
  const [y, m] = yearMonth.split('-').map(Number);
  const start = new Date(`${yearMonth}-01T00:00:00+04:00`).toISOString();
  const lastDay = new Date(y, m, 0).getDate();
  const end   = new Date(`${yearMonth}-${String(lastDay).padStart(2,'0')}T23:59:59+04:00`).toISOString();
  return { start, end };
}

function prevMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fcfa(n) { return Number(n || 0).toLocaleString('fr-FR') + ' FCFA'; }

function trend(current, previous) {
  if (!previous) return '';
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return `<span style="color:#16a34a;font-weight:700;">▲ +${pct}%</span> vs mois précédent`;
  if (pct < 0) return `<span style="color:#dc2626;font-weight:700;">▼ ${pct}%</span> vs mois précédent`;
  return `<span style="color:#64748b;">= stable</span> vs mois précédent`;
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Service role key bypasses RLS — required for server-side queries
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );
    const resend   = new Resend(process.env.RESEND_API_KEY);

    const { start, end, dateStr, monthStr } = todayBoundsReunion();
    const prevMonthStr = prevMonth(monthStr);
    const curBounds  = monthBounds(monthStr);
    const prevBounds = monthBounds(prevMonthStr);

    // ── Parallel queries ───────────────────────────────────────────────────
    const [
      { data: newToday },
      { data: activeToday },
      { data: endingToday },
      { data: cancelledToday },
      { data: monthAllRes },
      { data: prevMonthRes },
      { data: urgentMaint },
    ] = await Promise.all([
      // Nouvelles réservations créées aujourd'hui
      supabase.from('reservations')
        .select('id, total_price, status, contacts(name), vehicles(name)')
        .gte('created_at', start).lte('created_at', end),

      // Locations actives aujourd'hui
      supabase.from('reservations')
        .select('id, total_price, status, start_date, end_date, contacts(name), vehicles(name)')
        .in('status', ['Confirmée', 'En cours'])
        .lte('start_date', end).gte('end_date', start),

      // Retours du jour
      supabase.from('reservations')
        .select('id, total_price, contacts(name), vehicles(name)')
        .eq('status', 'Terminée')
        .gte('end_date', start).lte('end_date', end),

      // Annulations du jour
      supabase.from('reservations')
        .select('id, total_price, cancellation_penalty, contacts(name), vehicles(name)')
        .eq('status', 'Annulée')
        .gte('updated_at', start).lte('updated_at', end),

      // Toutes les réservations du mois (pour CA, top clients, top véhicules)
      supabase.from('reservations')
        .select('id, total_price, status, contacts(name), vehicles(name, license_plate)')
        .in('status', ['Confirmée', 'En cours', 'Terminée'])
        .gte('start_date', curBounds.start).lte('start_date', curBounds.end),

      // Mois précédent (pour comparaison)
      supabase.from('reservations')
        .select('total_price')
        .in('status', ['Confirmée', 'En cours', 'Terminée'])
        .gte('start_date', prevBounds.start).lte('start_date', prevBounds.end),

      // Maintenances urgentes
      supabase.from('maintenance_records')
        .select('description, priority, vehicles(name, license_plate)')
        .in('priority', ['urgent', 'high'])
        .neq('status', 'completed').limit(5),
    ]);

    // ── Calculs ────────────────────────────────────────────────────────────
    const caToday = (newToday || [])
      .filter(r => ['Confirmée', 'En cours', 'Terminée'].includes(r.status))
      .reduce((s, r) => s + (Number(r.total_price) || 0), 0);

    const caMois     = (monthAllRes  || []).reduce((s, r) => s + (Number(r.total_price) || 0), 0);
    const caPrevMois = (prevMonthRes || []).reduce((s, r) => s + (Number(r.total_price) || 0), 0);
    const penalties  = (cancelledToday || []).reduce((s, r) => s + (Number(r.cancellation_penalty) || 0), 0);

    // Top 5 clients du mois
    const clientMap = {};
    (monthAllRes || []).forEach(r => {
      const name = r.contacts?.name || 'Inconnu';
      if (!clientMap[name]) clientMap[name] = { name, total: 0, count: 0 };
      clientMap[name].total += Number(r.total_price) || 0;
      clientMap[name].count += 1;
    });
    const topClients = Object.values(clientMap).sort((a, b) => b.total - a.total).slice(0, 5);

    // Top 5 véhicules du mois
    const vehicleMap = {};
    (monthAllRes || []).forEach(r => {
      const name = r.vehicles?.name || 'Inconnu';
      if (!vehicleMap[name]) vehicleMap[name] = { name, total: 0, count: 0 };
      vehicleMap[name].total += Number(r.total_price) || 0;
      vehicleMap[name].count += 1;
    });
    const topVehicles = Object.values(vehicleMap).sort((a, b) => b.count - a.count).slice(0, 5);

    // Taux d'annulation du mois
    const totalResMonth = (monthAllRes || []).length + (cancelledToday || []).length;
    const cancelRate = totalResMonth > 0 ? Math.round(((cancelledToday || []).length / totalResMonth) * 100) : 0;

    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      timeZone: REUNION_TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date());

    const prevMonthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
      .format(new Date(`${prevMonthStr}-15`));

    // ── HTML helpers ───────────────────────────────────────────────────────
    function resaRows(list) {
      if (!list?.length) return '<tr><td colspan="3" style="padding:12px;text-align:center;color:#94a3b8;font-size:13px;">Aucune</td></tr>';
      return list.map(r => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#1e293b;">${r.contacts?.name || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">${r.vehicles?.name || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#1e293b;text-align:right;">${fcfa(r.total_price)}</td>
        </tr>`).join('');
    }

    const pctChange = caPrevMois > 0 ? Math.round(((caMois - caPrevMois) / caPrevMois) * 100) : null;
    const trendColor = pctChange === null ? '#64748b' : pctChange >= 0 ? '#16a34a' : '#dc2626';
    const trendArrow = pctChange === null ? '—' : pctChange >= 0 ? `▲ +${pctChange}%` : `▼ ${pctChange}%`;

    // ── HTML Email ─────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
<tr><td>
<table width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;margin:0 auto;">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
      <div style="font-size:30px;font-weight:800;color:white;letter-spacing:-0.5px;">🚗 Nouveau Concept</div>
      <div style="font-size:14px;color:#93c5fd;margin-top:6px;font-weight:500;">Rapport journalier — ${dateFormatted}</div>
    </td>
  </tr>

  <!-- KPI Row -->
  <tr>
    <td style="background:white;padding:28px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="30%" style="text-align:center;padding:16px;background:#f0fdf4;border-radius:12px;">
            <div style="font-size:11px;color:#16a34a;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">CA aujourd'hui</div>
            <div style="font-size:24px;font-weight:800;color:#166534;margin-top:4px;">${fcfa(caToday)}</div>
          </td>
          <td width="4%"></td>
          <td width="30%" style="text-align:center;padding:16px;background:#eff6ff;border-radius:12px;">
            <div style="font-size:11px;color:#1d4ed8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">En location</div>
            <div style="font-size:24px;font-weight:800;color:#1e40af;margin-top:4px;">${(activeToday || []).length} véh.</div>
          </td>
          <td width="4%"></td>
          <td width="30%" style="text-align:center;padding:16px;background:#faf5ff;border-radius:12px;">
            <div style="font-size:11px;color:#7c3aed;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">CA du mois</div>
            <div style="font-size:24px;font-weight:800;color:#6b21a8;margin-top:4px;">${fcfa(caMois)}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Comparatif mois précédent -->
  <tr>
    <td style="background:white;padding:16px 40px 0;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#64748b;">
              Mois précédent (${prevMonthLabel}) : <strong style="color:#1e293b;">${fcfa(caPrevMois)}</strong>
            </td>
            <td style="text-align:right;font-size:14px;font-weight:700;color:${trendColor};">
              ${trendArrow}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:8px;">
              <div style="background:#e2e8f0;border-radius:999px;height:6px;overflow:hidden;">
                <div style="background:${trendColor};height:6px;border-radius:999px;width:${Math.min(100, Math.max(5, caMois > 0 && caPrevMois > 0 ? Math.round((caMois/Math.max(caMois,caPrevMois))*100) : 50))}%;"></div>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </td>
  </tr>

  <!-- Stats rapides -->
  <tr>
    <td style="background:white;padding:16px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:10px 16px;background:#fff7ed;border-radius:8px;text-align:center;font-size:13px;color:#c2410c;">
            <strong style="font-size:18px;display:block;">${(newToday||[]).length}</strong>
            Nouvelles réservations
          </td>
          <td width="8px"></td>
          <td style="padding:10px 16px;background:#fef9c3;border-radius:8px;text-align:center;font-size:13px;color:#854d0e;">
            <strong style="font-size:18px;display:block;">${(endingToday||[]).length}</strong>
            Retours ce soir
          </td>
          <td width="8px"></td>
          <td style="padding:10px 16px;background:#fee2e2;border-radius:8px;text-align:center;font-size:13px;color:#991b1b;">
            <strong style="font-size:18px;display:block;">${(cancelledToday||[]).length}</strong>
            Annulations
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Nouvelles réservations -->
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;">📋 Nouvelles réservations du jour</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Client</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Véhicule</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Montant</th>
        </tr></thead>
        <tbody>${resaRows(newToday)}</tbody>
      </table>
    </td>
  </tr>

  <!-- Locations actives -->
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;">🔵 Locations actives</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Client</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Véhicule</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Montant</th>
        </tr></thead>
        <tbody>${resaRows(activeToday)}</tbody>
      </table>
    </td>
  </tr>

  ${(endingToday||[]).length > 0 ? `
  <!-- Retours du jour -->
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;">🏁 Retours prévus ce soir</div>
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

  ${(cancelledToday||[]).length > 0 ? `
  <!-- Annulations -->
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <div style="font-size:15px;font-weight:700;color:#991b1b;margin-bottom:12px;">
        ❌ Annulations ${penalties > 0 ? `· Pénalités : <span style="color:#b45309;">${fcfa(penalties)}</span>` : ''}
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fca5a5;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#fff5f5;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;">Client</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;">Véhicule</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;">Pénalité</th>
        </tr></thead>
        <tbody>${(cancelledToday||[]).map(r=>`
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #fee2e2;font-size:13px;color:#1e293b;">${r.contacts?.name||'—'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #fee2e2;font-size:13px;color:#475569;">${r.vehicles?.name||'—'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #fee2e2;font-size:13px;font-weight:700;color:#991b1b;text-align:right;">${fcfa(r.cancellation_penalty)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </td>
  </tr>` : ''}

  <!-- Top 5 Clients du mois -->
  ${topClients.length > 0 ? `
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;">🏆 Top clients du mois</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">#</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Client</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Locations</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Total</th>
        </tr></thead>
        <tbody>${topClients.map((c,i)=>`
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:800;color:${i===0?'#ca8a04':i===1?'#94a3b8':'#cbd5e1'};">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#1e293b;">${c.name}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:center;">${c.count} loc.</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#1e293b;text-align:right;">${fcfa(c.total)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </td>
  </tr>` : ''}

  <!-- Top 5 Véhicules du mois -->
  ${topVehicles.length > 0 ? `
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;">🚗 Véhicules les plus loués ce mois</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">#</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Véhicule</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Locations</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">CA généré</th>
        </tr></thead>
        <tbody>${topVehicles.map((v,i)=>`
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#1e293b;">${v.name}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;text-align:center;">${v.count} fois</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#1e293b;text-align:right;">${fcfa(v.total)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </td>
  </tr>` : ''}

  ${(urgentMaint||[]).length > 0 ? `
  <!-- Alertes maintenance -->
  <tr>
    <td style="background:white;padding:24px 40px 0;">
      <div style="font-size:15px;font-weight:700;color:#c2410c;margin-bottom:12px;">⚠️ Maintenances urgentes</div>
      ${(urgentMaint||[]).map(m=>`
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin-bottom:8px;font-size:13px;color:#c2410c;">
          <strong>${m.vehicles?.name||'—'}</strong> (${m.vehicles?.license_plate||'—'}) — ${m.description||'Intervention requise'}
        </div>`).join('')}
    </td>
  </tr>` : ''}

  <!-- Footer -->
  <tr>
    <td style="background:white;border-radius:0 0 16px 16px;padding:24px 40px 32px;">
      <div style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;color:#94a3b8;font-size:12px;">
        Rapport généré le ${dateFormatted} à ${reunionTime()} · Heure La Réunion<br><br>
        <a href="https://nouveauconcept.vercel.app" style="background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">Ouvrir le CRM →</a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    const { data: sendData, error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'Nouveau Concept CRM <onboarding@resend.dev>',
      to: (process.env.RESEND_TO || 'kea.gassay@spicorp-invest.com').split(','),
      subject: `📊 Rapport du ${dateFormatted} — CA jour : ${fcfa(caToday)} · Mois : ${fcfa(caMois)} ${pctChange !== null ? (pctChange >= 0 ? `▲ +${pctChange}%` : `▼ ${pctChange}%`) : ''}`,
      html,
    });

    if (sendError) throw sendError;
    console.log('✅ Rapport envoyé:', sendData?.id);
    return res.status(200).json({ ok: true, emailId: sendData?.id, date: dateStr, caMois, caToday });

  } catch (err) {
    console.error('❌ Erreur rapport journalier:', err);
    return res.status(500).json({ error: err.message });
  }
}
