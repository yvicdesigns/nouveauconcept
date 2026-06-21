import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-FR');
}

function fmtDate(d) {
  try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return '—'; }
}

function fmtDateLong(d) {
  try { return format(new Date(d), 'dd MMMM yyyy', { locale: fr }); } catch { return '—'; }
}

function row(label, value, bold = false) {
  const w = bold ? 'font-weight:bold' : '';
  return `
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin:1px 0;${w}">
      <span>${label}</span><span>${value}</span>
    </div>`;
}

function sep(thick = false) {
  const ch = thick ? '=' : '-';
  return `<div style="letter-spacing:-0.5px;margin:3px 0;">${ch.repeat(32)}</div>`;
}

export function printThermalReceipt(invoice) {
  if (!invoice) return;

  const resteAPayer = Math.max(
    0,
    Number(invoice.total_amount || 0)
      - Number(invoice.remise || 0)
      - Number(invoice.acompte || 0)
  );

  const html = `
    <div style="text-align:center;margin-bottom:4px;">
      <div style="font-size:15px;font-weight:bold;letter-spacing:1px;">NOUVEAU CONCEPT</div>
      <div style="font-size:10px;">Location de Véhicules</div>
      <div style="font-size:10px;">Brazzaville, Rép. du Congo</div>
      <div style="font-size:10px;">+242 06 XXX XX XX</div>
    </div>

    ${sep(true)}

    <div style="text-align:center;font-size:13px;font-weight:bold;margin:3px 0;">FACTURE</div>
    ${row('N°', invoice.invoice_number || '—')}
    ${row('Date', fmtDate(invoice.issue_date))}
    ${row('Échéance', fmtDate(invoice.due_date))}
    ${row('Statut', invoice.status || '—')}

    ${sep()}

    <div style="font-weight:bold;margin-bottom:2px;">CLIENT</div>
    <div>${invoice.client_name || '—'}</div>
    ${invoice.client_phone ? `<div>Tél : ${invoice.client_phone}</div>` : ''}
    ${invoice.client_cni ? `<div>CNI : ${invoice.client_cni}</div>` : ''}

    ${sep()}

    <div style="font-weight:bold;margin-bottom:2px;">PRESTATION</div>
    ${invoice.vehicle_details ? `<div>${invoice.vehicle_details}</div>` : ''}
    ${invoice.start_date ? row('Du', fmtDate(invoice.start_date)) : ''}
    ${invoice.end_date ? row('Au', fmtDate(invoice.end_date)) : ''}
    ${invoice.days_count ? row('Durée', `${invoice.days_count} jour(s)`) : ''}
    ${invoice.daily_rate ? row('Tarif/jour', `${fmt(invoice.daily_rate)} FCFA`) : ''}

    ${sep()}

    ${row('Sous-total', `${fmt(invoice.subtotal)} FCFA`)}
    ${Number(invoice.commission_amount) > 0
      ? row(
          `Commission${invoice.commission_rate > 0 ? ` (${invoice.commission_rate}%)` : ''}`,
          `${fmt(invoice.commission_amount)} FCFA`
        )
      : ''}
    ${Number(invoice.remise) > 0
      ? row('Remise', `- ${fmt(invoice.remise)} FCFA`)
      : ''}

    <div style="border-top:1px solid #000;margin:3px 0;"></div>
    ${row('TOTAL', `${fmt(invoice.total_amount)} FCFA`, true)}

    ${invoice.caution && Number(invoice.caution_amount) > 0
      ? row('Caution', `${fmt(invoice.caution_amount)} FCFA`)
      : ''}
    ${Number(invoice.acompte) > 0
      ? row('Acompte versé', `- ${fmt(invoice.acompte)} FCFA`)
      : ''}

    <div style="border-top:2px solid #000;margin:3px 0;"></div>
    ${row('RESTE À PAYER', `${fmt(resteAPayer)} FCFA`, true)}

    ${sep(true)}

    ${row('Paiement', invoice.payment_method || 'Espèces')}
    ${invoice.payment_conditions ? `<div style="font-size:10px;">${invoice.payment_conditions}</div>` : ''}

    ${invoice.notes ? `${sep()}<div style="font-size:10px;"><b>Note :</b> ${invoice.notes}</div>` : ''}

    ${sep(true)}

    <div style="text-align:center;margin-top:4px;font-size:10px;">
      <div>Fait à Brazzaville,</div>
      <div>le ${fmtDateLong(invoice.issue_date)}</div>
      <div style="margin-top:8px;font-size:11px;font-weight:bold;">Merci de votre confiance.</div>
    </div>

    ${sep(true)}

    <div style="font-size:10px;margin-top:2px;">
      <div style="text-align:center;font-weight:bold;margin-bottom:4px;letter-spacing:0.5px;">
        CONDITIONS DE LOCATION
      </div>
      <div style="margin:2px 0;">• Réservation confirmée après paiement</div>
      <div style="margin:2px 0;">• Frais annexes (péages, attente, carburant) à la charge du client</div>
      <div style="margin:2px 0;">• Hors Brazzaville : +20 000 FCFA forfait chauffeur</div>
      <div style="margin:2px 0;">• Paiement : espèces / virement / mobile money</div>
      <div style="margin:2px 0;">• Annulation : 24h à l'avance obligatoire</div>
      <div style="margin:2px 0;">• Tout dommage sera facturé au client</div>
      <div style="margin:2px 0;">• Soumis à la législation congolaise</div>
      <div style="margin-top:5px;text-align:center;font-style:italic;">
        Toute réservation vaut acceptation<br>des présentes conditions.
      </div>
    </div>

    ${sep(true)}
  `;

  const el = document.getElementById('thermal-receipt');
  if (!el) return;

  el.innerHTML = html;

  // Measure at print width to get exact page height
  const prev = el.style.cssText;
  el.style.cssText = [
    'display:block',
    'position:fixed',
    'visibility:hidden',
    'top:0',
    'left:0',
    'width:64mm',
    'font-family:Courier New,Courier,monospace',
    'font-size:12px',
    'line-height:1.5',
    'padding:2mm',
    'box-sizing:border-box',
  ].join(';');

  const heightPx = el.scrollHeight;
  el.style.cssText = prev;

  // 1px = 0.2646mm at 96dpi
  const heightMm = Math.ceil(heightPx * 0.2646) + 10;

  // Inject @page at root level (NOT inside @media print — Chrome ignores it there)
  let styleEl = document.getElementById('thermal-page-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'thermal-page-style';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `@page { size: 80mm ${heightMm}mm; margin: 0; }`;

  window.print();

  const cleanup = () => {
    el.innerHTML = '';
    styleEl.textContent = '';
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
}
