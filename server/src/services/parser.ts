import * as XLSX from 'xlsx';

export interface NormalizedRow {
  txn_date: string;       // YYYY-MM-DD
  txn_type_raw: string;   // raw type string from file
  description: string;
  amount_fen: number;     // positive integer in fen
  amount_sign: number;    // -1 expense, +1 collection
  counterparty: string;
  reference_no: string;
  category_hint: string;
  balance_fen: number | null;
  row_index: number;
}

export interface ParseError {
  row_index: number;
  reason: string;
  raw: Record<string, unknown>;
}

export interface ParseResult {
  rows: NormalizedRow[];
  errors: ParseError[];
}

const COLUMN_MAP: Record<string, string[]> = {
  txn_date:     ['日期', '提交时间', '申请时间', '发生日期', '时间', '付款日期', '收款日期'],
  txn_type_raw: ['收支类型', '申请类型', '类型', '收支方向'],
  description:  ['摘要', '说明', '费用说明', '摘要/说明', '备注', '事由', '用途'],
  amount:       ['金额', '费用金额', '申请金额', '付款金额', '收款金额', '发生金额'],
  balance:      ['余额', '账户余额', '结余'],
  counterparty: ['收款方', '付款方', '对方', '供应商', '客户', '对方单位', '往来单位'],
  reference_no: ['审批编号', '单据编号', '流水号', '单号', '凭证号'],
  category_hint:['费用类型', '类别', '报销类型', '科目', '费用科目'],
};

function findColumn(headers: string[], aliases: string[]): string | null {
  const lowerAliases = aliases.map(a => a.toLowerCase().trim());
  for (const h of headers) {
    if (lowerAliases.includes(h.toLowerCase().trim())) {
      return h;
    }
  }
  return null;
}

function parseDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;

  // Excel serial number
  if (typeof raw === 'number') {
    try {
      const date = XLSX.SSF.parse_date_code(raw);
      if (date) {
        const y = date.y;
        const m = String(date.m).padStart(2, '0');
        const d = String(date.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // fall through
    }
  }

  const str = String(raw).trim();
  // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const match1 = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (match1) {
    const y = match1[1];
    const m = match1[2].padStart(2, '0');
    const d = match1[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // MM/DD/YYYY
  const match2 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match2) {
    const m = match2[1].padStart(2, '0');
    const d = match2[2].padStart(2, '0');
    const y = match2[3];
    return `${y}-${m}-${d}`;
  }
  // Try native Date parse as last resort
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }
  return null;
}

function parseAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') {
    return Math.round(raw * 100);
  }
  const str = String(raw).trim()
    .replace(/[¥￥,，\s]/g, '')
    .replace(/[（(].*?[)）]/g, '');  // remove parenthetical notes
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

function detectSign(txnTypeRaw: string, amountFen: number): number {
  const lower = txnTypeRaw.toLowerCase();
  if (/支出|付款|费用|出|debit/.test(lower)) return -1;
  if (/收入|回款|收款|入|credit/.test(lower)) return 1;
  // Use amount sign as fallback
  return amountFen < 0 ? -1 : 1;
}

export function parseExcelBuffer(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const rows: NormalizedRow[] = [];
  const errors: ParseError[] = [];
  let globalRowIndex = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: true,
    });

    if (jsonRows.length === 0) continue;

    const headers = Object.keys(jsonRows[0]);

    // Build column mapping for this sheet
    const colMap: Record<string, string | null> = {};
    for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
      colMap[field] = findColumn(headers, aliases);
    }

    // Validate critical columns
    if (!colMap['txn_date'] || !colMap['amount']) {
      errors.push({
        row_index: globalRowIndex,
        reason: `Sheet "${sheetName}": 未找到必要列（日期或金额），请检查列名是否匹配`,
        raw: { sheet: sheetName, headers },
      });
      continue;
    }

    for (let i = 0; i < jsonRows.length; i++) {
      const raw = jsonRows[i];
      globalRowIndex++;

      const rawDate = colMap['txn_date'] ? raw[colMap['txn_date']] : '';
      const rawAmount = colMap['amount'] ? raw[colMap['amount']] : '';
      const rawType = colMap['txn_type_raw'] ? String(raw[colMap['txn_type_raw']] || '') : '';
      const rawDesc = colMap['description'] ? String(raw[colMap['description']] || '') : '';
      const rawCounterparty = colMap['counterparty'] ? String(raw[colMap['counterparty']] || '') : '';
      const rawRef = colMap['reference_no'] ? String(raw[colMap['reference_no']] || '') : '';
      const rawCatHint = colMap['category_hint'] ? String(raw[colMap['category_hint']] || '') : '';
      const rawBalance = colMap['balance'] ? raw[colMap['balance']] : null;

      const txn_date = parseDate(rawDate);
      if (!txn_date) {
        errors.push({ row_index: globalRowIndex, reason: `无效日期: ${rawDate}`, raw });
        continue;
      }

      const amountFenRaw = parseAmount(rawAmount);
      if (amountFenRaw === null || amountFenRaw === 0) {
        errors.push({ row_index: globalRowIndex, reason: `无效金额或金额为零: ${rawAmount}`, raw });
        continue;
      }

      const sign = detectSign(rawType, amountFenRaw);
      const amount_fen = Math.abs(amountFenRaw);
      const balanceFen = rawBalance !== null && rawBalance !== '' ? parseAmount(rawBalance) : null;

      rows.push({
        txn_date,
        txn_type_raw: rawType,
        description: rawDesc || rawCatHint || '无摘要',
        amount_fen,
        amount_sign: sign,
        counterparty: rawCounterparty,
        reference_no: rawRef,
        category_hint: rawCatHint,
        balance_fen: balanceFen,
        row_index: globalRowIndex,
      });
    }
  }

  return { rows, errors };
}
